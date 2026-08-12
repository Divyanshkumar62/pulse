use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use once_cell::sync::Lazy;
use reqwest::cookie::CookieStore;
use reqwest::Client;

use crate::http::auth;
use crate::http::error::HttpError;
use crate::http::types::{CookieInfo, Header, HttpResponse, RequestOptions, RequestSettings};

/// Session cookie jars keyed by session id (e.g. a collection id). Requests
/// sharing a session key share cookies, mirroring a browser cookie jar.
static COOKIE_SESSIONS: Lazy<Mutex<HashMap<String, Arc<reqwest::cookie::Jar>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn session_jar(session_key: &str) -> Arc<reqwest::cookie::Jar> {
    let mut sessions = COOKIE_SESSIONS.lock().unwrap();
    sessions
        .entry(session_key.to_string())
        .or_insert_with(|| Arc::new(reqwest::cookie::Jar::default()))
        .clone()
}

/// List the cookies stored for a session that would be sent to `url`.
pub fn get_session_cookies(session_key: &str, url: &str) -> Result<Vec<CookieInfo>, String> {
    let jar = session_jar(session_key);
    let parsed = reqwest::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;

    let header = jar.cookies(&parsed);

    let mut cookies = Vec::new();
    if let Some(header) = header {
        for part in header.to_str().unwrap_or_default().split(';') {
            let part = part.trim();
            if part.is_empty() {
                continue;
            }
            let (name, value) = match part.split_once('=') {
                Some((n, v)) => (n.trim().to_string(), v.trim().to_string()),
                None => (part.to_string(), String::new()),
            };
            cookies.push(CookieInfo {
                name,
                value,
                domain: parsed.host_str().unwrap_or_default().to_string(),
                path: parsed.path().to_string(),
            });
        }
    }
    Ok(cookies)
}

/// Drop all cookies for a session jar.
pub fn clear_session_cookies(session_key: &str) {
    COOKIE_SESSIONS.lock().unwrap().remove(session_key);
}

/// Resolved request data after auth is applied, ready for the final send.
struct AuthResolution {
    url: String,
    headers: HashMap<String, String>,
    refreshed_token: Option<String>,
}

/// Outcome of applying auth to a request.
enum AuthOutcome {
    /// Continue with the resolved request.
    Proceed(AuthResolution),
    /// The auth preflight response (e.g. a non-401 digest probe) is final.
    Respond(HttpResponse),
}

/// Apply auth to the request, handling the Digest challenge/response flow.
///
/// A Digest preflight that is answered with anything other than `401` is the
/// final response (the endpoint did not require auth), so it is returned
/// directly instead of sending the request a second time.
async fn apply_request_auth(
    client: &Client,
    auth_cfg: &crate::http::types::AuthConfig,
    method: &str,
    url: &str,
    mut headers: HashMap<String, String>,
    body: &str,
) -> Result<AuthOutcome, HttpError> {
    let applied = auth::apply_auth(auth_cfg, method, url, &headers, body)
        .await
        .map_err(HttpError::Auth)?;

    // API keys in query mode become URL query parameters.
    let mut final_url = url.to_string();
    for (key, value) in &applied.query_params {
        let sep = if final_url.contains('?') { "&" } else { "?" };
        final_url = format!(
            "{}{}{}={}",
            final_url,
            sep,
            auth::uri_encode(key, true),
            auth::uri_encode(value, true)
        );
    }

    for (key, value) in applied.headers {
        headers.insert(key, value);
    }

    // Digest: send once without auth, then answer the 401 challenge.
    if auth_cfg.auth_type.eq_ignore_ascii_case("digest")
        && !headers.contains_key("Authorization")
    {
        let request = build_request(client, method, &final_url, &headers, body)?;
        let start = Instant::now();
        let preflight = request.send().await.map_err(HttpError::RequestFailed)?;
        let elapsed = start.elapsed().as_millis() as u64;

        if preflight.status() != reqwest::StatusCode::UNAUTHORIZED {
            return Ok(AuthOutcome::Respond(parse_response(preflight, elapsed).await?));
        }

        if let Some(www_auth) = preflight
            .headers()
            .get(reqwest::header::WWW_AUTHENTICATE)
            .and_then(|v| v.to_str().ok())
        {
            if www_auth.to_lowercase().starts_with("digest") {
                // RFC 7616 §3.4: the `uri` directive is the request-target as it
                // appears on the request line (path + query), NOT the absolute
                // URL. Servers compute HA2 over the path, so signing the full
                // URL here would make every handshake fail.
                let digest_uri = request_target(&final_url);
                let digest_header =
                    auth::digest_authorization(auth_cfg, method, &digest_uri, www_auth, body)
                        .map_err(HttpError::Auth)?;
                headers.insert("Authorization".to_string(), digest_header);
            }
        }
    }

    Ok(AuthOutcome::Proceed(AuthResolution {
        url: final_url,
        headers,
        refreshed_token: applied.refreshed_token,
    }))
}

/// The origin-form request-target for a URL: path plus query string
/// (e.g. `https://api.test/a/b?x=1` -> `/a/b?x=1`). Falls back to `/` when the
/// URL cannot be parsed, matching what a client would put on the request line.
fn request_target(url: &str) -> String {
    match reqwest::Url::parse(url) {
        Ok(parsed) => {
            let path = parsed.path();
            let path = if path.is_empty() { "/" } else { path };
            match parsed.query() {
                Some(query) => format!("{}?{}", path, query),
                None => path.to_string(),
            }
        }
        Err(_) => "/".to_string(),
    }
}

fn build_request(
    client: &Client,
    method: &str,
    url: &str,
    headers: &HashMap<String, String>,
    body: &str,
) -> Result<reqwest::RequestBuilder, HttpError> {
    let parsed_url = reqwest::Url::parse(url).map_err(|_| HttpError::InvalidUrl(url.to_string()))?;
    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(parsed_url),
        "POST" => client.post(parsed_url),
        "PUT" => client.put(parsed_url),
        "DELETE" => client.delete(parsed_url),
        "PATCH" => client.patch(parsed_url),
        "HEAD" => client.head(parsed_url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, parsed_url),
        _ => return Err(HttpError::InvalidUrl(format!("Unknown method: {}", method))),
    };

    for (key, value) in headers {
        request = request.header(key, value);
    }

    if !body.is_empty() {
        request = request.body(body.to_string());
    }

    Ok(request)
}

pub async fn send_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: crate::RequestBody,
    settings: RequestSettings,
    options: RequestOptions,
) -> Result<HttpResponse, HttpError> {
    let mut client_builder = Client::builder()
        .timeout(std::time::Duration::from_secs(settings.timeout_secs))
        .danger_accept_invalid_certs(!settings.verify_ssl)
        .redirect(if settings.follow_redirects {
            reqwest::redirect::Policy::default()
        } else {
            reqwest::redirect::Policy::none()
        });

    // Proxy: per-request override wins, otherwise fall back to global settings.
    let proxy_url = effective_proxy_url(&settings, &options);
    if let Some(proxy_url) = proxy_url {
        if !proxy_url.is_empty() {
            let proxy = reqwest::Proxy::all(&proxy_url)
                .map_err(|e| HttpError::InvalidUrl(format!("Invalid proxy URL: {}", e)))?;
            client_builder = client_builder.proxy(proxy);
        }
    }

    // Cookie jar: share a per-session jar so cookies persist across requests.
    if let Some(session_key) = session_key_for(&options) {
        if !session_key.is_empty() {
            let jar = session_jar(session_key);
            client_builder = client_builder.cookie_provider(jar);
        }
    }

    let client = client_builder
        .build()
        .map_err(|e| HttpError::InvalidUrl(format!("Failed to create client: {}", e)))?;

    if url.is_empty() {
        return Err(HttpError::InvalidUrl("URL cannot be empty".to_string()));
    }

    // A body type of "none" means "send no payload", even if stale content is
    // still held in the request (the UI keeps the text when the type changes).
    // Resolving it here keeps the payload the SigV4 hash signs identical to the
    // payload actually sent.
    let body_content = if body.r#type == "none" {
        String::new()
    } else {
        body.content.clone()
    };

    let (final_url, final_headers, refreshed_token) = match &options.auth {
        Some(auth_cfg) if !auth_cfg.is_none() => {
            match apply_request_auth(&client, auth_cfg, &method, &url, headers, &body_content).await? {
                AuthOutcome::Proceed(resolution) => {
                    (resolution.url, resolution.headers, resolution.refreshed_token)
                }
                AuthOutcome::Respond(response) => return Ok(response),
            }
        }
        _ => (url, headers, None),
    };

    let request = build_request(&client, &method, &final_url, &final_headers, &body_content)?;

    let start = Instant::now();
    let response = request.send().await?;
    let elapsed = start.elapsed().as_millis() as u64;

    let mut response = parse_response(response, elapsed).await?;
    response.auth_refresh = refreshed_token;
    Ok(response)
}

/// Resolve which proxy URL applies: the per-request override when enabled,
/// otherwise the global settings proxy.
fn effective_proxy_url(settings: &RequestSettings, options: &RequestOptions) -> Option<String> {
    if let Some(proxy) = &options.proxy {
        if proxy.enabled {
            return proxy.url.clone();
        }
    }
    settings.proxy_enabled.then(|| settings.proxy_url.clone()).flatten()
}

/// The session key when the cookie jar is enabled for this request.
fn session_key_for(options: &RequestOptions) -> Option<&str> {
    match (options.use_cookies, options.session_key.as_deref()) {
        (Some(true), Some(key)) => Some(key),
        _ => None,
    }
}

/// Convert a raw `reqwest` response into the Pulse response shape.
async fn parse_response(
    response: reqwest::Response,
    elapsed_ms: u64,
) -> Result<HttpResponse, HttpError> {
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    let headers: Vec<Header> = response
        .headers()
        .iter()
        .filter_map(|(k, v)| {
            v.to_str().ok().map(|value_str| Header {
                key: k.to_string(),
                value: value_str.to_string(),
            })
        })
        .collect();

    Ok(HttpResponse {
        status,
        status_text,
        headers,
        body: response.text().await?,
        time_ms: elapsed_ms,
        auth_refresh: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::collections::types::RequestBody;
    use crate::http::types::{AuthConfig, ProxyOverride, RequestSettings};

    fn settings() -> RequestSettings {
        RequestSettings {
            timeout_secs: 10,
            follow_redirects: true,
            verify_ssl: false,
            proxy_enabled: false,
            proxy_url: None,
        }
    }

    fn body() -> RequestBody {
        RequestBody {
            r#type: "none".to_string(),
            content: String::new(),
            graphql: None,
        }
    }

    #[test]
    fn test_request_target_is_path_and_query() {
        assert_eq!(request_target("https://api.test/a/b?x=1&y=2"), "/a/b?x=1&y=2");
        assert_eq!(request_target("https://api.test/a/b"), "/a/b");
        assert_eq!(request_target("https://api.test"), "/");
        assert_eq!(request_target("https://api.test/"), "/");
        assert_eq!(request_target("not a url"), "/");
    }

    /// A body whose type is "none" must not be sent, even when stale content
    /// is still attached (the UI keeps the text when the type changes).
    #[tokio::test]
    async fn test_body_type_none_sends_no_payload() {
        let server = tiny_http::Server::http("127.0.0.1:0").expect("test server");
        let port = server.server_addr().to_ip().expect("ip addr").port();

        std::thread::spawn(move || {
            if let Ok(mut request) = server.recv() {
                let mut received = String::new();
                std::io::Read::read_to_string(request.as_reader(), &mut received).ok();
                request
                    .respond(tiny_http::Response::from_string(format!("[{}]", received)))
                    .ok();
            }
        });

        let stale_body = RequestBody {
            r#type: "none".to_string(),
            content: "{\"stale\":true}".to_string(),
            graphql: None,
        };

        let response = send_request(
            "POST".to_string(),
            format!("http://127.0.0.1:{}/", port),
            HashMap::new(),
            stale_body,
            settings(),
            RequestOptions::default(),
        )
        .await
        .expect("request should succeed");

        assert_eq!(
            response.body, "[]",
            "body type 'none' must suppress the stale payload"
        );
    }

    #[test]
    fn test_cookie_session_isolation() {
        clear_session_cookies("session-a");
        clear_session_cookies("session-b");
        let jar_a = session_jar("session-a");
        let jar_b = session_jar("session-b");
        assert!(!Arc::ptr_eq(&jar_a, &jar_b));
    }

    /// End-to-end cookie jar: a cookie set by one request in a session is
    /// automatically sent by the next request in the same session.
    #[tokio::test]
    async fn test_cookie_jar_persists_across_requests() {
        let server = tiny_http::Server::http("127.0.0.1:0").expect("test server");
        let port = server.server_addr().to_ip().expect("ip addr").port();

        std::thread::spawn(move || {
            for _ in 0..2 {
                if let Ok(request) = server.recv() {
                    if request.url().starts_with("/set") {
                        let set_cookie = tiny_http::Header::from_bytes(
                            &b"Set-Cookie"[..],
                            &b"session=abc123; Path=/"[..],
                        )
                        .expect("set-cookie header");
                        request
                            .respond(tiny_http::Response::from_string("ok").with_header(set_cookie))
                            .ok();
                    } else {
                        let cookie = request
                            .headers()
                            .iter()
                            .find(|h| h.field.equiv("Cookie"))
                            .map(|h| h.value.as_str().to_string())
                            .unwrap_or_default();
                        request
                            .respond(tiny_http::Response::from_string(cookie))
                            .ok();
                    }
                }
            }
        });

        let options = RequestOptions {
            use_cookies: Some(true),
            session_key: Some("it-cookie-session".to_string()),
            ..Default::default()
        };

        let base = format!("http://127.0.0.1:{}", port);
        let first = send_request(
            "GET".to_string(),
            format!("{}/set", base),
            HashMap::new(),
            body(),
            settings(),
            options.clone(),
        )
        .await
        .expect("first request");
        assert_eq!(first.status, 200);

        let second = send_request(
            "GET".to_string(),
            format!("{}/echo", base),
            HashMap::new(),
            body(),
            settings(),
            options,
        )
        .await
        .expect("second request");
        assert_eq!(second.status, 200);
        assert!(
            second.body.contains("session=abc123"),
            "cookie should be sent on the second request, got: {}",
            second.body
        );
    }

    /// End-to-end Digest auth: the client answers the 401 challenge and
    /// retries with an Authorization header the server independently verifies.
    ///
    /// The server recomputes the expected digest the way a real server does —
    /// over the request-target it received (`/protected/file.txt?v=2`) — so a
    /// client that signs the absolute URL instead fails this test.
    #[tokio::test]
    async fn test_digest_two_phase_flow() {
        let server = tiny_http::Server::http("127.0.0.1:0").expect("test server");
        let port = server.server_addr().to_ip().expect("ip addr").port();

        std::thread::spawn(move || {
            for _ in 0..2 {
                if let Ok(request) = server.recv() {
                    let request_target = request.url().to_string();
                    let auth = request
                        .headers()
                        .iter()
                        .find(|h| h.field.equiv("Authorization"))
                        .map(|h| h.value.as_str().to_string())
                        .unwrap_or_default();

                    let verified = auth.starts_with("Digest ")
                        && verify_digest(&auth, "GET", &request_target);

                    let response = if verified {
                        tiny_http::Response::from_string("authenticated")
                    } else if auth.starts_with("Digest ") {
                        tiny_http::Response::from_string("bad digest").with_status_code(403)
                    } else {
                        let challenge = tiny_http::Header::from_bytes(
                            &b"WWW-Authenticate"[..],
                            &b"Digest realm=\"testrealm@host.com\", nonce=\"dcd98b7102dd2f0e8b11d0f600bfb0c093\", qop=\"auth\", opaque=\"5ccc069c403ebaf9f0171e9517f40e41\""[..],
                        )
                        .expect("challenge header");
                        tiny_http::Response::from_string("")
                            .with_status_code(401)
                            .with_header(challenge)
                    };
                    request.respond(response).ok();
                }
            }
        });

        let auth_cfg = AuthConfig {
            auth_type: "digest".to_string(),
            config: Some(HashMap::from([
                ("username".to_string(), "Mufasa".to_string()),
                ("password".to_string(), "Circle Of Life".to_string()),
            ])),
        };
        let options = RequestOptions {
            auth: Some(auth_cfg),
            ..Default::default()
        };

        let response = send_request(
            "GET".to_string(),
            format!("http://127.0.0.1:{}/protected/file.txt?v=2", port),
            HashMap::new(),
            body(),
            settings(),
            options,
        )
        .await
        .expect("digest request");

        assert_eq!(
            response.status, 200,
            "digest handshake should authenticate, got body: {}",
            response.body
        );
        assert_eq!(response.body, "authenticated");
    }

    /// Recompute a Digest `response` the way a server does and compare it to
    /// the one the client sent. Also asserts the client's `uri` directive
    /// matches the request-target actually received.
    fn verify_digest(header: &str, method: &str, request_target: &str) -> bool {
        let fields: HashMap<String, String> = header
            .trim_start_matches("Digest ")
            .split(',')
            .filter_map(|part| {
                let (k, v) = part.split_once('=')?;
                Some((
                    k.trim().to_lowercase(),
                    v.trim().trim_matches('"').to_string(),
                ))
            })
            .collect();

        let uri = match fields.get("uri") {
            Some(uri) => uri,
            None => return false,
        };
        if uri != request_target {
            return false;
        }

        let expected = crate::http::auth::compute_digest_response(&crate::http::auth::DigestParams {
            username: "Mufasa",
            password: "Circle Of Life",
            realm: "testrealm@host.com",
            nonce: "dcd98b7102dd2f0e8b11d0f600bfb0c093",
            uri,
            qop: fields.get("qop").map(|s| s.as_str()),
            nc: fields.get("nc").map(|s| s.as_str()).unwrap_or(""),
            cnonce: fields.get("cnonce").map(|s| s.as_str()).unwrap_or(""),
            method,
            body: "",
        });

        fields.get("response") == Some(&expected)
    }

    /// A digest-configured request against an endpoint that does not require
    /// auth must send exactly one request (the preflight is the answer).
    #[tokio::test]
    async fn test_digest_preflight_no_double_send() {
        use std::sync::atomic::{AtomicUsize, Ordering};

        let server = tiny_http::Server::http("127.0.0.1:0").expect("test server");
        let port = server.server_addr().to_ip().expect("ip addr").port();
        let hit_count = std::sync::Arc::new(AtomicUsize::new(0));
        let hits = hit_count.clone();

        std::thread::spawn(move || {
            if let Ok(request) = server.recv() {
                hits.fetch_add(1, Ordering::SeqCst);
                request.respond(tiny_http::Response::from_string("public")).ok();
            }
        });

        let auth_cfg = AuthConfig {
            auth_type: "digest".to_string(),
            config: Some(HashMap::from([
                ("username".to_string(), "user".to_string()),
                ("password".to_string(), "pass".to_string()),
            ])),
        };
        let options = RequestOptions {
            auth: Some(auth_cfg),
            ..Default::default()
        };

        let response = send_request(
            "POST".to_string(),
            format!("http://127.0.0.1:{}/", port),
            HashMap::new(),
            body(),
            settings(),
            options,
        )
        .await
        .expect("request should succeed");

        assert_eq!(response.status, 200);
        assert_eq!(response.body, "public");
        assert_eq!(
            hit_count.load(Ordering::SeqCst),
            1,
            "a non-401 preflight must not trigger a second request"
        );
    }

    /// End-to-end JWT auto-refresh: an expired token is exchanged at the token
    /// endpoint, the fresh token is used for the request and returned to the UI.
    #[tokio::test]
    async fn test_jwt_auto_refresh_uses_and_returns_new_token() {
        use base64::engine::general_purpose::URL_SAFE_NO_PAD;
        use base64::Engine;

        let token_server = tiny_http::Server::http("127.0.0.1:0").expect("token server");
        let token_port = token_server.server_addr().to_ip().expect("ip addr").port();
        std::thread::spawn(move || {
            if let Ok(request) = token_server.recv() {
                let content_type = tiny_http::Header::from_bytes(
                    &b"Content-Type"[..],
                    &b"application/json"[..],
                )
                .expect("content-type header");
                request
                    .respond(
                        tiny_http::Response::from_string(r#"{"access_token":"refreshed-token-123"}"#)
                            .with_header(content_type),
                    )
                    .ok();
            }
        });

        let api_server = tiny_http::Server::http("127.0.0.1:0").expect("api server");
        let api_port = api_server.server_addr().to_ip().expect("ip addr").port();
        std::thread::spawn(move || {
            if let Ok(request) = api_server.recv() {
                let auth = request
                    .headers()
                    .iter()
                    .find(|h| h.field.equiv("Authorization"))
                    .map(|h| h.value.as_str().to_string())
                    .unwrap_or_default();
                request.respond(tiny_http::Response::from_string(auth)).ok();
            }
        });

        // Expired JWT (exp = 1 second after epoch).
        let header = URL_SAFE_NO_PAD.encode("{\"alg\":\"none\"}");
        let payload = URL_SAFE_NO_PAD.encode("{\"exp\":1}");
        let expired = format!("{}.{}.sig", header, payload);

        let auth_cfg = AuthConfig {
            auth_type: "jwt".to_string(),
            config: Some(HashMap::from([
                ("token".to_string(), expired),
                ("refreshToken".to_string(), "refresh-me".to_string()),
                (
                    "refreshUrl".to_string(),
                    format!("http://127.0.0.1:{}/token", token_port),
                ),
                ("clientId".to_string(), "client-1".to_string()),
            ])),
        };
        let options = RequestOptions {
            auth: Some(auth_cfg),
            ..Default::default()
        };

        let response = send_request(
            "GET".to_string(),
            format!("http://127.0.0.1:{}/api", api_port),
            HashMap::new(),
            body(),
            settings(),
            options,
        )
        .await
        .expect("jwt request");

        assert_eq!(response.body, "Bearer refreshed-token-123");
        assert_eq!(
            response.auth_refresh.as_deref(),
            Some("refreshed-token-123"),
            "the refreshed token must be returned to the caller for persistence"
        );
    }

    /// Per-request proxy override takes precedence over settings.
    #[tokio::test]
    async fn test_proxy_override_wins_over_settings() {
        let server = tiny_http::Server::http("127.0.0.1:0").expect("test server");
        let port = server.server_addr().to_ip().expect("ip addr").port();

        std::thread::spawn(move || {
            if let Ok(request) = server.recv() {
                request.respond(tiny_http::Response::from_string("ok")).ok();
            }
        });

        // Settings proxy is a dead port; the per-request override points at the
        // live server, so the request can only succeed via the override.
        let proxy = ProxyOverride {
            enabled: true,
            url: Some(format!("http://127.0.0.1:{}", port)),
        };
        let mut settings = settings();
        settings.proxy_enabled = true;
        settings.proxy_url = Some("http://127.0.0.1:1".to_string()); // unused port

        let options = RequestOptions {
            proxy: Some(proxy),
            ..Default::default()
        };

        let response = send_request(
            "GET".to_string(),
            "http://127.0.0.1:1/anything".to_string(),
            HashMap::new(),
            body(),
            settings,
            options,
        )
        .await
        .expect("request via override proxy");
        assert_eq!(response.status, 200);
        assert_eq!(response.body, "ok");
    }
}
