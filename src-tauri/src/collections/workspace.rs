use std::fs;
use std::path::{Path, PathBuf};
use crate::collections::types::{Collection, Folder, Request, Environment};
use serde_json;

pub async fn delete_collection_from_disk(workspace_path: String, collection_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let collections_dir = PathBuf::from(workspace_path).join("collections");
        if !collections_dir.exists() {
            return Ok(());
        }

        // 1. Delete direct folder matching the ID if it exists
        let direct_path = collections_dir.join(&collection_id);
        if direct_path.exists() {
            if let Err(e) = fs::remove_dir_all(&direct_path) {
                eprintln!("Failed to delete direct collection path: {}", e);
            }
        }

        // 2. Scan all entries to find any folders or files with matching ID inside their metadata
        if let Ok(entries) = fs::read_dir(&collections_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let meta_file = path.join("collection.json");
                    if meta_file.exists() {
                        if let Ok(content) = fs::read_to_string(&meta_file) {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                                if let Some(id) = val.get("id").and_then(|v| v.as_str()) {
                                    if id == collection_id {
                                        if let Err(e) = fs::remove_dir_all(&path) {
                                            eprintln!("Failed to delete matching collection path {:?}: {}", path, e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if path.is_file() {
                    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                        if ext == "json" || ext == "yaml" || ext == "yml" {
                            if let Ok(content) = fs::read_to_string(&path) {
                                let matches = if ext == "json" {
                                    serde_json::from_str::<serde_json::Value>(&content)
                                        .ok()
                                        .and_then(|val| val.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                                } else {
                                    serde_yaml::from_str::<serde_yaml::Value>(&content)
                                        .ok()
                                        .and_then(|val| val.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                                };
                                
                                if let Some(id) = matches {
                                    if id == collection_id {
                                        if let Err(e) = fs::remove_file(&path) {
                                            eprintln!("Failed to delete matching collection file {:?}: {}", path, e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }).await.map_err(|e| e.to_string())?
}

pub async fn save_collection_to_disk(workspace_path: String, collection: Collection) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let base_path = PathBuf::from(workspace_path);
        let collections_dir = base_path.join("collections");
        
        // Use ID for the folder name to prevent duplicates on rename
        let collection_path = collections_dir.join(&collection.id);
        
        // Nuke the existing directory if it exists to clear out deleted items (folders/requests)
        if collection_path.exists() {
            fs::remove_dir_all(&collection_path).map_err(|e| e.to_string())?;
        }
        fs::create_dir_all(&collection_path).map_err(|e| e.to_string())?;

        // collection.json holds variables and description
        let mut collection_meta = collection.clone();
        collection_meta.requests = vec![];
        collection_meta.folders = vec![];
        
        let meta_json = serde_json::to_string_pretty(&collection_meta).map_err(|e| e.to_string())?;
        fs::write(collection_path.join("collection.json"), meta_json).map_err(|e| e.to_string())?;

        // Root requests
        for request in &collection.requests {
            save_request_to_disk(&collection_path, request)?;
        }

        // Folders
        for folder in &collection.folders {
            save_folder_to_disk(&collection_path, folder)?;
        }

        Ok(())
    }).await.map_err(|e| e.to_string())?
}

fn save_folder_to_disk(parent_path: &Path, folder: &Folder) -> Result<(), String> {
    // For internal folders, we still use names but we should probably use IDs here too eventually
    // but the main issue is the top-level collection renaming.
    let folder_path = parent_path.join(&folder.id);
    fs::create_dir_all(&folder_path).map_err(|e| e.to_string())?;

    let mut folder_meta = folder.clone();
    folder_meta.requests = vec![];
    folder_meta.folders = None;
    
    let meta_json = serde_json::to_string_pretty(&folder_meta).map_err(|e| e.to_string())?;
    fs::write(folder_path.join("folder.json"), meta_json).map_err(|e| e.to_string())?;

    for request in &folder.requests {
        save_request_to_disk(&folder_path, request)?;
    }

    if let Some(folders) = &folder.folders {
        for subfolder in folders {
            save_folder_to_disk(&folder_path, subfolder)?;
        }
    }

    Ok(())
}

fn save_request_to_disk(parent_path: &Path, request: &Request) -> Result<(), String> {
    // Use ID for filename to prevent duplicates on rename
    let filename = format!("{}.json", request.id);
    let request_json = serde_json::to_string_pretty(request).map_err(|e| e.to_string())?;
    fs::write(parent_path.join(filename), request_json).map_err(|e| e.to_string())?;
    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    name.chars().map(|c| {
        if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' {
            c
        } else {
            '_'
        }
    }).collect()
}

pub async fn load_collections_from_workspace(workspace_path: String) -> Result<Vec<Collection>, String> {
    // Loading is usually fine to stay on async executor as it's less frequent, 
    // but for consistency we can also offload it if needed.
    let collections_dir = PathBuf::from(workspace_path).join("collections");
    if !collections_dir.exists() {
        return Ok(vec![]);
    }

    let mut collections = vec![];
    for entry in fs::read_dir(collections_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().is_dir() {
            // Check if it's a valid collection (has collection.json)
            if entry.path().join("collection.json").exists() {
                collections.push(load_collection(&entry.path())?);
            }
        }
    }
    Ok(collections)
}

fn load_collection(path: &Path) -> Result<Collection, String> {
    let meta_content = fs::read_to_string(path.join("collection.json")).map_err(|e| e.to_string())?;
    let mut collection: Collection = serde_json::from_str(&meta_content).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let file_name = entry.file_name().into_string().unwrap_or_default();

        if entry_path.is_dir() {
            // Subfolders (using IDs now)
            if entry_path.join("folder.json").exists() {
                collection.folders.push(load_folder(&entry_path)?);
            }
        } else if file_name != "collection.json" && file_name.ends_with(".json") {
            let req_content = fs::read_to_string(&entry_path).map_err(|e| e.to_string())?;
            let request: Request = serde_json::from_str(&req_content).map_err(|e| e.to_string())?;
            collection.requests.push(request);
        }
    }

    Ok(collection)
}

fn load_folder(path: &Path) -> Result<Folder, String> {
    let meta_content = fs::read_to_string(path.join("folder.json")).map_err(|e| e.to_string())?;
    let mut folder: Folder = serde_json::from_str(&meta_content).map_err(|e| e.to_string())?;
    
    let mut subfolders = vec![];

    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let file_name = entry.file_name().into_string().unwrap_or_default();

        if entry_path.is_dir() {
            if entry_path.join("folder.json").exists() {
                subfolders.push(load_folder(&entry_path)?);
            }
        } else if file_name != "folder.json" && file_name.ends_with(".json") {
            let req_content = fs::read_to_string(&entry_path).map_err(|e| e.to_string())?;
            let request: Request = serde_json::from_str(&req_content).map_err(|e| e.to_string())?;
            folder.requests.push(request);
        }
    }
    
    if !subfolders.is_empty() {
        folder.folders = Some(subfolders);
    }

    Ok(folder)
}

pub async fn save_workspace_to_disk(workspace_path: String, environments: Vec<Environment>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = PathBuf::from(workspace_path).join("workspace.json");
        let json = serde_json::to_string_pretty(&environments).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())?;
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

pub async fn save_flows_to_disk(workspace_path: String, flows: Vec<crate::collections::types::Flow>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let base_path = PathBuf::from(workspace_path);
        let flows_dir = base_path.join("flows");
        
        if !flows_dir.exists() {
            fs::create_dir_all(&flows_dir).map_err(|e| e.to_string())?;
        }

        for flow in flows {
            // Use ID for filename
            let filename = format!("{}.json", flow.id);
            let json = serde_json::to_string_pretty(&flow).map_err(|e| e.to_string())?;
            fs::write(flows_dir.join(filename), json).map_err(|e| e.to_string())?;
        }

        Ok(())
    }).await.map_err(|e| e.to_string())?
}

pub async fn load_flows_from_workspace(workspace_path: String) -> Result<Vec<crate::collections::types::Flow>, String> {
    let flows_dir = PathBuf::from(workspace_path).join("flows");
    if !flows_dir.exists() {
        return Ok(vec![]);
    }

    let mut flows = vec![];
    for entry in fs::read_dir(flows_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
            let flow: crate::collections::types::Flow = serde_json::from_str(&content).map_err(|e| e.to_string())?;
            flows.push(flow);
        }
    }
    
    Ok(flows)
}
