use std::fs;
use std::path::Path;

use crate::collections::types::{Collection, Environment, HistoryEntry, Folder, Request};

pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Collection, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(&path)?;

    match path.as_ref().extension().and_then(|e| e.to_str()) {
        Some("json") => {
            let collection: Collection = serde_json::from_str(&content)?;
            Ok(collection)
        }
        _ => {
            let collection: Collection = serde_yaml::from_str(&content)?;
            Ok(collection)
        }
    }
}

pub fn save_to_file(
    collection: &Collection,
    path: impl AsRef<Path>,
) -> Result<(), Box<dyn std::error::Error>> {
    let yaml = serde_yaml::to_string(collection)?;
    fs::write(path, yaml)?;
    Ok(())
}

pub fn load_environments(
    path: impl AsRef<Path>,
) -> Result<Vec<Environment>, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    let envs: Vec<Environment> = serde_yaml::from_str(&content)?;
    Ok(envs)
}

pub fn save_environments(
    environments: &[Environment],
    path: impl AsRef<Path>,
) -> Result<(), Box<dyn std::error::Error>> {
    let yaml = serde_yaml::to_string(environments)?;
    fs::write(path, yaml)?;
    Ok(())
}

pub fn load_history(
    path: impl AsRef<Path>,
) -> Result<Vec<HistoryEntry>, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    let history: Vec<HistoryEntry> = serde_json::from_str(&content)?;
    Ok(history)
}

pub fn save_history(
    history: &[HistoryEntry],
    path: impl AsRef<Path>,
) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(history)?;
    fs::write(path, json)?;
    Ok(())
}

pub fn import_postman(path: impl AsRef<Path>) -> Result<Collection, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    crate::collections::postman::import_collection(&content).map_err(|e| {
        Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e))
            as Box<dyn std::error::Error>
    })
}

pub fn import_openapi(path: impl AsRef<Path>) -> Result<Collection, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    crate::collections::openapi::import_openapi(&content).map_err(|e| {
        Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e))
            as Box<dyn std::error::Error>
    })
}

pub fn load_all_collections<P: AsRef<Path>>(dir: P) -> Result<Vec<Collection>, Box<dyn std::error::Error>> {
    let mut collections = Vec::new();
    let dir_path = dir.as_ref();
    if !dir_path.exists() {
        return Ok(collections);
    }

    for entry in fs::read_dir(dir_path)? {
        let entry = entry?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if ext == "json" || ext == "yaml" || ext == "yml" {
                    if let Ok(collection) = load_from_file(&path) {
                        collections.push(collection);
                    }
                }
            }
        } else if path.is_dir() {
            // Check if it's a "New Style" folder-based collection
            if path.join("collection.json").exists() {
                if let Ok(collection) = load_folder_collection(&path) {
                    collections.push(collection);
                }
            }
        }
    }
    Ok(collections)
}

// Helper for folder-based collections
fn load_folder_collection(path: &Path) -> Result<Collection, Box<dyn std::error::Error>> {
    let meta_content = fs::read_to_string(path.join("collection.json"))?;
    let mut collection: Collection = serde_json::from_str(&meta_content)?;

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_name = entry.file_name().into_string().unwrap_or_default();

        if entry_path.is_dir() {
            if entry_path.join("folder.json").exists() {
                collection.folders.push(load_folder_structure(&entry_path)?);
            }
        } else if file_name != "collection.json" && file_name.ends_with(".json") {
            let req_content = fs::read_to_string(&entry_path)?;
            let request: Request = serde_json::from_str(&req_content)?;
            collection.requests.push(request);
        }
    }

    Ok(collection)
}

fn load_folder_structure(path: &Path) -> Result<Folder, Box<dyn std::error::Error>> {
    let meta_content = fs::read_to_string(path.join("folder.json"))?;
    let mut folder: Folder = serde_json::from_str(&meta_content)?;
    
    let mut subfolders = vec![];

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_name = entry.file_name().into_string().unwrap_or_default();

        if entry_path.is_dir() {
            if entry_path.join("folder.json").exists() {
                subfolders.push(load_folder_structure(&entry_path)?);
            }
        } else if file_name != "folder.json" && file_name.ends_with(".json") {
            let req_content = fs::read_to_string(&entry_path)?;
            let request: Request = serde_json::from_str(&req_content)?;
            folder.requests.push(request);
        }
    }
    
    if !subfolders.is_empty() {
        folder.folders = Some(subfolders);
    }

    Ok(folder)
}
