use std::collections::HashMap;
use std::time::Instant;

use crate::http::error::HttpError;
use crate::http::types::{Header, HttpMethod, HttpResponse};

pub async fn send_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<HttpResponse, HttpError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "HEAD" => client.head(&url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, &url),
        _ => return Err(HttpError::InvalidUrl(format!("Unknown method: {}", method))),
    };

    for (key, value) in headers {
        request = request.header(&key, &value);
    }

    if let Some(body) = body {
        request = request.body(body);
    }

    let start = Instant::now();
    let response = request.send().await?;
    let elapsed = start.elapsed().as_millis() as u64;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

    let header_vec: Vec<Header> = response
        .headers()
        .iter()
        .map(|(k, v)| Header {
            key: k.to_string(),
            value: v.to_str().unwrap_or("").to_string(),
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
