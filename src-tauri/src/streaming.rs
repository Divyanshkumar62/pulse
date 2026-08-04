use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use futures_util::{StreamExt, SinkExt};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message, tungstenite::client::IntoClientRequest};
use url::Url;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamFrame {
    pub id: String,
    pub connection_id: String,
    pub protocol: String, // "WS" | "SSE" | "gRPC"
    pub direction: String, // "IN" | "OUT"
    pub timestamp: String,
    pub size_bytes: usize,
    pub payload_data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamStatus {
    pub connection_id: String,
    pub status: String, // "connecting" | "connected" | "disconnected" | "error"
    pub message: Option<String>,
}

// Active connection senders mapping connection_id -> channel sender for outgoing messages
static OUTGOING_SENDERS: Lazy<Mutex<HashMap<String, mpsc::UnboundedSender<String>>>> = Lazy::new(|| Mutex::new(HashMap::new()));
// Active connection task handles for graceful aborting
static TASK_HANDLES: Lazy<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

fn emit_status(app: &AppHandle, connection_id: &str, status: &str, message: Option<String>) {
    let payload = StreamStatus {
        connection_id: connection_id.to_string(),
        status: status.to_string(),
        message,
    };
    let _ = app.emit("stream-status", payload);
}

fn emit_frame(app: &AppHandle, connection_id: &str, protocol: &str, direction: &str, data: String) {
    let size = data.as_bytes().len();
    let frame = StreamFrame {
        id: uuid::Uuid::new_v4().to_string(),
        connection_id: connection_id.to_string(),
        protocol: protocol.to_string(),
        direction: direction.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        size_bytes: size,
        payload_data: data,
    };
    let _ = app.emit("stream-frame", frame);
}

#[tauri::command]
pub async fn connect_stream(
    app: AppHandle,
    connection_id: String,
    protocol: String,
    url: String,
    headers: HashMap<String, String>,
) -> Result<(), String> {
    // Stop existing connection if running
    let _ = disconnect_stream(connection_id.clone()).await;

    emit_status(&app, &connection_id, "connecting", None);

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    {
        let mut senders = OUTGOING_SENDERS.lock().unwrap();
        senders.insert(connection_id.clone(), tx);
    }

    let conn_id = connection_id.clone();
    let proto = protocol.to_uppercase();
    let app_handle = app.clone();

    let task_handle = tokio::spawn(async move {
        match proto.as_str() {
            "WS" | "WEBSOCKET" => {
                let parsed_url = match Url::parse(&url) {
                    Ok(u) => u,
                    Err(e) => {
                        emit_status(&app_handle, &conn_id, "error", Some(format!("Invalid URL: {}", e)));
                        return;
                    }
                };

                let mut req = match parsed_url.into_client_request() {
                    Ok(r) => r,
                    Err(e) => {
                        emit_status(&app_handle, &conn_id, "error", Some(format!("Failed to build request: {}", e)));
                        return;
                    }
                };

                for (k, v) in headers {
                    if let Ok(header_name) = tokio_tungstenite::tungstenite::http::HeaderName::from_bytes(k.as_bytes()) {
                        if let Ok(header_val) = tokio_tungstenite::tungstenite::http::HeaderValue::from_str(&v) {
                            req.headers_mut().insert(header_name, header_val);
                        }
                    }
                }

                match connect_async(req).await {
                    Ok((ws_stream, _)) => {
                        emit_status(&app_handle, &conn_id, "connected", None);
                        let (mut write, mut read) = ws_stream.split();

                        loop {
                            tokio::select! {
                                // Incoming message from WebSocket
                                msg = read.next() => {
                                    match msg {
                                        Some(Ok(Message::Text(text))) => {
                                            emit_frame(&app_handle, &conn_id, "WS", "IN", text);
                                        }
                                        Some(Ok(Message::Binary(bin))) => {
                                            let text = String::from_utf8_lossy(&bin).to_string();
                                            emit_frame(&app_handle, &conn_id, "WS", "IN", text);
                                        }
                                        Some(Ok(Message::Close(_))) | None => {
                                            emit_status(&app_handle, &conn_id, "disconnected", Some("Server closed connection".to_string()));
                                            break;
                                        }
                                        Some(Err(e)) => {
                                            emit_status(&app_handle, &conn_id, "error", Some(format!("Read error: {}", e)));
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                                // Outgoing message sent from frontend
                                outgoing = rx.recv() => {
                                    match outgoing {
                                        Some(msg_text) => {
                                            if let Err(e) = write.send(Message::Text(msg_text)).await {
                                                emit_status(&app_handle, &conn_id, "error", Some(format!("Write error: {}", e)));
                                                break;
                                            }
                                        }
                                        None => break,
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        emit_status(&app_handle, &conn_id, "error", Some(format!("Connection failed: {}", e)));
                    }
                }
            }
            "SSE" => {
                use eventsource_stream::Eventsource;

                let client = reqwest::Client::new();
                let mut req_builder = client.get(&url);
                for (k, v) in headers {
                    req_builder = req_builder.header(k, v);
                }

                match req_builder.send().await {
                    Ok(response) => {
                        if !response.status().is_success() {
                            emit_status(&app_handle, &conn_id, "error", Some(format!("HTTP Status {}", response.status())));
                            return;
                        }

                        emit_status(&app_handle, &conn_id, "connected", None);
                        let mut stream = response.bytes_stream().eventsource();

                        loop {
                            tokio::select! {
                                event_res = stream.next() => {
                                    match event_res {
                                        Some(Ok(event)) => {
                                            let data = if event.event.is_empty() {
                                                event.data
                                            } else {
                                                format!("[{}] {}", event.event, event.data)
                                            };
                                            emit_frame(&app_handle, &conn_id, "SSE", "IN", data);
                                        }
                                        Some(Err(e)) => {
                                            emit_status(&app_handle, &conn_id, "error", Some(format!("SSE Stream error: {}", e)));
                                            break;
                                        }
                                        None => {
                                            emit_status(&app_handle, &conn_id, "disconnected", Some("SSE Stream ended".to_string()));
                                            break;
                                        }
                                    }
                                }
                                _ = rx.recv() => {
                                    // SSE is read-only
                                }
                            }
                        }
                    }
                    Err(e) => {
                        emit_status(&app_handle, &conn_id, "error", Some(format!("SSE Request failed: {}", e)));
                    }
                }
            }
            "GRPC" => {
                // Simulated gRPC channel stream
                emit_status(&app_handle, &conn_id, "connected", None);
                emit_frame(&app_handle, &conn_id, "gRPC", "IN", "{\"service\": \"Connected to gRPC stream\", \"status\": \"OK\"}".to_string());

                loop {
                    tokio::select! {
                        outgoing = rx.recv() => {
                            match outgoing {
                                Some(msg_text) => {
                                    emit_frame(&app_handle, &conn_id, "gRPC", "IN", format!("{{\"response_to\": {}, \"status\": \"ack\"}}", msg_text));
                                }
                                None => break,
                            }
                        }
                    }
                }
            }
            _ => {
                emit_status(&app_handle, &conn_id, "error", Some(format!("Unsupported protocol: {}", proto)));
            }
        }

        // Cleanup on task exit
        {
            let mut senders = OUTGOING_SENDERS.lock().unwrap();
            senders.remove(&conn_id);
        }
        {
            let mut handles = TASK_HANDLES.lock().unwrap();
            handles.remove(&conn_id);
        }
        emit_status(&app_handle, &conn_id, "disconnected", None);
    });

    {
        let mut handles = TASK_HANDLES.lock().unwrap();
        handles.insert(connection_id, task_handle);
    }

    Ok(())
}

#[tauri::command]
pub async fn send_stream_frame(
    app: AppHandle,
    connection_id: String,
    payload: String,
) -> Result<(), String> {
    let sender = {
        let senders = OUTGOING_SENDERS.lock().unwrap();
        senders.get(&connection_id).cloned()
    };

    if let Some(tx) = sender {
        if tx.send(payload.clone()).is_ok() {
            emit_frame(&app, &connection_id, "WS", "OUT", payload);
            Ok(())
        } else {
            Err("Failed to send message: stream closed".to_string())
        }
    } else {
        Err("No active connection found for ID".to_string())
    }
}

#[tauri::command]
pub async fn disconnect_stream(connection_id: String) -> Result<(), String> {
    let handle = {
        let mut handles = TASK_HANDLES.lock().unwrap();
        handles.remove(&connection_id)
    };

    if let Some(h) = handle {
        h.abort();
    }

    {
        let mut senders = OUTGOING_SENDERS.lock().unwrap();
        senders.remove(&connection_id);
    }

    Ok(())
}
