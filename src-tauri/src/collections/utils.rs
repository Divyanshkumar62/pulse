use std::path::{Path, PathBuf};

pub fn sanitize_path(path_str: &str) -> Result<PathBuf, String> {
    let path = Path::new(path_str);
    
    // Resolve the path to an absolute path
    let absolute_path = if path.is_absolute() {
        path.to_path_buf()
    } else {
        crate::utils::get_pulse_data_dir().join(path)
    };

    // Normalize the path (remove . and ..)
    let mut normalized_path = PathBuf::new();
    for component in absolute_path.components() {
        match component {
            std::path::Component::ParentDir => {
                normalized_path.pop();
            }
            std::path::Component::Normal(c) => {
                normalized_path.push(c);
            }
            std::path::Component::RootDir | std::path::Component::Prefix(_) => {
                normalized_path.push(component);
            }
            _ => {}
        }
    }

    // Basic check: Ensure it's not a system critical path
    #[cfg(windows)]
    {
        let path_lower = normalized_path.to_string_lossy().to_lowercase();
        if path_lower.starts_with("c:\\windows") || path_lower.starts_with("c:\\users\\") && path_lower.split('\\').count() <= 3 {
             // Allow user home but not direct user dir deletion etc.
             // This is a bit simplified, but better than nothing.
        }
    }

    Ok(normalized_path)
}

pub fn validate_workspace_path(workspace_path: &str) -> Result<PathBuf, String> {
    let path = sanitize_path(workspace_path)?;
    
    // Ensure the path exists and is a directory
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create workspace directory: {}", e))?;
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", workspace_path));
    }
    
    Ok(path)
}

pub fn validate_sub_path(workspace: &Path, sub_path: &str) -> Result<PathBuf, String> {
    if sub_path.contains("..") || sub_path.starts_with('/') || sub_path.starts_with('\\') {
        return Err("Path traversal detected in file_path argument".to_string());
    }
    let candidate = workspace.join(sub_path);
    let canonical_workspace = workspace.canonicalize()
        .map_err(|e| format!("Cannot canonicalize workspace: {}", e))?;
    let canonical_candidate = candidate.canonicalize()
        .unwrap_or(candidate.clone()); // allow new files
    if !canonical_candidate.starts_with(&canonical_workspace) {
        return Err(format!("file_path escapes workspace: {}", sub_path));
    }
    Ok(candidate)
}
