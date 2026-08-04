use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;
use tokio::join;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegressionRequestConfig {
    pub method: String,
    pub path: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentResponse {
    pub env_name: String,
    pub base_url: String,
    pub status: u16,
    pub status_text: String,
    pub time_ms: u64,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub size_bytes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegressionResult {
    pub response_a: EnvironmentResponse,
    pub response_b: EnvironmentResponse,
    pub latency_diff_ms: i64,
    pub faster_env: String,
    pub is_status_match: bool,
    pub is_body_match: bool,
}

async fn fetch_environment(
    client: &reqwest::Client,
    env_name: String,
    base_url: String,
    config: &RegressionRequestConfig,
) -> EnvironmentResponse {
    let full_url = if base_url.ends_with('/') || config.path.starts_with('/') {
        format!("{}{}", base_url.trim_end_matches('/'), config.path)
    } else {
        format!("{}/{}", base_url, config.path)
    };

    let start = Instant::now();
    let method = match reqwest::Method::from_bytes(config.method.as_bytes()) {
        Ok(m) => m,
        Err(_) => reqwest::Method::GET,
    };

    let mut req_builder = client.request(method, &full_url);
    for (k, v) in &config.headers {
        req_builder = req_builder.header(k, v);
    }
    if let Some(ref body_text) = config.body {
        if !body_text.is_empty() {
            req_builder = req_builder.body(body_text.clone());
        }
    }

    match req_builder.send().await {
        Ok(res) => {
            let status = res.status().as_u16();
            let status_text = res.status().canonical_reason().unwrap_or("OK").to_string();
            let elapsed = start.elapsed().as_millis() as u64;

            let mut resp_headers = HashMap::new();
            for (k, v) in res.headers() {
                if let Ok(val_str) = v.to_str() {
                    resp_headers.insert(k.as_str().to_string(), val_str.to_string());
                }
            }

            let body = res.text().await.unwrap_or_default();
            let size_bytes = body.as_bytes().len();

            EnvironmentResponse {
                env_name,
                base_url,
                status,
                status_text,
                time_ms: elapsed,
                headers: resp_headers,
                body,
                size_bytes,
            }
        }
        Err(e) => {
            let elapsed = start.elapsed().as_millis() as u64;
            EnvironmentResponse {
                env_name,
                base_url,
                status: 500,
                status_text: format!("Error: {}", e),
                time_ms: elapsed,
                headers: HashMap::new(),
                body: format!("{{\"error\": \"{}\"}}", e),
                size_bytes: 0,
            }
        }
    }
}

#[tauri::command]
pub async fn run_regression_test(
    config: RegressionRequestConfig,
    env_a_name: String,
    base_url_a: String,
    env_b_name: String,
    base_url_b: String,
) -> Result<RegressionResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    // Fire HTTP requests concurrently against both environments using tokio::join!
    let (res_a, res_b) = join!(
        fetch_environment(&client, env_a_name.clone(), base_url_a, &config),
        fetch_environment(&client, env_b_name.clone(), base_url_b, &config)
    );

    let latency_diff = res_a.time_ms as i64 - res_b.time_ms as i64;
    let faster_env = if res_a.time_ms < res_b.time_ms {
        env_a_name.clone()
    } else if res_b.time_ms < res_a.time_ms {
        env_b_name.clone()
    } else {
        "Equal".to_string()
    };

    let is_status_match = res_a.status == res_b.status;
    let is_body_match = res_a.body.trim() == res_b.body.trim();

    Ok(RegressionResult {
        response_a: res_a,
        response_b: res_b,
        latency_diff_ms: latency_diff,
        faster_env,
        is_status_match,
        is_body_match,
    })
}
