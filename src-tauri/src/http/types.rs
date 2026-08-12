use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub method: HttpMethod,
    pub url: String,
    pub headers: Vec<Header>,
    pub body: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Head,
    Options,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Header {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<Header>,
    pub body: String,
    pub time_ms: u64,
    /// Set when an auth flow (e.g. JWT auto-refresh) produced a fresh token
    /// during this request. The frontend persists it back onto the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth_refresh: Option<String>,
}

/// Authentication configuration attached to a request. Mirrors the frontend
/// `AuthConfig` type; unknown/missing fields degrade to "none".
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AuthConfig {
    #[serde(rename = "type")]
    pub auth_type: String,
    pub config: Option<HashMap<String, String>>,
}

impl AuthConfig {
    pub fn is_none(&self) -> bool {
        self.auth_type.is_empty() || self.auth_type == "none"
    }

    /// Look up a config value by key (case-insensitive, since the frontend
    /// may send camelCase keys).
    pub fn get(&self, key: &str) -> Option<&String> {
        self.config
            .as_ref()
            .and_then(|map| map.iter().find(|(k, _)| k.eq_ignore_ascii_case(key)).map(|(_, v)| v))
    }

}

/// Per-request proxy override. When `enabled`, `url` overrides the global
/// settings proxy for this request only.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ProxyOverride {
    pub enabled: bool,
    pub url: Option<String>,
}

/// Optional per-request behavior flags passed alongside the raw request data.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RequestOptions {
    pub auth: Option<AuthConfig>,
    /// Enable the session cookie jar for this request.
    pub use_cookies: Option<bool>,
    /// Identifies the cookie jar session (e.g. a collection id) so multiple
    /// requests can share cookies.
    pub session_key: Option<String>,
    /// Per-request proxy override; takes precedence over global settings.
    pub proxy: Option<ProxyOverride>,
}

/// Basic request settings extracted from `UserSettings`.
#[derive(Debug, Clone)]
pub struct RequestSettings {
    pub timeout_secs: u64,
    pub follow_redirects: bool,
    pub verify_ssl: bool,
    pub proxy_enabled: bool,
    pub proxy_url: Option<String>,
}

/// A cookie stored in a session jar, surfaced to the UI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CookieInfo {
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
}
