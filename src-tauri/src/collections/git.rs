use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;
use crate::collections::utils;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub has_changes: bool,
    pub untracked: Vec<String>,
    pub modified: Vec<String>,
    pub conflicted: Vec<String>,
    pub is_rebasing: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffLine {
    pub r#type: String, // "added", "removed", "equal"
    pub content: String,
}

fn has_remote(path: &str) -> bool {
    Command::new("git")
        .args(["remote"])
        .current_dir(path)
        .output()
        .map(|o| o.status.success() && !String::from_utf8_lossy(&o.stdout).trim().is_empty())
        .unwrap_or(false)
}

fn get_remote_url(path: &str) -> Option<String> {
    Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(path)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let url = String::from_utf8_lossy(&o.stdout).trim().to_string();
                if url.is_empty() {
                    None
                } else {
                    Some(url)
                }
            } else {
                None
            }
        })
}

pub fn git_init(path: &str) -> Result<(), String> {
    let output = Command::new("git")
        .arg("init")
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run git init: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

pub fn git_status(path: &str) -> Result<GitStatus, String> {
    let branch_output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to get current branch: {}", e))?;

    let branch = if branch_output.status.success() {
        String::from_utf8_lossy(&branch_output.stdout)
            .trim()
            .to_string()
    } else {
        "master".to_string()
    };

    let status_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to get git status: {}", e))?;

    if !status_output.status.success() {
        return Err(String::from_utf8_lossy(&status_output.stderr).to_string());
    }

    let status_str = String::from_utf8_lossy(&status_output.stdout);
    let mut untracked = vec![];
    let mut modified = vec![];
    let mut conflicted = vec![];

    for line in status_str.lines() {
        if line.len() > 3 {
            let status_code = &line[0..2];
            let file = line[3..].to_string();
            
            if matches!(status_code, "UU" | "AA" | "DD" | "AU" | "UA" | "DU" | "UD") {
                conflicted.push(file);
            } else if status_code == "??" {
                untracked.push(file);
            } else {
                modified.push(file);
            }
        }
    }
    
    let is_rebasing = Path::new(path).join(".git").join("rebase-merge").exists() || 
                      Path::new(path).join(".git").join("rebase-apply").exists();

    Ok(GitStatus {
        branch,
        has_changes: !status_str.is_empty(),
        untracked,
        modified,
        conflicted,
        is_rebasing,
    })
}

pub fn git_commit(path: &str, message: &str) -> Result<(), String> {
    // Security: Scan for sensitive patterns before allowing a commit
    scan_for_secrets(path)?;

    let add_output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to git add: {}", e))?;

    if !add_output.status.success() {
        return Err(String::from_utf8_lossy(&add_output.stderr).to_string());
    }

    let commit_output = Command::new("git")
        .args(["commit", "-m", message])
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to git commit: {}", e))?;

    if !commit_output.status.success() {
        return Err(String::from_utf8_lossy(&commit_output.stderr).to_string());
    }
    Ok(())
}

fn scan_for_secrets(path: &str) -> Result<(), String> {
    use std::fs;
    use regex::Regex;

    // Common sensitive patterns
    let patterns = [
        r"sk_live_[a-zA-Z0-9]{24,}", // Stripe live keys
        r"AIza[0-9A-Za-z\\-_]{35}",   // Google API keys
        r"xox[bpgr]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}", // Slack tokens
        r"ghp_[a-zA-Z0-9]{36}",      // GitHub PATs
        r"ey[a-zA-Z0-9-_]+\.ey[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+", // JWTs (generic)
    ];

    let mut regexes = Vec::new();
    for p in patterns {
        regexes.push(Regex::new(p).map_err(|e: regex::Error| e.to_string())?);
    }

    // List all json files in the workspace (collections and environments)
    let base_path = Path::new(path);
    let mut files_to_scan = Vec::new();

    fn collect_json_files(dir: &Path, files: &mut Vec<std::path::PathBuf>) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if dir_name != ".git" && dir_name != "node_modules" && dir_name != "target" {
                        collect_json_files(&path, files)?;
                    }
                } else if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    files.push(path);
                }
            }
        }
        Ok(())
    }

    collect_json_files(base_path, &mut files_to_scan).map_err(|e: std::io::Error| e.to_string())?;

    for file_path in files_to_scan {
        let content = fs::read_to_string(&file_path).map_err(|e: std::io::Error| e.to_string())?;
        
        for re in &regexes {
            if let Some(mat) = re.find(&content) {
                let file_name = file_path.strip_prefix(base_path).unwrap_or(&file_path).display();
                return Err(format!(
                    "SECURITY BLOCK: Sensitive data pattern '{}' detected in {}. Commit aborted to protect your secrets.", 
                    mat.as_str().chars().take(8).collect::<String>() + "...",
                    file_name
                ));
            }
        }
    }

    Ok(())
}

pub fn git_push(path: &str) -> Result<bool, String> {
    if !has_remote(path) {
        return Ok(false);
    }

    if get_remote_url(path).is_none() {
        return Ok(false);
    }

    let output = Command::new("git")
        .args(["push", "-u", "origin", "HEAD"])
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to git push: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(true)
}

pub fn git_pull(path: &str) -> Result<(), String> {
    if !has_remote(path) {
        return Err("No remote configured. Run: git remote add origin <url>".to_string());
    }

    if get_remote_url(path).is_none() {
        return Err(
            "Remote 'origin' exists but URL not set. Run: git remote add origin <url>".to_string(),
        );
    }

    let output = Command::new("git")
        .args(["pull", "--rebase", "origin", "HEAD"])
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to git pull: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        
        if err.contains("CONFLICT") || err.contains("Resolve all conflicts manually") {
            return Err("CONFLICT: Merge conflicts detected. Please resolve them.".to_string());
        }
        
        if err.contains("Could not read from remote repository")
            || err.contains("does not appear to be a git repository")
        {
            return Err(
                "Remote 'origin' exists but is not reachable. Check URL or permissions."
                    .to_string(),
            );
        }
        return Err(err);
    }
    Ok(())
}

pub fn git_add_remote(path: &str, remote_name: &str, remote_url: &str) -> Result<(), String> {
    if has_remote(path) {
        let output = Command::new("git")
            .args(["remote", "set-url", remote_name, remote_url])
            .current_dir(path)
            .output()
            .map_err(|e| format!("Failed to set remote URL: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
    } else {
        let output = Command::new("git")
            .args(["remote", "add", remote_name, remote_url])
            .current_dir(path)
            .output()
            .map_err(|e| format!("Failed to add remote: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_git_diff(path: String, file_path: String) -> Result<Vec<DiffLine>, String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    let _ = utils::validate_sub_path(&sanitized_path, &file_path)?;
    let path_str = sanitized_path.to_str().unwrap_or(&path);

    let output = Command::new("git")
        .args(["show", &format!("HEAD:{}", file_path)])
        .current_dir(path_str)
        .output();

    let old_content = if let Ok(o) = output {
        if o.status.success() {
            String::from_utf8_lossy(&o.stdout).to_string()
        } else {
            "".to_string()
        }
    } else {
        "".to_string()
    };

    let new_content = std::fs::read_to_string(std::path::Path::new(&path).join(&file_path))
        .map_err(|e| format!("Failed to read current file: {}", e))?;

    let mut diff_lines = vec![];

    for result in diff::lines(&old_content, &new_content) {
        match result {
            diff::Result::Left(l) => diff_lines.push(DiffLine {
                r#type: "removed".to_string(),
                content: l.to_string(),
            }),
            diff::Result::Both(l, _) => diff_lines.push(DiffLine {
                r#type: "equal".to_string(),
                content: l.to_string(),
            }),
            diff::Result::Right(r) => diff_lines.push(DiffLine {
                r#type: "added".to_string(),
                content: r.to_string(),
            }),
        }
    }

    Ok(diff_lines)
}

#[tauri::command]
pub async fn git_discard_changes(path: String, file_path: String) -> Result<(), String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    let _ = utils::validate_sub_path(&sanitized_path, &file_path)?;
    let path_str = sanitized_path.to_str().unwrap_or(&path);

    let output = Command::new("git")
        .args(["checkout", "--", &file_path])
        .current_dir(path_str)
        .output()
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn git_resolve_conflict(path: String, file_path: String, resolution: String) -> Result<(), String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    let _ = utils::validate_sub_path(&sanitized_path, &file_path)?;
    let path_str = sanitized_path.to_str().unwrap_or(&path);

    let strategy = match resolution.as_str() {
        "ours" => "--ours",
        "theirs" => "--theirs",
        _ => return Err("Invalid resolution strategy. Use 'ours' or 'theirs'.".to_string()),
    };

    let checkout_output = Command::new("git")
        .args(["checkout", strategy, &file_path])
        .current_dir(path_str)
        .output()
        .map_err(|e| format!("Failed to checkout {}: {}", strategy, e))?;

    if !checkout_output.status.success() {
        return Err(String::from_utf8_lossy(&checkout_output.stderr).to_string());
    }

    let add_output = Command::new("git")
        .args(["add", &file_path])
        .current_dir(path_str)
        .output()
        .map_err(|e| format!("Failed to git add resolved file: {}", e))?;

    if !add_output.status.success() {
        return Err(String::from_utf8_lossy(&add_output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn git_rebase_continue(path: String) -> Result<(), String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    let path_str = sanitized_path.to_str().unwrap_or(&path);

    let output = Command::new("git")
        .args(["rebase", "--continue"])
        .env("GIT_EDITOR", "true")
        .current_dir(path_str)
        .output()
        .map_err(|e| format!("Failed to run git rebase --continue: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn git_get_activity_log(path: String) -> Result<Vec<serde_json::Value>, String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    let path_str = sanitized_path.to_str().unwrap_or(&path);

    let output = Command::new("git")
        .args(&["log", "-n", "50", "--pretty=format:%H|%an|%ae|%ar|%s"])
        .current_dir(path_str)
        .output()
        .map_err(|e| format!("Failed to run git log: {}", e))?;

    if !output.status.success() {
        // If not a git repo or no commits, return empty
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut logs = vec![];

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() == 5 {
            logs.push(serde_json::json!({
                "hash": parts[0],
                "author_name": parts[1],
                "author_email": parts[2],
                "relative_time": parts[3],
                "message": parts[4],
            }));
        }
    }

    Ok(logs)
}

#[tauri::command]
pub async fn git_update_presence(path: String, email: String, item_id: String) -> Result<(), String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    
    let presence_dir = sanitized_path.join(".pulse").join("presence");
    std::fs::create_dir_all(&presence_dir).map_err(|e| e.to_string())?;

    let presence_file = presence_dir.join(format!("{}.json", email.replace("@", "_").replace(".", "_")));
    let data = serde_json::json!({
        "email": email,
        "item_id": item_id,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    std::fs::write(presence_file, serde_json::to_string(&data).unwrap())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn git_get_presence(path: String) -> Result<Vec<serde_json::Value>, String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    
    let presence_dir = sanitized_path.join(".pulse").join("presence");
    if !presence_dir.exists() {
        return Ok(vec![]);
    }

    let mut presence_list = vec![];
    let entries = std::fs::read_dir(presence_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
            let content = std::fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                presence_list.push(val);
            }
        }
    }

    Ok(presence_list)
}

#[tauri::command]
pub async fn git_rebase_abort(path: String) -> Result<(), String> {
    let sanitized_path = utils::validate_workspace_path(&path)?;
    let path_str = sanitized_path.to_str().unwrap_or(&path);

    let output = Command::new("git")
        .args(["rebase", "--abort"])
        .current_dir(path_str)
        .output()
        .map_err(|e| format!("Failed to run git rebase --abort: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}
