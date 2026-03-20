use std::fs;
use std::path::Path;

use crate::collections::types::Collection;

pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Collection, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    let collection: Collection = serde_yaml::from_str(&content)?;
    Ok(collection)
}

pub fn save_to_file<P: AsRef<Path>>(
    collection: &Collection,
    path: P,
) -> Result<(), Box<dyn std::error::Error>> {
    let yaml = serde_yaml::to_string(collection)?;
    fs::write(path, yaml)?;
    Ok(())
}
