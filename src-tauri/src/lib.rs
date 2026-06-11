pub mod utils;
mod oauth;
pub mod collections;
mod http;
mod mock_server;
pub mod script_runner;
mod search;
pub mod secrets;

#[tauri::command]
async fn start_oauth_flow(
    auth_url: String,
    client_id: String,
    scopes: String,
) -> Result<oauth::OAuthResult, String> {
    log::info!("Starting OAuth flow for client_id: {}", client_id);
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
use mock_server::{start_mock_server, stop_mock_server, load_mock_servers, save_mock_servers, get_running_mock_servers, save_workspace_mock_servers, load_workspace_mock_servers};
use url::Url;
use serde::{Deserialize, Serialize};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub default_timeout_secs: u64,
    pub follow_redirects: bool,
    pub verify_ssl: bool,
    pub theme: String,
    pub proxy_enabled: bool,
    pub proxy_url: Option<String>,
    pub history_retention_days: u32,
    pub github_token: Option<String>,
    pub github_username: Option<String>,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            email: "user@example.com".to_string(),
            name: "User".to_string(),
            avatar_url: None,
            default_timeout_secs: 30,
            follow_redirects: true,
            verify_ssl: true,
            theme: "dark".to_string(),
            proxy_enabled: false,
            proxy_url: None,
            history_retention_days: 30,
            github_token: None,
            github_username: None,
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
        settings.verify_ssl,
        settings.proxy_enabled,
        settings.proxy_url
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_collection(path: String) -> Result<collections::types::Collection, String> {
    let sanitized_path = collections::utils::sanitize_path(&path)?;
    tokio::task::spawn_blocking(move || {
        loader::load_from_file(sanitized_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_collection(collection: collections::types::Collection, path: String) -> Result<(), String> {
    let sanitized_path = collections::utils::sanitize_path(&path)?;
    tokio::task::spawn_blocking(move || {
        loader::save_to_file(&collection, sanitized_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_environments() -> Result<Vec<Environment>, String> {
    let path = crate::utils::get_pulse_data_dir().join("environments.yaml");
    if path.exists() {
        tokio::task::spawn_blocking(move || {
            loader::load_environments(path).map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?
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
                    description: None,
                    secret: None,
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
                    description: None,
                    secret: None,
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
                    description: None,
                    secret: None,
                },
            ],
        },
    ]
}

#[tauri::command]
async fn save_environments(environments: Vec<Environment>) -> Result<(), String> {
    let path = crate::utils::get_pulse_data_dir().join("environments.yaml");
    tokio::task::spawn_blocking(move || {
        loader::save_environments(&environments, &path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_history() -> Result<Vec<HistoryEntry>, String> {
    let path = crate::utils::get_pulse_data_dir().join("history.json");
    if path.exists() {
        tokio::task::spawn_blocking(move || {
            loader::load_history(&path).map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| e.to_string())?
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
async fn save_history(history: Vec<HistoryEntry>) -> Result<(), String> {
    let path = crate::utils::get_pulse_data_dir().join("history.json");
    tokio::task::spawn_blocking(move || {
        loader::save_history(&history, &path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn import_postman_collection(path: String) -> Result<collections::types::Collection, String> {
    loader::import_postman(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_openapi_spec(path: String) -> Result<collections::types::Collection, String> {
    loader::import_openapi(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_collection(collection: Collection, format: String) -> Result<serde_json::Value, String> {
    match format.as_str() {
        "postman" => Ok(export::to_postman_v21(&collection)),
        "openapi" => Ok(export::to_openapi_v3(&collection)),
        _ => Err(format!("Unsupported export format: {}", format)),
    }
}

// Workspace Sync Commands
#[tauri::command]
async fn delete_collection_from_disk(workspace_path: String, collection_id: String) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&workspace_path)?;
    collections::workspace::delete_collection_from_disk(sanitized_path.to_string_lossy().to_string(), collection_id).await
}

#[tauri::command]
async fn save_collection_to_disk(workspace_path: String, collection: Collection) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&workspace_path)?;
    collections::workspace::save_collection_to_disk(sanitized_path.to_string_lossy().to_string(), collection).await
}

#[tauri::command]
async fn load_collections_from_workspace(workspace_path: String) -> Result<Vec<Collection>, String> {
    let sanitized_path = collections::utils::validate_workspace_path(&workspace_path)?;
    collections::workspace::load_collections_from_workspace(sanitized_path.to_string_lossy().to_string()).await
}

#[tauri::command]
async fn save_workspace_to_disk(workspace_path: String, environments: Vec<Environment>) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&workspace_path)?;
    collections::workspace::save_workspace_to_disk(sanitized_path.to_string_lossy().to_string(), environments).await
}

#[tauri::command]
async fn save_flows_to_disk(workspace_path: String, flows: Vec<crate::collections::types::Flow>) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&workspace_path)?;
    collections::workspace::save_flows_to_disk(sanitized_path.to_string_lossy().to_string(), flows).await
}

#[tauri::command]
async fn load_flows_from_workspace(workspace_path: String) -> Result<Vec<crate::collections::types::Flow>, String> {
    let sanitized_path = collections::utils::validate_workspace_path(&workspace_path)?;
    collections::workspace::load_flows_from_workspace(sanitized_path.to_string_lossy().to_string()).await
}

// Git Commands
#[tauri::command]
async fn git_init_repo(path: String) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    collections::git::git_init(sanitized_path.to_str().unwrap_or(&path))
}

#[tauri::command]
async fn get_git_status(path: String) -> Result<collections::git::GitStatus, String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    collections::git::git_status(sanitized_path.to_str().unwrap_or(&path))
}

#[tauri::command]
async fn git_commit_changes(path: String, message: String) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    collections::git::git_commit(sanitized_path.to_str().unwrap_or(&path), &message)
}

#[tauri::command]
async fn git_push_repo(path: String) -> Result<bool, String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    collections::git::git_push(sanitized_path.to_str().unwrap_or(&path))
}

#[tauri::command]
async fn git_pull_repo(path: String) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    collections::git::git_pull(sanitized_path.to_str().unwrap_or(&path))
}

#[tauri::command]
async fn git_add_remote(path: String, remote_name: String, remote_url: String) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    collections::git::git_add_remote(sanitized_path.to_str().unwrap_or(&path), &remote_name, &remote_url)
}

#[tauri::command]
async fn run_collection(
    collection: collections::types::Collection,
    environment: Option<collections::types::Environment>,
) -> Result<Vec<collections::runner::RunResult>, String> {
    let mut runner = collections::runner::CollectionRunner::new(collection, environment);
    Ok(runner.run_all().await)
}

#[tauri::command]
async fn get_user_settings() -> Result<UserSettings, String> {
    let path = crate::utils::get_pulse_data_dir().join("settings.json");
    if path.exists() {
        tokio::task::spawn_blocking(move || {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read settings: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse settings: {}", e))
        })
        .await
        .map_err(|e| e.to_string())?
    } else {
        Ok(UserSettings::default())
    }
}

#[tauri::command]
async fn save_user_settings(settings: UserSettings) -> Result<(), String> {
    let path = crate::utils::get_pulse_data_dir().join("settings.json");
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    tokio::task::spawn_blocking(move || {
        let mut old_email = None;
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(old_settings) = serde_json::from_str::<UserSettings>(&content) {
                    old_email = Some(old_settings.email.clone());
                }
            }
        }

        let json = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        std::fs::write(&path, json)
            .map_err(|e| format!("Failed to write settings: {}", e))?;

        let search_emails = vec![
            settings.email.clone(),
            "user@example.com".to_string(),
            old_email.unwrap_or_default(),
        ];

        if teams_path.exists() {
            if let Ok(mut teams) = crate::collections::team_loader::load_teams(&teams_path) {
                let mut changed = false;
                for team in teams.iter_mut() {
                    for member in team.members.iter_mut() {
                        let is_owner = team.owner_id == member.user_id;
                        let email_matches = search_emails.iter().any(|e| !e.is_empty() && e.eq_ignore_ascii_case(&member.email));
                        
                        if is_owner || email_matches {
                            if member.email != settings.email || member.name != settings.name {
                                member.email = settings.email.clone();
                                member.name = settings.name.clone();
                                changed = true;
                            }
                        }
                    }
                }
                if changed {
                    let _ = crate::collections::team_loader::save_teams(&teams, &teams_path);
                }
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn create_data_dir() -> Result<String, String> {
    let path = crate::utils::get_pulse_data_dir().clone();
    tokio::task::spawn_blocking(move || {
        let collections_path = path.join("collections");
        if !collections_path.exists() {
            std::fs::create_dir_all(&collections_path).map_err(|e| e.to_string())?;
        }
        Ok(path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_collections() -> Result<Vec<Collection>, String> {
    let collections_path = crate::utils::get_pulse_data_dir().join("collections");
    tokio::task::spawn_blocking(move || {
        loader::load_all_collections(collections_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn create_team(name: String, owner_email: String, owner_name: String) -> Result<Team, String> {
    log::info!("Creating team: {} for owner: {} ({})", name, owner_name, owner_email);
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    
    tokio::task::spawn_blocking(move || {
        let result = team_loader::create_team(
            teams_path.to_str().unwrap_or("teams.yaml"),
            name,
            uuid::Uuid::new_v4().to_string(),
            owner_email,
            owner_name,
        );
        
        if let Ok(ref team) = result {
            log::info!("Team created successfully with ID: {}", team.id);
        }
        
        result
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_teams() -> Result<Vec<Team>, String> {
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    let settings_path = crate::utils::get_pulse_data_dir().join("settings.json");
    tokio::task::spawn_blocking(move || {
        let mut teams = team_loader::load_teams(teams_path.to_str().unwrap_or("teams.yaml")).map_err(|e| e.to_string())?;
        
        // Synchronize current user settings into the teams list to keep member records up-to-date
        if settings_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&settings_path) {
                if let Ok(settings) = serde_json::from_str::<UserSettings>(&content) {
                    let mut changed = false;
                    let search_emails = vec![
                        settings.email.clone(),
                        "user@example.com".to_string(),
                    ];
                    for team in teams.iter_mut() {
                        for member in team.members.iter_mut() {
                            let is_owner = team.owner_id == member.user_id;
                            let email_matches = search_emails.iter().any(|e| !e.is_empty() && e.eq_ignore_ascii_case(&member.email));
                            
                            if is_owner || email_matches {
                                if member.email != settings.email || member.name != settings.name {
                                    member.email = settings.email.clone();
                                    member.name = settings.name.clone();
                                    changed = true;
                                }
                            }
                        }
                    }
                    if changed {
                        let _ = team_loader::save_teams(&teams, &teams_path);
                    }
                }
            }
        }
        
        Ok(teams)
    })
    .await
    .map_err(|e| e.to_string())?
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
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    let invitations_path = crate::utils::get_pulse_data_dir().join("invitations.json");
    
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
async fn get_pending_invitations() -> Result<Vec<Invitation>, String> {
    let invitations_path = crate::utils::get_pulse_data_dir().join("invitations.json");
    tokio::task::spawn_blocking(move || {
        team_loader::get_pending_invitations(invitations_path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_all_invitations() -> Result<Vec<Invitation>, String> {
    let invitations_path = crate::utils::get_pulse_data_dir().join("invitations.json");
    tokio::task::spawn_blocking(move || {
        team_loader::load_invitations(invitations_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn accept_invitation(invitation_id: String) -> Result<(), String> {
    let invitations_path = crate::utils::get_pulse_data_dir().join("invitations.json");
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    let settings = get_user_settings().await?;
    
    tokio::task::spawn_blocking(move || {
        team_loader::accept_invitation(
            invitations_path,
            teams_path.to_str().unwrap_or("teams.yaml"),
            invitation_id,
            uuid::Uuid::new_v4().to_string(),
            settings.email,
            settings.name,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn decline_invitation(invitation_id: String) -> Result<(), String> {
    let invitations_path = crate::utils::get_pulse_data_dir().join("invitations.json");
    tokio::task::spawn_blocking(move || {
        team_loader::decline_invitation(invitations_path, invitation_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn rename_team(team_id: String, new_name: String) -> Result<(), String> {
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    tokio::task::spawn_blocking(move || {
        team_loader::rename_team(teams_path.to_str().unwrap_or("teams.yaml"), team_id, new_name)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_team(team_id: String) -> Result<(), String> {
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    tokio::task::spawn_blocking(move || {
        team_loader::delete_team(teams_path.to_str().unwrap_or("teams.yaml"), team_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn pin_team(team_id: String, pinned: bool) -> Result<(), String> {
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    tokio::task::spawn_blocking(move || {
        team_loader::pin_team(teams_path.to_str().unwrap_or("teams.yaml"), team_id, pinned)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn remove_team_member(team_id: String, user_id: String) -> Result<(), String> {
    let teams_path = crate::utils::get_pulse_data_dir().join("teams.yaml");
    tokio::task::spawn_blocking(move || {
        team_loader::remove_member(teams_path.to_str().unwrap_or("teams.yaml"), team_id, user_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn write_file_content(path: String, file_path: String, content: String) -> Result<(), String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    let full_path = collections::utils::validate_sub_path(&sanitized_path, &file_path)?;
    std::fs::write(full_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_conflicted_file(path: String, file_path: String, stage: u8) -> Result<String, String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    let _ = collections::utils::validate_sub_path(&sanitized_path, &file_path)?;
    let path_str = sanitized_path.to_str().unwrap_or(&path);
    
    let output = std::process::Command::new("git")
        .args(["show", &format!(":{}:{}", stage, file_path)])
        .current_dir(path_str)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
async fn get_github_repo_info(path: String) -> Result<Option<(String, String)>, String> {
    let sanitized_path = collections::utils::validate_workspace_path(&path)?;
    let path_str = sanitized_path.to_string_lossy().into_owned();
    
    tokio::task::spawn_blocking(move || {
        if let Some(url) = crate::collections::git::get_remote_url(&path_str) {
            Ok(parse_github_remote(&url))
        } else {
            Ok(None)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

fn parse_github_remote(url: &str) -> Option<(String, String)> {
    let url = url.trim();
    if url.contains("github.com") {
        if url.starts_with("git@") {
            let parts: Vec<&str> = url.split(':').collect();
            if parts.len() == 2 {
                let repo_part = parts[1].trim_end_matches(".git");
                let subparts: Vec<&str> = repo_part.split('/').collect();
                if subparts.len() == 2 {
                    return Some((subparts[0].to_string(), subparts[1].to_string()));
                }
            }
        } else if url.starts_with("https://") || url.starts_with("http://") {
            let clean_url = url.trim_start_matches("https://").trim_start_matches("http://");
            let parts: Vec<&str> = clean_url.split('/').collect();
            if parts.len() >= 3 && parts[0].contains("github.com") {
                let repo = parts[2].trim_end_matches(".git");
                return Some((parts[1].to_string(), repo.to_string()));
            }
        }
    }
    None
}

#[tauri::command]
async fn get_github_collaborators(
    token: String,
    owner: String,
    repo: String,
) -> Result<Vec<collections::team::TeamMember>, String> {
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/{}/collaborators", owner, repo);
    
    let res = client
        .get(&url)
        .header("Authorization", format!("token {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "pulse-api-client")
        .send()
        .await
        .map_err(|e| format!("Failed to send GitHub request: {}", e))?;
        
    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("GitHub API error: {}", err_body));
    }
    
    #[derive(Deserialize)]
    struct GithubCollaboratorResponse {
        id: u64,
        login: String,
        #[allow(dead_code)]
        avatar_url: String,
        permissions: Option<serde_json::Value>,
    }
    
    let github_members: Vec<GithubCollaboratorResponse> = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;
        
    let mut members = Vec::new();
    for gm in github_members {
        let is_admin = gm.permissions
            .as_ref()
            .and_then(|p| p.get("admin"))
            .and_then(|a| a.as_bool())
            .unwrap_or(false);
            
        let role = if gm.login.eq_ignore_ascii_case(&owner) {
            collections::team::TeamRole::Owner
        } else if is_admin {
            collections::team::TeamRole::Admin
        } else {
            collections::team::TeamRole::Member
        };
        
        members.push(collections::team::TeamMember {
            user_id: gm.id.to_string(),
            email: gm.login.clone(),
            name: gm.login,
            role,
            joined_at: chrono::Utc::now(),
        });
    }
    
    Ok(members)
}

#[tauri::command]
async fn get_github_invitations(
    token: String,
    owner: String,
    repo: String,
) -> Result<Vec<collections::team::Invitation>, String> {
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/{}/invitations", owner, repo);
    
    let res = client
        .get(&url)
        .header("Authorization", format!("token {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "pulse-api-client")
        .send()
        .await
        .map_err(|e| format!("Failed to send GitHub request: {}", e))?;
        
    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("GitHub API error: {}", err_body));
    }
    
    #[derive(Deserialize)]
    struct GithubInvitee {
        login: String,
    }
    #[derive(Deserialize)]
    struct GithubInviter {
        login: String,
    }
    #[derive(Deserialize)]
    struct GithubInvitationResponse {
        id: u64,
        invitee: GithubInvitee,
        inviter: GithubInviter,
        created_at: String,
        permissions: String,
    }
    
    let github_invites: Vec<GithubInvitationResponse> = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;
        
    let mut invites = Vec::new();
    for gi in github_invites {
        let role = if gi.permissions == "admin" {
            collections::team::TeamRole::Admin
        } else {
            collections::team::TeamRole::Member
        };
        
        let created_at = chrono::DateTime::parse_from_rfc3339(&gi.created_at)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
            
        invites.push(collections::team::Invitation {
            id: gi.id.to_string(),
            team_id: repo.clone(),
            team_name: repo.clone(),
            email: gi.invitee.login,
            role,
            status: collections::team::InvitationStatus::Pending,
            invited_by: gi.inviter.login,
            invited_at: created_at,
            expires_at: created_at + chrono::Duration::days(7),
            accepted_at: None,
        });
    }
    
    Ok(invites)
}

#[tauri::command]
async fn invite_github_collaborator(
    token: String,
    owner: String,
    repo: String,
    username: String,
    role: String,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/{}/collaborators/{}", owner, repo, username);
    
    let github_permission = match role.to_lowercase().as_str() {
        "admin" => "admin",
        "member" => "push",
        _ => "push",
    };
    
    let body = serde_json::json!({
        "permission": github_permission
    });
    
    let res = client
        .put(&url)
        .header("Authorization", format!("token {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "pulse-api-client")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to send GitHub request: {}", e))?;
        
    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("GitHub API error: {}", err_body));
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = crate::utils::get_pulse_data_dir();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            import_openapi_spec,
            get_user_settings,
            save_user_settings,
            create_team,
            get_teams,
            invite_to_team,
            get_pending_invitations,
            get_all_invitations,
            accept_invitation,
            decline_invitation,
            rename_team,
            delete_team,
            pin_team,
            remove_team_member,
            load_collections,
            create_data_dir,
            delete_collection_from_disk,
            save_collection_to_disk,
            load_collections_from_workspace,
            save_workspace_to_disk,
            git_init_repo,
            get_git_status,
            git_commit_changes,
            git_push_repo,
            git_pull_repo,
            git_add_remote,
            run_collection,
            collections::git::get_git_diff,
            collections::git::git_discard_changes,
            collections::git::git_resolve_conflict,
            collections::git::git_rebase_continue,
            collections::git::git_rebase_abort,
            collections::git::git_update_presence,
            collections::git::git_get_presence,
            collections::git::git_get_activity_log,
            collections::flow_runner::run_flow,
            save_flows_to_disk,
            load_flows_from_workspace,
            start_mock_server,
            stop_mock_server,
            load_mock_servers,
            save_mock_servers,
            get_running_mock_servers,
            save_workspace_mock_servers,
            load_workspace_mock_servers,
            script_runner::run_script,
            search::fuzzy_search,
            read_conflicted_file,
            write_file_content,
            get_github_repo_info,
            get_github_collaborators,
            get_github_invitations,
            invite_github_collaborator,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod security_tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_d1_01_path_traversal() {
        let workspace = std::env::current_dir().unwrap();
        let result = collections::utils::validate_sub_path(&workspace, "../../.ssh/test.txt");
        assert!(result.is_err());
        let err_msg = result.unwrap_err();
        assert!(err_msg.contains("traversal") || err_msg.contains("escapes"));
    }

    #[test]
    fn test_d4_01_script_timeout() {
        let context = script_runner::ScriptContext {
            environment: HashMap::new(),
            collection: HashMap::new(),
            request: script_runner::RequestInfo {
                url: "http://localhost".to_string(),
                method: "GET".to_string(),
                headers: HashMap::new(),
            },
            response: None,
        };
        let start = std::time::Instant::now();
        let result = script_runner::run_script("while(true){}".to_string(), context);
        let elapsed = start.elapsed().as_secs();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Script execution timed out after 5 seconds");
        assert!(elapsed >= 5 && elapsed < 10);
    }
}
