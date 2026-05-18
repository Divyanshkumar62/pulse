use std::collections::HashMap;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use std::net::TcpStream;
use std::io::Write;
use tiny_http::{Response, Server};
use once_cell::sync::Lazy;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Header {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MockRoute {
    pub id: String,
    pub path: String,
    pub method: String,
    pub status_code: u16,
    pub response_body: String,
    pub headers: Vec<Header>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MockServerConfig {
    pub id: String,
    pub name: String,
    pub port: u16,
    pub routes: Vec<MockRoute>,
    pub status: String, // "active" | "inactive"
}

// Global registry of running mock servers: mapping server_id -> port
static RUNNING_SERVERS: Lazy<Mutex<HashMap<String, u16>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
pub fn start_mock_server(id: String, port: u16, routes: Vec<MockRoute>) -> Result<(), String> {
    let mut running = RUNNING_SERVERS.lock().unwrap();
    if running.contains_key(&id) {
        return Err("Mock server is already running".to_string());
    }

    // Check if port is already in use by another mock server
    for (running_id, &running_port) in running.iter() {
        if running_port == port {
            return Err(format!("Port {} is already in use by mock server {}", port, running_id));
        }
    }

    // Attempt to bind to the port first
    let addr = format!("127.0.0.1:{}", port);
    let server = Server::http(&addr).map_err(|e| format!("Failed to start server on port {}: {}", port, e))?;

    // Store in running list
    running.insert(id.clone(), port);

    // Spawn the server loop in a background thread
    let server_id = id.clone();
    thread::spawn(move || {
        log::info!("Mock server {} started on {}", server_id, addr);
        for request in server.incoming_requests() {
            // Check if this is a shutdown signal
            if request.url() == "/__shutdown" {
                let _ = request.respond(Response::from_string("Stopped"));
                log::info!("Mock server {} received shutdown signal.", server_id);
                break;
            }

            // Find matching route
            let req_method = request.method().to_string();
            let req_path = request.url().split('?').next().unwrap_or("/");

            let matched_route = routes.iter().find(|r| {
                let r_method = r.method.to_uppercase();
                let req_method_upper = req_method.to_uppercase();
                let r_path = if r.path.starts_with('/') { r.path.clone() } else { format!("/{}", r.path) };
                let req_path_std = if req_path.starts_with('/') { req_path.to_string() } else { format!("/{}", req_path) };
                r_method == req_method_upper && r_path == req_path_std
            });

            if let Some(route) = matched_route {
                let mut response = Response::from_string(&route.response_body)
                    .with_status_code(route.status_code);
                
                // Add headers
                for header in &route.headers {
                    if let Ok(h) = tiny_http::Header::from_bytes(header.key.as_bytes(), header.value.as_bytes()) {
                        response = response.with_header(h);
                    }
                }
                
                // Set default Content-Type to application/json if not set and body looks like JSON
                let has_content_type = route.headers.iter().any(|h| h.key.to_lowercase() == "content-type");
                if !has_content_type && (route.response_body.trim().starts_with('{') || route.response_body.trim().starts_with('[')) {
                    if let Ok(h) = tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]) {
                        response = response.with_header(h);
                    }
                }

                let _ = request.respond(response);
            } else {
                // Not found response
                let response = Response::from_string("{\"error\": \"Mock route not found\"}")
                    .with_status_code(404)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                let _ = request.respond(response);
            }
        }

        // Clean up from running servers list
        let mut running = RUNNING_SERVERS.lock().unwrap();
        running.remove(&server_id);
        log::info!("Mock server {} thread stopped.", server_id);
    });

    Ok(())
}

#[tauri::command]
pub fn stop_mock_server(id: String) -> Result<(), String> {
    let port = {
        let running = RUNNING_SERVERS.lock().unwrap();
        if let Some(&p) = running.get(&id) {
            p
        } else {
            return Ok(()); // Not running, or already stopped
        }
    };

    // Send a HTTP request to /__shutdown on this port to unblock the thread and terminate the loop
    if let Ok(mut stream) = TcpStream::connect(format!("127.0.0.1:{}", port)) {
        let _ = stream.write_all(b"GET /__shutdown HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
    }

    // Give it a tiny bit of time to shutdown, then verify and remove
    thread::sleep(Duration::from_millis(50));
    let mut running = RUNNING_SERVERS.lock().unwrap();
    running.remove(&id);

    Ok(())
}

#[tauri::command]
pub fn load_mock_servers() -> Result<Vec<MockServerConfig>, String> {
    let path = crate::get_data_dir().join("mock_servers.json");
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let servers: Vec<MockServerConfig> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(servers)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub fn save_mock_servers(servers: Vec<MockServerConfig>) -> Result<(), String> {
    let path = crate::get_data_dir().join("mock_servers.json");
    let content = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_running_mock_servers() -> Result<Vec<String>, String> {
    let running = RUNNING_SERVERS.lock().unwrap();
    Ok(running.keys().cloned().collect())
}

#[tauri::command]
pub fn save_workspace_mock_servers(workspace_path: String, servers: Vec<MockServerConfig>) -> Result<(), String> {
    let base_path = std::path::PathBuf::from(workspace_path);
    let path = base_path.join("mock_servers.json");
    let content = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_workspace_mock_servers(workspace_path: String) -> Result<Vec<MockServerConfig>, String> {
    let base_path = std::path::PathBuf::from(workspace_path);
    let path = base_path.join("mock_servers.json");
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let servers: Vec<MockServerConfig> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(servers)
    } else {
        Ok(vec![])
    }
}
