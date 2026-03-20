mod collections;
mod http;

use collections::loader;
use http::client::{send_request, HttpResponse};

#[tauri::command]
async fn send_http_request(
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: Option<String>,
) -> Result<HttpResponse, String> {
    send_request(method, url, headers, body)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn load_collection(path: String) -> Result<collections::types::Collection, String> {
    loader::load_from_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_collection(collection: collections::types::Collection, path: String) -> Result<(), String> {
    loader::save_to_file(&collection, &path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            send_http_request,
            load_collection,
            save_collection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
