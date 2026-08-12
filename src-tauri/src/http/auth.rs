//! Request authentication: API Key, Bearer, Basic, OAuth2, JWT (with
//! auto-refresh), Digest (challenge/response) and AWS Signature V4.
//!
//! Header-based schemes are resolved to concrete headers here; Digest is a
//! two-phase protocol handled by [`crate::http::client`] which calls back into
//! [`digest_authorization`] after receiving the `401` challenge.

use std::collections::HashMap;

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

use super::types::AuthConfig;

/// Result of resolving a request's auth configuration.
#[derive(Debug, Clone, Default)]
pub struct AuthApplied {
    /// Headers to merge onto the outgoing request.
    pub headers: Vec<(String, String)>,
    /// Query parameters to append to the URL (e.g. API keys in query mode).
    pub query_params: Vec<(String, String)>,
    /// A freshly refreshed token (JWT auto-refresh), so the caller can persist it.
    pub refreshed_token: Option<String>,
}

/// Convert a persisted collection `AuthConfig` (free-form JSON config) into the
/// runtime auth config used by the request client. Non-string values are dropped.
pub fn from_collection_auth(cfg: &crate::collections::types::AuthConfig) -> Option<AuthConfig> {
    if cfg.r#type.is_empty() || cfg.r#type == "none" {
        return None;
    }
    let config = cfg.config.as_ref().and_then(|v| {
        v.as_object().map(|obj| {
            obj.iter()
                .filter_map(|(k, val)| val.as_str().map(|s| (k.clone(), s.to_string())))
                .collect::<HashMap<String, String>>()
        })
    });
    Some(AuthConfig {
        auth_type: cfg.r#type.clone(),
        config,
    })
}

/// Resolve an auth config into concrete headers/query params.
///
/// `Digest` is intentionally not handled here: it requires a two-phase
/// challenge/response against the server, which `client.rs` performs.
pub async fn apply_auth(
    cfg: &AuthConfig,
    method: &str,
    url: &str,
    existing_headers: &HashMap<String, String>,
    body: &str,
) -> Result<AuthApplied, String> {
    if cfg.is_none() {
        return Ok(AuthApplied::default());
    }

    match cfg.auth_type.to_lowercase().as_str() {
        "bearer" => Ok(bearer_auth(cfg.get("token"))),
        "basic" => Ok(basic_auth(cfg.get("username"), cfg.get("password"))),
        "oauth2" => Ok(bearer_auth(cfg.get("accessToken"))),
        "apikey" | "api_key" => Ok(api_key_auth(cfg)),
        "jwt" => jwt_auth(cfg).await,
        "awssigv4" | "aws_sigv4" => {
            let headers = aws_sigv4_headers(cfg, method, url, existing_headers, body, None)?;
            Ok(AuthApplied {
                headers,
                ..Default::default()
            })
        }
        // Digest is handled by client.rs via the two-phase challenge/response.
        "digest" => Ok(AuthApplied::default()),
        _ => Ok(AuthApplied::default()),
    }
}

fn bearer_auth(token: Option<&String>) -> AuthApplied {
    match token {
        Some(token) if !token.is_empty() => AuthApplied {
            headers: vec![("Authorization".to_string(), format!("Bearer {}", token))],
            ..Default::default()
        },
        _ => AuthApplied::default(),
    }
}

fn basic_auth(username: Option<&String>, password: Option<&String>) -> AuthApplied {
    match username {
        Some(username) if !username.is_empty() => {
            let credentials = STANDARD.encode(format!("{}:{}", username, password.unwrap_or(&String::new())));
            AuthApplied {
                headers: vec![("Authorization".to_string(), format!("Basic {}", credentials))],
                ..Default::default()
            }
        }
        _ => AuthApplied::default(),
    }
}

fn api_key_auth(cfg: &AuthConfig) -> AuthApplied {
    let key = cfg.get("key").cloned().unwrap_or_default();
    let value = cfg.get("value").cloned().unwrap_or_default();
    if key.is_empty() || value.is_empty() {
        return AuthApplied::default();
    }

    let add_to = cfg.get("addTo").cloned().unwrap_or_else(|| "header".to_string());
    if add_to.eq_ignore_ascii_case("query") || add_to.eq_ignore_ascii_case("queryParams") {
        AuthApplied {
            query_params: vec![(key, value)],
            ..Default::default()
        }
    } else {
        AuthApplied {
            headers: vec![(key, value)],
            ..Default::default()
        }
    }
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

/// Decode a JWT (unverified) and return its `exp` claim in unix seconds, if present.
pub fn jwt_expiry_seconds(token: &str) -> Option<i64> {
    let payload = token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD.decode(payload).ok()?;
    let json: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    json.get("exp").and_then(|v| v.as_i64())
}

/// Whether a JWT is expired or will expire within `leeway_secs`.
pub fn jwt_needs_refresh(token: &str, leeway_secs: i64) -> bool {
    match jwt_expiry_seconds(token) {
        Some(exp) => exp.saturating_sub(Utc::now().timestamp()) <= leeway_secs,
        // No exp claim: cannot know, assume still valid.
        None => false,
    }
}

/// Whether auto-refresh should run: a refresh endpoint is configured and the
/// token is expired or will expire within the 60s leeway.
fn jwt_should_refresh(cfg: &AuthConfig, token: &str) -> bool {
    let refresh_configured = cfg
        .get("refreshToken")
        .map_or(false, |t| !t.is_empty())
        && cfg.get("refreshUrl").map_or(false, |u| !u.is_empty());
    refresh_configured && jwt_needs_refresh(token, 60)
}

async fn jwt_auth(cfg: &AuthConfig) -> Result<AuthApplied, String> {
    let token = cfg.get("token").cloned().unwrap_or_default();
    if token.is_empty() {
        return Ok(AuthApplied::default());
    }

    let mut refreshed_token = None;
    let effective = if jwt_should_refresh(cfg, &token) {
        match refresh_jwt_token(cfg).await {
            Ok(new_token) => {
                refreshed_token = Some(new_token.clone());
                new_token
            }
            // Refresh failure falls back to the stored token; the request still
            // goes out and the caller can surface the stale token to the user.
            Err(_) => token.clone(),
        }
    } else {
        token.clone()
    };

    Ok(AuthApplied {
        headers: vec![("Authorization".to_string(), format!("Bearer {}", effective))],
        refreshed_token,
        ..Default::default()
    })
}

/// Exchange a refresh token for a fresh access token using the OAuth2
/// `refresh_token` grant. Returns the new access token.
pub async fn refresh_jwt_token(cfg: &AuthConfig) -> Result<String, String> {
    let refresh_url = cfg.get("refreshUrl").cloned().ok_or("Missing refreshUrl")?;
    let refresh_token = cfg.get("refreshToken").cloned().ok_or("Missing refreshToken")?;

    let mut params: Vec<(&str, String)> = vec![
        ("grant_type", "refresh_token".to_string()),
        ("refresh_token", refresh_token),
    ];
    if let Some(client_id) = cfg.get("clientId").cloned() {
        params.push(("client_id", client_id));
    }
    if let Some(client_secret) = cfg.get("clientSecret").cloned() {
        params.push(("client_secret", client_secret));
    }

    let client = reqwest::Client::new();
    let response = client
        .post(&refresh_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("JWT refresh request failed: {}", e))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("JWT refresh response error: {}", e))?;

    if !status.is_success() {
        return Err(format!("JWT refresh failed ({}): {}", status, text));
    }

    let json: serde_json::Value =
        serde_json::from_str(&text).map_err(|_| "JWT refresh response was not JSON".to_string())?;
    json.get("access_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "JWT refresh response missing access_token".to_string())
}

// ---------------------------------------------------------------------------
// Digest (RFC 2617)
// ---------------------------------------------------------------------------

/// Inputs to the Digest response computation (RFC 2617 §3.2.2).
pub struct DigestParams<'a> {
    pub username: &'a str,
    pub password: &'a str,
    pub realm: &'a str,
    pub nonce: &'a str,
    pub uri: &'a str,
    pub qop: Option<&'a str>,
    pub nc: &'a str,
    pub cnonce: &'a str,
    pub method: &'a str,
    pub body: &'a str,
}

/// Split a quoted/parameterized challenge (e.g. a `WWW-Authenticate` header)
/// into key/value pairs, respecting quoted values that contain commas.
fn parse_challenge(header: &str) -> HashMap<String, String> {
    let mut result = HashMap::new();
    // Drop the scheme prefix ("Digest ").
    let body = header
        .find(' ')
        .map(|idx| &header[idx + 1..])
        .unwrap_or(header);

    let mut key = String::new();
    let mut value = String::new();
    let mut in_quotes = false;
    let mut reading_key = true;

    for ch in body.chars() {
        match ch {
            '"' => {
                in_quotes = !in_quotes;
                reading_key = false;
            }
            '=' if reading_key && !in_quotes && !key.is_empty() => {
                reading_key = false;
            }
            ',' if !in_quotes => {
                result.insert(
                    key.trim().to_lowercase(),
                    value.trim().trim_matches('"').to_string(),
                );
                key.clear();
                value.clear();
                reading_key = true;
            }
            _ => {
                if reading_key {
                    key.push(ch);
                } else {
                    value.push(ch);
                }
            }
        }
    }
    if !key.trim().is_empty() {
        result.insert(
            key.trim().to_lowercase(),
            value.trim().trim_matches('"').to_string(),
        );
    }
    result
}

fn md5_hex(input: &str) -> String {
    use md5::{Digest, Md5};
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Pure Digest response computation (RFC 2617 §3.2.2). Exposed for tests.
pub fn compute_digest_response(params: &DigestParams) -> String {
    let ha1 = md5_hex(&format!(
        "{}:{}:{}",
        params.username, params.realm, params.password
    ));
    let ha2 = match params.qop {
        Some(q) if q.eq_ignore_ascii_case("auth-int") => {
            md5_hex(&format!("{}:{}:{}", params.method, params.uri, md5_hex(params.body)))
        }
        _ => md5_hex(&format!("{}:{}", params.method, params.uri)),
    };

    match params.qop {
        Some(qop) if !qop.is_empty() => md5_hex(&format!(
            "{}:{}:{}:{}:{}:{}",
            ha1, params.nonce, params.nc, params.cnonce, qop, ha2
        )),
        _ => md5_hex(&format!("{}:{}:{}", ha1, params.nonce, ha2)),
    }
}

/// Quote and escape a value for inclusion in a `Digest` header.
fn quote_digest_value(value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{}\"", escaped)
}

/// Build a full `Authorization: Digest ...` header from a `WWW-Authenticate`
/// challenge received in a `401` response.
pub fn digest_authorization(
    cfg: &AuthConfig,
    method: &str,
    uri: &str,
    www_authenticate: &str,
    body: &str,
) -> Result<String, String> {
    let challenge = parse_challenge(www_authenticate);
    let realm = challenge
        .get("realm")
        .cloned()
        .ok_or("Digest challenge missing realm")?;
    let nonce = challenge
        .get("nonce")
        .cloned()
        .ok_or("Digest challenge missing nonce")?;

    let username = cfg.get("username").cloned().unwrap_or_default();
    let password = cfg.get("password").cloned().unwrap_or_default();
    if username.is_empty() {
        return Err("Digest auth requires a username".to_string());
    }

    let algorithm = challenge
        .get("algorithm")
        .cloned()
        .unwrap_or_else(|| "MD5".to_string());
    // Only plain MD5 is implemented. MD5-sess requires session-derived keys
    // (HA1 depends on the server nonce), so computing it as MD5 would produce
    // a wrong response; reject it explicitly instead.
    if !algorithm.eq_ignore_ascii_case("MD5") {
        return Err(format!("Unsupported digest algorithm: {}", algorithm));
    }

    let qop = challenge.get("qop").cloned();
    let nc = "00000001".to_string();
    let cnonce = random_hex(8);

    let params = DigestParams {
        username: &username,
        password: &password,
        realm: &realm,
        nonce: &nonce,
        uri,
        qop: qop.as_deref(),
        nc: &nc,
        cnonce: &cnonce,
        method,
        body,
    };
    let response = compute_digest_response(&params);

    let mut parts = vec![
        format!("username={}", quote_digest_value(&username)),
        format!("realm={}", quote_digest_value(&realm)),
        format!("nonce={}", quote_digest_value(&nonce)),
        format!("uri={}", quote_digest_value(uri)),
    ];
    if let Some(qop) = &qop {
        // Prefer "auth" over "auth-int" when the server offers both.
        let chosen = if qop.contains("auth-int") && !qop.contains("auth") {
            "auth-int".to_string()
        } else {
            "auth".to_string()
        };
        parts.push(format!("qop={}", chosen));
        parts.push(format!("nc={}", nc));
        parts.push(format!("cnonce={}", quote_digest_value(&cnonce)));
    }
    if let Some(opaque) = challenge.get("opaque") {
        parts.push(format!("opaque={}", quote_digest_value(opaque)));
    }
    parts.push(format!("response={}", quote_digest_value(&response)));
    parts.push(format!("algorithm={}", algorithm));

    Ok(format!("Digest {}", parts.join(", ")))
}

fn random_hex(bytes: usize) -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..bytes)
        .map(|_| format!("{:02x}", rng.gen::<u8>()))
        .collect()
}

// ---------------------------------------------------------------------------
// AWS Signature V4
// ---------------------------------------------------------------------------

/// RFC 3986 percent-encoding (uppercase hex, no double-encoding). Shared with
/// the HTTP client, which uses it to append query-mode API keys.
pub(crate) fn uri_encode(input: &str, encode_slash: bool) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.bytes() {
        let ch = byte as char;
        match ch {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => out.push(ch),
            '/' if !encode_slash => out.push('/'),
            _ => out.push_str(&format!("%{:02X}", byte)),
        }
    }
    out
}

fn hmac_sha256(key: &[u8], data: &str) -> [u8; 32] {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("HMAC accepts any key length");
    mac.update(data.as_bytes());
    mac.finalize().into_bytes().into()
}

fn hmac_sha256_hex(key: &[u8], data: &str) -> String {
    hmac_sha256(key, data)
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect()
}

fn sha256_hex(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Compute AWS Signature V4 request headers.
///
/// Follows the canonical request algorithm from the AWS documentation. When
/// `now` is provided (tests), it is used instead of the current time.
pub fn aws_sigv4_headers(
    cfg: &AuthConfig,
    method: &str,
    url: &str,
    existing_headers: &HashMap<String, String>,
    body: &str,
    now: Option<DateTime<Utc>>,
) -> Result<Vec<(String, String)>, String> {
    let access_key = cfg.get("accessKey").cloned().ok_or("SigV4 missing access key")?;
    let secret_key = cfg
        .get("secretKey")
        .cloned()
        .ok_or("SigV4 missing secret key")?;
    let region = cfg.get("region").cloned().unwrap_or_default();
    let service = cfg.get("service").cloned().unwrap_or_default();
    let session_token = cfg.get("sessionToken").cloned();

    let parsed = reqwest::Url::parse(url).map_err(|e| format!("Invalid URL for SigV4: {}", e))?;

    let now = now.unwrap_or_else(Utc::now);
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
    let date_stamp = now.format("%Y%m%d").to_string();

    // Canonical URI: path, percent-encoded per segment, never empty.
    let path = parsed.path();
    let canonical_uri = if path.is_empty() || path == "/" {
        "/".to_string()
    } else {
        let encoded: Vec<String> = path
            .split('/')
            .map(|seg| uri_encode(seg, false))
            .collect();
        encoded.join("/")
    };

    // Canonical query string: sorted by key (then value), RFC 3986 encoded.
    let mut query_pairs: Vec<(String, String)> = parsed
        .query_pairs()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();
    query_pairs.sort();
    let canonical_query = query_pairs
        .iter()
        .map(|(k, v)| format!("{}={}", uri_encode(k, true), uri_encode(v, true)))
        .collect::<Vec<_>>()
        .join("&");

    // Canonical headers: host + x-amz-date + x-amz-content-sha256 (+ user headers).
    let host = match parsed.host_str() {
        Some(h) => match parsed.port() {
            Some(port) => format!("{}:{}", h, port),
            None => h.to_string(),
        },
        None => return Err("SigV4: URL has no host".to_string()),
    };

    let payload_hash = sha256_hex(body);
    let mut canonical_headers: Vec<(String, String)> = vec![
        ("host".to_string(), host.clone()),
        ("x-amz-content-sha256".to_string(), payload_hash.clone()),
        ("x-amz-date".to_string(), amz_date.clone()),
    ];
    if let Some(token) = &session_token {
        canonical_headers.push(("x-amz-security-token".to_string(), token.clone()));
    }
    for (key, value) in existing_headers {
        let lower = key.to_lowercase();
        // Skip headers SigV4 manages itself; keep the rest (e.g. user "range").
        if lower == "host" || lower == "x-amz-content-sha256" || lower == "x-amz-date" {
            continue;
        }
        let normalized = value.split_whitespace().collect::<Vec<_>>().join(" ");
        canonical_headers.push((lower, normalized));
    }
    canonical_headers.sort_by(|a, b| a.0.cmp(&b.0));

    let signed_headers = canonical_headers
        .iter()
        .map(|(k, _)| k.clone())
        .collect::<Vec<_>>()
        .join(";");

    let canonical_headers_str = canonical_headers
        .iter()
        .map(|(k, v)| format!("{}:{}\n", k, v))
        .collect::<String>();

    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method.to_uppercase(),
        canonical_uri,
        canonical_query,
        canonical_headers_str,
        signed_headers,
        payload_hash
    );

    let scope = format!("{}/{}/{}/aws4_request", date_stamp, region, service);
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{}\n{}\n{}",
        amz_date,
        scope,
        sha256_hex(&canonical_request)
    );

    let k_date = hmac_sha256(format!("AWS4{}", secret_key).as_bytes(), &date_stamp);
    let k_region = hmac_sha256(&k_date, &region);
    let k_service = hmac_sha256(&k_region, &service);
    let k_signing = hmac_sha256(&k_service, "aws4_request");
    let signature = hmac_sha256_hex(&k_signing, &string_to_sign);

    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        access_key, scope, signed_headers, signature
    );

    let mut headers = vec![
        ("Authorization".to_string(), authorization),
        ("x-amz-date".to_string(), amz_date),
        ("x-amz-content-sha256".to_string(), payload_hash),
    ];
    if let Some(token) = &session_token {
        headers.push(("X-Amz-Security-Token".to_string(), token.clone()));
    }
    Ok(headers)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg_with(pairs: &[(&str, &str)]) -> AuthConfig {
        let map = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        AuthConfig {
            auth_type: "jwt".to_string(),
            config: Some(map),
        }
    }

    #[tokio::test]
    async fn test_apikey_header_mode() {
        let cfg = AuthConfig {
            auth_type: "apiKey".to_string(),
            config: Some(HashMap::from([
                ("key".to_string(), "X-API-Key".to_string()),
                ("value".to_string(), "secret123".to_string()),
                ("addTo".to_string(), "header".to_string()),
            ])),
        };
        let applied = crate::http::auth::apply_auth(&cfg, "GET", "https://x.test/", &HashMap::new(), "")
            .await
            .expect("apply should succeed");
        assert_eq!(applied.headers, vec![("X-API-Key".to_string(), "secret123".to_string())]);
        assert!(applied.query_params.is_empty());
    }

    #[tokio::test]
    async fn test_apikey_query_mode() {
        let cfg = AuthConfig {
            auth_type: "apiKey".to_string(),
            config: Some(HashMap::from([
                ("key".to_string(), "api_key".to_string()),
                ("value".to_string(), "abc".to_string()),
                ("addTo".to_string(), "query".to_string()),
            ])),
        };
        let applied = crate::http::auth::apply_auth(&cfg, "GET", "https://x.test/", &HashMap::new(), "")
            .await
            .expect("apply should succeed");
        assert_eq!(applied.query_params, vec![("api_key".to_string(), "abc".to_string())]);
    }

    #[tokio::test]
    async fn test_basic_auth_header() {
        let cfg = AuthConfig {
            auth_type: "basic".to_string(),
            config: Some(HashMap::from([
                ("username".to_string(), "user".to_string()),
                ("password".to_string(), "pass".to_string()),
            ])),
        };
        let applied = crate::http::auth::apply_auth(&cfg, "GET", "https://x.test/", &HashMap::new(), "")
            .await
            .expect("apply should succeed");
        assert_eq!(
            applied.headers,
            vec![("Authorization".to_string(), "Basic dXNlcjpwYXNz".to_string())]
        );
    }

    #[test]
    fn test_jwt_expiry_parsing() {
        // Header: {"alg":"none"}, payload: {"exp": 9999999999}
        let token = "eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.abc";
        let exp = jwt_expiry_seconds(token);
        assert_eq!(exp, Some(9999999999));
        assert!(!jwt_needs_refresh(token, 60));
    }

    #[test]
    fn test_jwt_no_exp_means_valid() {
        let token = "a.eyJzdWIiOiJ4In0.b";
        assert!(jwt_expiry_seconds(token).is_none());
        assert!(!jwt_needs_refresh(token, 60));
    }

    /// RFC 2617 §3.5 example digest response.
    #[test]
    fn test_digest_rfc2617_vector() {
        let params = DigestParams {
            username: "Mufasa",
            password: "Circle Of Life",
            realm: "testrealm@host.com",
            nonce: "dcd98b7102dd2f0e8b11d0f600bfb0c093",
            uri: "/dir/index.html",
            qop: Some("auth"),
            nc: "00000001",
            cnonce: "0a4f113b",
            method: "GET",
            body: "",
        };
        assert_eq!(compute_digest_response(&params), "6629fae49393a05397450978507c4ef1");
    }

    #[test]
    fn test_digest_rejects_md5_sess() {
        let cfg = AuthConfig {
            auth_type: "digest".to_string(),
            config: Some(HashMap::from([
                ("username".to_string(), "user".to_string()),
                ("password".to_string(), "pass".to_string()),
            ])),
        };
        let challenge = "Digest realm=\"r\", nonce=\"n\", algorithm=MD5-sess";
        let result = digest_authorization(&cfg, "GET", "/", challenge, "");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("MD5-sess"));
    }

    #[test]
    fn test_digest_challenge_parsing() {
        let challenge = "Digest realm=\"testrealm@host.com\", qop=\"auth,auth-int\", nonce=\"dcd98b7102dd2f0e8b11d0f600bfb0c093\", opaque=\"5ccc069c403ebaf9f0171e9517f40e41\"";
        let parsed = parse_challenge(challenge);
        assert_eq!(parsed.get("realm").map(|s| s.as_str()), Some("testrealm@host.com"));
        assert_eq!(parsed.get("qop").map(|s| s.as_str()), Some("auth,auth-int"));
        assert_eq!(
            parsed.get("nonce").map(|s| s.as_str()),
            Some("dcd98b7102dd2f0e8b11d0f600bfb0c093")
        );
    }

    /// Official AWS SigV4 "GET Object" example (S3, us-east-1).
    #[test]
    fn test_sigv4_aws_example_vector() {
        let cfg = AuthConfig {
            auth_type: "awsSigV4".to_string(),
            config: Some(HashMap::from([
                ("accessKey".to_string(), "AKIAIOSFODNN7EXAMPLE".to_string()),
                ("secretKey".to_string(), "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY".to_string()),
                ("region".to_string(), "us-east-1".to_string()),
                ("service".to_string(), "s3".to_string()),
            ])),
        };
        let now = DateTime::parse_from_rfc3339("2013-05-24T00:00:00Z")
            .expect("valid date")
            .with_timezone(&Utc);
        let mut headers = HashMap::new();
        headers.insert("range".to_string(), "bytes=0-9".to_string());
        headers.insert("host".to_string(), "examplebucket.s3.amazonaws.com".to_string());

        let result = aws_sigv4_headers(&cfg, "GET", "https://examplebucket.s3.amazonaws.com/test.txt", &headers, "", Some(now))
            .expect("sigv4 should succeed");
        let auth = result
            .iter()
            .find(|(k, _)| k == "Authorization")
            .map(|(_, v)| v.clone())
            .expect("Authorization header present");

        assert!(auth.starts_with("AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request"));
        assert!(auth.contains("SignedHeaders=host;range;x-amz-content-sha256;x-amz-date"));
        assert!(
            auth.ends_with("Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41"),
            "unexpected signature: {}",
            auth
        );
    }

    #[test]
    fn test_sigv4_deterministic_and_changes_with_body() {
        let cfg = AuthConfig {
            auth_type: "awsSigV4".to_string(),
            config: Some(HashMap::from([
                ("accessKey".to_string(), "AKID".to_string()),
                ("secretKey".to_string(), "SECRET".to_string()),
                ("region".to_string(), "eu-west-1".to_string()),
                ("service".to_string(), "execute-api".to_string()),
            ])),
        };
        let now = DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z")
            .expect("valid date")
            .with_timezone(&Utc);
        let headers = HashMap::new();

        let a = aws_sigv4_headers(&cfg, "POST", "https://api.test.com/prod/items?a=1&b=2", &headers, "{\"x\":1}", Some(now))
            .expect("sigv4 a");
        let b = aws_sigv4_headers(&cfg, "POST", "https://api.test.com/prod/items?a=1&b=2", &headers, "{\"x\":1}", Some(now))
            .expect("sigv4 b");
        let c = aws_sigv4_headers(&cfg, "POST", "https://api.test.com/prod/items?a=1&b=2", &headers, "{\"x\":2}", Some(now))
            .expect("sigv4 c");

        assert_eq!(a, b, "identical inputs must produce identical signatures");
        assert_ne!(a, c, "changing the body must change the signature");

        let auth_a = a.iter().find(|(k, _)| k == "Authorization").unwrap().1.clone();
        let signature = auth_a.split("Signature=").nth(1).unwrap();
        assert_eq!(signature.len(), 64, "signature must be 64 hex chars");
    }

    #[tokio::test]
    async fn test_unknown_auth_type_is_noop() {
        let cfg = cfg_with(&[]);
        let applied = crate::http::auth::apply_auth(&cfg, "GET", "https://x.test/", &HashMap::new(), "")
            .await
            .expect("apply should succeed");
        assert!(applied.headers.is_empty());
    }

    #[test]
    fn test_uri_encode() {
        assert_eq!(uri_encode("a b&c=d", true), "a%20b%26c%3Dd");
        assert_eq!(uri_encode("simple", true), "simple");
        assert_eq!(uri_encode("a/b", false), "a/b");
        assert_eq!(uri_encode("a/b", true), "a%2Fb");
    }
}
