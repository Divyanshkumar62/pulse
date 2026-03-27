use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;
use sha2::{Digest, Sha256};
use std::net::TcpListener;
use tiny_http::{Response, Server};
use url::Url;
use base64::Engine;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct OAuthResult {
    pub code: String,
    pub code_verifier: String,
    pub redirect_uri: String,
}

pub fn generate_pkce() -> (String, String) {
    let verifier: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(64)
        .map(char::from)
        .collect();

    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hasher.finalize());

    (verifier, challenge)
}

pub fn start_callback_server() -> Result<(Server, String), String> {
    // Try to find a free port
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind to local port: {}", e))?;
    let port = listener.local_addr().unwrap().port();
    let redirect_uri = format!("http://127.0.0.1:{}", port);

    let server = Server::from_listener(listener, None)
        .map_err(|e| format!("Failed to start OAuth server: {}", e))?;

    Ok((server, redirect_uri))
}

pub async fn wait_for_code(server: Server) -> Result<String, String> {
    // Wait for a single request
    if let Some(request) = server.incoming_requests().next() {
        let url = format!("http://localhost{}", request.url());
        let parsed = Url::parse(&url).map_err(|e| e.to_string())?;
        
        let code = parsed.query_pairs()
            .find(|(key, _)| key == "code")
            .map(|(_, val)| val.into_owned());

        let response = if code.is_some() {
            Response::from_string("<html><body><h1>Auth Successful</h1><p>You can close this window now.</p></body></html>")
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap())
        } else {
            Response::from_string("Authentication failed. No code found.")
                .with_status_code(400)
        };

        let _ = request.respond(response);
        return code.ok_or_else(|| "No code in redirect".to_string());
    }

    Err("Server closed before receiving code".to_string())
}
