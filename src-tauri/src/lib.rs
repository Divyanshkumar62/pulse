mod oauth;
mod collections;
mod http;

#[tauri::command]
async fn start_oauth_flow(
    auth_url: String,
    client_id: String,
    scopes: String,
) -> Result<oauth::OAuthResult, String> {
    let (verifier, challenge) = oauth::generate_pkce();
    let (server, redirect_uri) = oauth::start_callback_server()?;
    
    // Construct Auth URL
    let mut url = Url::parse(&auth_url).map_err(|e| format!("URL parse error: {}", e))?;
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("response_type", "code");
        query.append_pair("client_id", &client_id);
        query.append_pair("redirect_uri", &redirect_uri);
        query.append_pair("code_challenge", &challenge);
        query.append_pair("code_challenge_method", "S256");
        if !scopes.is_empty() {
            query.append_pair("scope", &scopes);
        }
    }

    // Open browser
    open::that(url.as_str()).map_err(|e| format!("Failed to open browser: {}", e))?;

    // Wait for code
    let code = oauth::wait_for_code(server).await?;

    Ok(oauth::OAuthResult {
        code,
        code_verifier: verifier,
        redirect_uri,
    })
}

#[tauri::command]
async fn exchange_oauth_token(
    token_url: String,
    code: String,
    code_verifier: String,
    client_id: String,
    client_secret: Option<String>,
    redirect_uri: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut params = vec![
        ("grant_type", "authorization_code"),
        ("code", &code),
        ("code_verifier", &code_verifier),
        ("client_id", &client_id),
        ("redirect_uri", &redirect_uri),
    ];

    let secret_val;
    if let Some(secret) = &client_secret {
        if !secret.is_empty() {
            secret_val = secret.clone();
            params.push(("client_secret", &secret_val));
        }
    }

    let response = client.post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let text = response.text().await.map_err(|e| format!("Failed to get response text: {}", e))?;
    Ok(text)
}

use collections::loader;
use collections::team_loader;
use collections::team::{Team, Invitation, TeamRole};
use collections::email;
use collections::types::{Environment, HistoryEntry, RequestBody, Collection};
use collections::export;
use http::client::send_request;
use http::types::HttpResponse;
use url::Url;
use std::path::PathBuf;
use std::sync::OnceLock;
use dirs;
use serde::{Deserialize, Serialize};

static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

fn get_data_dir() -> &'static PathBuf {
    DATA_DIR.get_or_init(|| {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let mut path = home.join(".pulse");
        if !path.exists() {
            if let Err(e) = std::fs::create_dir_all(&path) {
                eprintln!("Warning: Failed to create data directory: {}", e);
            }
        }
        path
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub email: String,
    pub name: String,
    pub default_timeout_secs: u64,
    pub follow_redirects: bool,
    pub verify_ssl: bool,
    pub theme: String,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            email: "user@example.com".to_string(),
            name: "User".to_string(),
            default_timeout_secs: 30,
            follow_redirects: true,
            verify_ssl: true,
            theme: "dark".to_string(),
        }
    }
}

#[tauri::command]
async fn send_http_request(
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: RequestBody,
    settings: UserSettings,
) -> Result<HttpResponse, String> {
    send_request(
        method, 
        url, 
        headers, 
        body, 
        settings.default_timeout_secs,
        settings.follow_redirects,
        settings.verify_ssl
    )
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

#[tauri::command]
fn load_environments() -> Result<Vec<Environment>, String> {
    let path = get_data_dir().join("environments.yaml");
    if path.exists() {
        loader::load_environments(path).map_err(|e| e.to_string())
    } else {
        Ok(default_environments())
    }
}

fn default_environments() -> Vec<Environment> {
    vec![
        Environment {
            id: "1".to_string(),
            name: "No Environment".to_string(),
            variables: vec![],
        },
        Environment {
            id: "2".to_string(),
            name: "Development".to_string(),
            variables: vec![
                collections::types::EnvVariable {
                    key: "base_url".to_string(),
                    value: "http://localhost:3000".to_string(),
                    enabled: true,
                },
            ],
        },
        Environment {
            id: "3".to_string(),
            name: "Staging".to_string(),
            variables: vec![
                collections::types::EnvVariable {
                    key: "base_url".to_string(),
                    value: "https://staging.api.com".to_string(),
                    enabled: true,
                },
            ],
        },
        Environment {
            id: "4".to_string(),
            name: "Production".to_string(),
            variables: vec![
                collections::types::EnvVariable {
                    key: "base_url".to_string(),
                    value: "https://api.com".to_string(),
                    enabled: true,
                },
            ],
        },
    ]
}

#[tauri::command]
fn save_environments(environments: Vec<Environment>) -> Result<(), String> {
    let path = get_data_dir().join("environments.yaml");
    loader::save_environments(&environments, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_history() -> Result<Vec<HistoryEntry>, String> {
    let path = get_data_dir().join("history.json");
    if path.exists() {
        loader::load_history(&path).map_err(|e| e.to_string())
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
fn save_history(history: Vec<HistoryEntry>) -> Result<(), String> {
    let path = get_data_dir().join("history.json");
    loader::save_history(&history, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_postman_collection(path: String) -> Result<collections::types::Collection, String> {
    loader::import_postman(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_collection(collection: Collection, format: String) -> Result<serde_json::Value, String> {
    match format.as_str() {
        "postman" => Ok(export::to_postman_v21(&collection)),
        "openapi" => Ok(export::to_openapi_v3(&collection)),
        _ => Err(format!("Unsupported export format: {}", format)),
    }
}

#[tauri::command]
fn get_user_settings() -> Result<UserSettings, String> {
    let path = get_data_dir().join("settings.json");
    if path.exists() {
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings: {}", e))
    } else {
        Ok(UserSettings::default())
    }
}

#[tauri::command]
fn save_user_settings(settings: UserSettings) -> Result<(), String> {
    let path = get_data_dir().join("settings.json");
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, json)
        .map_err(|e| format!("Failed to write settings: {}", e))
}

#[tauri::command]
fn create_team(name: String, owner_email: String, owner_name: String) -> Result<Team, String> {
    let teams_path = get_data_dir().join("teams.yaml");
    
    team_loader::create_team(
        teams_path.to_str().unwrap_or("teams.yaml"),
        name,
        uuid::Uuid::new_v4().to_string(),
        owner_email,
        owner_name,
    )
}

#[tauri::command]
fn get_teams() -> Result<Vec<Team>, String> {
    let teams_path = get_data_dir().join("teams.yaml");
    team_loader::load_teams(teams_path.to_str().unwrap_or("teams.yaml"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn invite_to_team(
    team_id: String,
    team_name: String,
    email: String,
    role: String,
    invited_by: String,
    invited_by_name: String,
) -> Result<Invitation, String> {
    let teams_path = get_data_dir().join("teams.yaml");
    let invitations_path = get_data_dir().join("invitations.json");
    
    let role_enum = match role.to_lowercase().as_str() {
        "admin" => TeamRole::Admin,
        "owner" => TeamRole::Owner,
        "member" => TeamRole::Member,
        other => return Err(format!("Invalid role: {}", other)),
    };
    
    let invitation = team_loader::invite_to_team(
        teams_path.to_str().unwrap_or("teams.yaml"),
        invitations_path.to_str().unwrap_or("invitations.json"),
        team_id,
        team_name,
        email,
        role_enum,
        invited_by,
    )?;
    
    if let Err(e) = email::send_invitation_email(&invitation, &invited_by_name).await {
        eprintln!("[Pulse] Warning: Failed to send email: {}", e);
        println!("[Pulse] Email preview saved. Configure EMAIL_PROVIDER, EMAIL_API_KEY to enable sending.");
    }
    
    Ok(invitation)
}

#[tauri::command]
fn get_pending_invitations() -> Result<Vec<Invitation>, String> {
    let invitations_path = get_data_dir().join("invitations.json");
    team_loader::get_pending_invitations(invitations_path)
}

#[tauri::command]
fn get_all_invitations() -> Result<Vec<Invitation>, String> {
    let invitations_path = get_data_dir().join("invitations.json");
    team_loader::load_invitations(invitations_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn accept_invitation(invitation_id: String) -> Result<(), String> {
    let invitations_path = get_data_dir().join("invitations.json");
    let teams_path = get_data_dir().join("teams.yaml");
    let settings = get_user_settings()?;
    
    team_loader::accept_invitation(
        invitations_path,
        teams_path.to_str().unwrap_or("teams.yaml"),
        invitation_id,
        uuid::Uuid::new_v4().to_string(),
        settings.email,
        settings.name,
    )
}

#[tauri::command]
fn decline_invitation(invitation_id: String) -> Result<(), String> {
    let invitations_path = get_data_dir().join("invitations.json");
    team_loader::decline_invitation(invitations_path, invitation_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = get_data_dir();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            send_http_request,
            start_oauth_flow,
            exchange_oauth_token,
            load_collection,
            save_collection,
            export_collection,
            load_environments,
            save_environments,
            load_history,
            save_history,
            import_postman_collection,
            get_user_settings,
            save_user_settings,
            create_team,
            get_teams,
            invite_to_team,
            get_pending_invitations,
            get_all_invitations,
            accept_invitation,
            decline_invitation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
