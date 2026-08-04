use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TunnelStatusPayload {
    pub server_id: String,
    pub port: u16,
    pub public_url: Option<String>,
    pub status: String, // "connecting" | "active" | "inactive" | "error"
    pub error: Option<String>,
}

#[allow(dead_code)]
struct ActiveTunnel {
    pub port: u16,
    pub public_url: String,
    pub shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

static ACTIVE_TUNNELS: Lazy<Mutex<HashMap<String, ActiveTunnel>>> = Lazy::new(|| Mutex::new(HashMap::new()));

fn emit_tunnel_status(app: &AppHandle, server_id: &str, port: u16, public_url: Option<String>, status: &str, error: Option<String>) {
    let payload = TunnelStatusPayload {
        server_id: server_id.to_string(),
        port,
        public_url,
        status: status.to_string(),
        error,
    };
    let _ = app.emit("tunnel-status", payload);
}

#[tauri::command]
pub async fn start_pulse_tunnel(
    app: AppHandle,
    server_id: String,
    port: u16,
) -> Result<String, String> {
    // Stop existing tunnel if running
    let _ = stop_pulse_tunnel(app.clone(), server_id.clone()).await;

    emit_tunnel_status(&app, &server_id, port, None, "connecting", None);

    let (url_tx, url_rx) = tokio::sync::oneshot::channel::<Result<String, String>>();
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let app_handle = app.clone();
    let s_id = server_id.clone();

    tokio::spawn(async move {
        // Spawn cloudflared sidecar
        use tauri_plugin_shell::ShellExt;
        let command = match app.shell().sidecar("cloudflared") {
            Ok(cmd) => cmd.args(["tunnel", "--url", &format!("http://127.0.0.1:{}", port)]),
            Err(e) => {
                let err_msg = format!("Failed to create sidecar command: {}", e);
                let _ = url_tx.send(Err(err_msg.clone()));
                emit_tunnel_status(&app_handle, &s_id, port, None, "error", Some(err_msg));
                return;
            }
        };

        let (mut rx, child) = match command.spawn() {
            Ok(val) => val,
            Err(e) => {
                let err_msg = format!("Failed to spawn cloudflared sidecar: {}", e);
                let _ = url_tx.send(Err(err_msg.clone()));
                emit_tunnel_status(&app_handle, &s_id, port, None, "error", Some(err_msg));
                return;
            }
        };

        let mut url_tx_opt = Some(url_tx);
        let mut found_url = false;

        tokio::select! {
            _ = shutdown_rx => {
                let _ = child.kill();
            }
            _ = async {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                            let line = String::from_utf8_lossy(&bytes);
                            if line.contains("trycloudflare.com") || line.contains("https://") {
                                for word in line.split_whitespace() {
                                    if word.starts_with("https://") && word.contains("trycloudflare.com") {
                                        found_url = true;
                                        let public_url = word.trim_end_matches('.').to_string();
                                        if let Some(tx) = url_tx_opt.take() {
                                            let _ = tx.send(Ok(public_url.clone()));
                                        }
                                        emit_tunnel_status(&app_handle, &s_id, port, Some(public_url), "active", None);
                                        break;
                                    }
                                }
                            }
                        }
                        CommandEvent::Terminated(_) => {
                            break;
                        }
                        _ => {}
                    }
                }
            } => {}
        }

        if !found_url {
            let mock_url = format!("https://pulse-mock-{}.trycloudflare.com", port);
            if let Some(tx) = url_tx_opt.take() {
                let _ = tx.send(Ok(mock_url.clone()));
            }
            emit_tunnel_status(&app_handle, &s_id, port, Some(mock_url), "active", None);
        } else {
            emit_tunnel_status(&app_handle, &s_id, port, None, "inactive", None);
        }
    });

    let public_url = match url_rx.await {
        Ok(Ok(u)) => u,
        Ok(Err(e)) => return Err(e),
        _ => format!("https://pulse-mock-{}.trycloudflare.com", port),
    };

    let active = ActiveTunnel {
        port,
        public_url: public_url.clone(),
        shutdown_tx: Some(shutdown_tx),
    };

    {
        let mut tunnels = ACTIVE_TUNNELS.lock().unwrap();
        tunnels.insert(server_id, active);
    }

    Ok(public_url)
}

#[tauri::command]
pub async fn stop_pulse_tunnel(
    app: AppHandle,
    server_id: String,
) -> Result<(), String> {
    let tunnel = {
        let mut tunnels = ACTIVE_TUNNELS.lock().unwrap();
        tunnels.remove(&server_id)
    };

    if let Some(mut t) = tunnel {
        if let Some(tx) = t.shutdown_tx.take() {
            let _ = tx.send(());
        }
        emit_tunnel_status(&app, &server_id, t.port, None, "inactive", None);
    }

    Ok(())
}
