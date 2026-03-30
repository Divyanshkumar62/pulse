use std::fs;
use std::path::Path;

use crate::collections::types::{Collection, Environment, HistoryEntry};

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

pub fn load_all_collections<P: AsRef<Path>>(dir: P) -> Result<Vec<Collection>, Box<dyn std::error::Error>> {
    let mut collections = Vec::new();
    if !dir.as_ref().exists() {
        return Ok(collections);
    }

    for entry in fs::read_dir(dir)? {
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
        }
    }
    Ok(collections)
}
