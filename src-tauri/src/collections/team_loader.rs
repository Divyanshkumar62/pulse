use chrono::Utc;
use std::fs;
use std::path::Path;

use crate::collections::team::{Invitation, InvitationStatus, Team, TeamRole};
use crate::collections::types::{Environment, HistoryEntry};

pub fn load_teams<P: AsRef<Path>>(path: P) -> Result<Vec<Team>, Box<dyn std::error::Error>> {
    log::info!("[Pulse Backend] [Command: team_loader::load_teams] Status: Started | Details: path={}", path.as_ref().display());
    let content = fs::read_to_string(&path)?;
    let teams: Vec<Team> = serde_yaml::from_str(&content)?;
    log::info!("[Pulse Backend] [Command: team_loader::load_teams] Status: Success | Details: loaded {} teams", teams.len());
    Ok(teams)
}

pub fn save_teams<P: AsRef<Path>>(
    teams: &[Team],
    path: P,
) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("[Pulse Backend] [Command: team_loader::save_teams] Status: Started | Details: path={}, items={}", path.as_ref().display(), teams.len());
    let yaml = serde_yaml::to_string(teams)?;
    fs::write(&path, yaml)?;
    log::info!("[Pulse Backend] [Command: team_loader::save_teams] Status: Success");
    Ok(())
}

pub fn load_invitations<P: AsRef<Path>>(
    path: P,
) -> Result<Vec<Invitation>, Box<dyn std::error::Error>> {
    log::info!("[Pulse Backend] [Command: team_loader::load_invitations] Status: Started | Details: path={}", path.as_ref().display());
    let content = fs::read_to_string(&path)?;
    let invitations: Vec<Invitation> = serde_json::from_str(&content)?;
    log::info!("[Pulse Backend] [Command: team_loader::load_invitations] Status: Success | Details: loaded {} invitations", invitations.len());
    Ok(invitations)
}

pub fn save_invitations<P: AsRef<Path>>(
    invitations: &[Invitation],
    path: P,
) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("[Pulse Backend] [Command: team_loader::save_invitations] Status: Started | Details: path={}, items={}", path.as_ref().display(), invitations.len());
    let json = serde_json::to_string_pretty(invitations)?;
    fs::write(&path, json)?;
    log::info!("[Pulse Backend] [Command: team_loader::save_invitations] Status: Success");
    Ok(())
}

pub fn create_team(
    teams_path: &str,
    name: String,
    owner_id: String,
    owner_email: String,
    owner_name: String,
) -> Result<Team, String> {
    log::info!("[Pulse Backend] [Command: team_loader::create_team] Status: Started | Details: name='{}', owner='{}'", name, owner_name);
    let teams = load_teams(teams_path).unwrap_or_default();

    let team = Team::new(name, owner_id, owner_email, owner_name);
    let mut updated_teams = teams;
    updated_teams.push(team.clone());

    match save_teams(&updated_teams, teams_path) {
        Ok(_) => {
            log::info!("[Pulse Backend] [Command: team_loader::create_team] Status: Success | Details: team_id={}", team.id);
            Ok(team)
        }
        Err(e) => {
            log::error!("[Pulse Backend] [Command: team_loader::create_team] Status: Error | Details: {}", e);
            Err(e.to_string())
        }
    }
}

pub fn invite_to_team(
    teams_path: &str,
    invitations_path: &str,
    team_id: String,
    team_name: String,
    email: String,
    role: TeamRole,
    invited_by: String,
    invited_by_name: String,
) -> Result<Invitation, String> {
    log::info!("[Pulse Backend] [Command: team_loader::invite_to_team] Status: Started | Details: team_id='{}', email='{}'", team_id, email);
    let invitations = load_invitations(invitations_path).unwrap_or_default();

    // Allow re-sending invitations (create new one even if existing)
    let invitation = Invitation::new(team_id, team_name, email, role, invited_by, invited_by_name);
    let mut updated = invitations;
    updated.push(invitation.clone());

    match save_invitations(&updated, invitations_path) {
        Ok(_) => {
            log::info!("[Pulse Backend] [Command: team_loader::invite_to_team] Status: Success | Details: invitation_id={}", invitation.id);
            Ok(invitation)
        }
        Err(e) => {
            log::error!("[Pulse Backend] [Command: team_loader::invite_to_team] Status: Error | Details: {}", e);
            Err(e.to_string())
        }
    }
}

pub fn get_pending_invitations<P: AsRef<Path>>(path: P) -> Result<Vec<Invitation>, String> {
    log::info!("[Pulse Backend] [Command: team_loader::get_pending_invitations] Status: Started");
    let invitations = load_invitations(path).map_err(|e| {
        log::error!("[Pulse Backend] [Command: team_loader::get_pending_invitations] Status: Error | Details: {}", e);
        e.to_string()
    })?;
    
    let pending: Vec<Invitation> = invitations
        .into_iter()
        .filter(|i| matches!(i.status, InvitationStatus::Pending))
        .collect();
        
    log::info!("[Pulse Backend] [Command: team_loader::get_pending_invitations] Status: Success | Details: found {} pending", pending.len());
    Ok(pending)
}

pub fn accept_invitation<P: AsRef<Path>>(
    invitations_path: P,
    teams_path: &str,
    invitation_id: String,
    user_id: String,
    user_email: String,
    user_name: String,
) -> Result<(), String> {
    log::info!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Started | Details: invitation_id='{}', user_id='{}'", invitation_id, user_id);
    let mut invitations = load_invitations(&invitations_path).map_err(|e| {
        log::error!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Error | Details: Failed to load invitations: {}", e);
        e.to_string()
    })?;

    let invitation = invitations
        .iter_mut()
        .find(|i| i.id == invitation_id)
        .ok_or_else(|| {
            log::error!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Error | Details: Invitation not found");
            "Invitation not found".to_string()
        })?;

    if Utc::now() > invitation.expires_at {
        invitation.status = InvitationStatus::Expired;
        let _ = save_invitations(&invitations, &invitations_path);
        log::error!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Error | Details: Invitation has expired");
        return Err("Invitation has expired".to_string());
    }

    invitation.status = InvitationStatus::Accepted;
    invitation.accepted_at = Some(Utc::now());

    let mut teams = load_teams(teams_path).unwrap_or_default();
    if let Some(team) = teams.iter_mut().find(|t| t.id == invitation.team_id) {
        team.members.push(crate::collections::team::TeamMember {
            user_id,
            email: user_email,
            name: user_name,
            role: match invitation.role {
                TeamRole::Owner => TeamRole::Owner,
                TeamRole::Admin => TeamRole::Admin,
                TeamRole::Member => TeamRole::Member,
            },
            joined_at: Utc::now(),
        });
        if let Err(e) = save_teams(&teams, teams_path) {
            log::error!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Error | Details: Failed to save teams: {}", e);
            return Err(e.to_string());
        }
    } else {
         log::error!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Error | Details: Team not found");
         return Err("Team not found".to_string());
    }

    if let Err(e) = save_invitations(&invitations, &invitations_path) {
         log::error!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Error | Details: Failed to save invitations: {}", e);
         return Err(e.to_string());
    }

    log::info!("[Pulse Backend] [Command: team_loader::accept_invitation] Status: Success");
    Ok(())
}

pub fn decline_invitation<P: AsRef<Path>>(path: P, invitation_id: String) -> Result<(), String> {
    log::info!("[Pulse Backend] [Command: team_loader::decline_invitation] Status: Started | Details: invitation_id='{}'", invitation_id);
    let mut invitations = load_invitations(&path).map_err(|e| {
        log::error!("[Pulse Backend] [Command: team_loader::decline_invitation] Status: Error | Details: Failed to load invitations: {}", e);
        e.to_string()
    })?;

    if let Some(invitation) = invitations.iter_mut().find(|i| i.id == invitation_id) {
        invitation.status = InvitationStatus::Declined;
    } else {
        log::error!("[Pulse Backend] [Command: team_loader::decline_invitation] Status: Error | Details: Invitation not found");
        return Err("Invitation not found".to_string());
    }

    if let Err(e) = save_invitations(&invitations, &path) {
         log::error!("[Pulse Backend] [Command: team_loader::decline_invitation] Status: Error | Details: Failed to save invitations: {}", e);
         return Err(e.to_string());
    }

    log::info!("[Pulse Backend] [Command: team_loader::decline_invitation] Status: Success");
    Ok(())
}
