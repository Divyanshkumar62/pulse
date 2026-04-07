use std::collections::HashMap;
use std::time::Instant;

use reqwest::Client;

use crate::http::error::HttpError;
use crate::http::types::{Header, HttpResponse};

pub async fn send_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: crate::RequestBody,
    timeout_secs: u64,
    follow_redirects: bool,
    verify_ssl: bool,
) -> Result<HttpResponse, HttpError> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .danger_accept_invalid_certs(!verify_ssl)
        .redirect(if follow_redirects { 
            reqwest::redirect::Policy::default() 
        } else { 
            reqwest::redirect::Policy::none() 
        })
        .build()
        .map_err(|e| HttpError::InvalidUrl(format!("Failed to create client: {}", e)))?;
    
    
    if url.is_empty() {
        return Err(HttpError::InvalidUrl("URL cannot be empty".to_string()));
    }
    
    let parsed_url = reqwest::Url::parse(&url)
        .map_err(|_| HttpError::InvalidUrl(url.clone()))?;

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
        request = request.header(&key, &value);
    }

    if body.r#type != "none" {
        request = request.body(body.content);
    }

    let start = Instant::now();
    let response = request.send().await?;
    let elapsed = start.elapsed().as_millis() as u64;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

    let header_vec: Vec<Header> = response
        .headers()
        .iter()
        .filter_map(|(k, v)| {
            v.to_str().ok().map(|value_str| Header {
                key: k.to_string(),
                value: value_str.to_string(),
            })
        })
        .collect();

    let body = response.text().await?;

    Ok(HttpResponse {
        status,
        status_text,
        headers: header_vec,
        body,
        time_ms: elapsed,
    })
}
