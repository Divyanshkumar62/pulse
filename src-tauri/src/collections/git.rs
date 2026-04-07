use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub has_changes: bool,
    pub untracked: Vec<String>,
    pub modified: Vec<String>,
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

    for line in status_str.lines() {
        if line.len() > 3 {
            let file = line[3..].to_string();
            if line.starts_with("??") {
                untracked.push(file);
            } else {
                modified.push(file);
            }
        }
    }

    Ok(GitStatus {
        branch,
        has_changes: !status_str.is_empty(),
        untracked,
        modified,
    })
}

pub fn git_commit(path: &str, message: &str) -> Result<(), String> {
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
        return Err("Remote 'origin' exists but URL not set. Run: git remote add origin <url>".to_string());
    }

    let output = Command::new("git")
        .args(["pull", "--rebase", "origin", "HEAD"])
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to git pull: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        if err.contains("Could not read from remote repository") || err.contains("does not appear to be a git repository") {
            return Err("Remote 'origin' exists but is not reachable. Check URL or permissions.".to_string());
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
