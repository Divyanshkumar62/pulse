use std::fs;
use std::path::Path;
use chrono::Utc;

use crate::collections::types::{Environment, HistoryEntry};
use crate::collections::team::{Team, Invitation, InvitationStatus, TeamRole};

pub fn load_teams<P: AsRef<Path>>(path: P) -> Result<Vec<Team>, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    let teams: Vec<Team> = serde_yaml::from_str(&content)?;
    Ok(teams)
}

pub fn save_teams<P: AsRef<Path>>(teams: &[Team], path: P) -> Result<(), Box<dyn std::error::Error>> {
    let yaml = serde_yaml::to_string(teams)?;
    fs::write(path, yaml)?;
    Ok(())
}

pub fn load_invitations<P: AsRef<Path>>(path: P) -> Result<Vec<Invitation>, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(path)?;
    let invitations: Vec<Invitation> = serde_json::from_str(&content)?;
    Ok(invitations)
}

pub fn save_invitations<P: AsRef<Path>>(invitations: &[Invitation], path: P) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(invitations)?;
    fs::write(path, json)?;
    Ok(())
}

pub fn create_team(
    teams_path: &str,
    name: String,
    owner_id: String,
    owner_email: String,
    owner_name: String,
) -> Result<Team, String> {
    let teams = load_teams(teams_path).unwrap_or_default();
    
    let team = Team::new(name, owner_id, owner_email, owner_name);
    let mut updated_teams = teams;
    updated_teams.push(team.clone());
    
    save_teams(&updated_teams, teams_path).map_err(|e| e.to_string())?;
    
    Ok(team)
}

pub fn invite_to_team(
    teams_path: &str,
    invitations_path: &str,
    team_id: String,
    team_name: String,
    email: String,
    role: TeamRole,
    invited_by: String,
) -> Result<Invitation, String> {
    let invitations = load_invitations(invitations_path).unwrap_or_default();
    
    if invitations.iter().any(|i| i.team_id == team_id && i.email == email && matches!(i.status, InvitationStatus::Pending)) {
        return Err("An invitation has already been sent to this email".to_string());
    }
    
    let invitation = Invitation::new(team_id, team_name, email, role, invited_by);
    let mut updated = invitations;
    updated.push(invitation.clone());
    
    save_invitations(&updated, invitations_path).map_err(|e| e.to_string())?;
    
    Ok(invitation)
}

pub fn get_pending_invitations<P: AsRef<Path>>(path: P) -> Result<Vec<Invitation>, String> {
    let invitations = load_invitations(path).map_err(|e| e.to_string())?;
    Ok(invitations.into_iter().filter(|i| matches!(i.status, InvitationStatus::Pending)).collect())
}

pub fn accept_invitation<P: AsRef<Path>>(
    invitations_path: P,
    teams_path: &str,
    invitation_id: String,
    user_id: String,
    user_email: String,
    user_name: String,
) -> Result<(), String> {
    let mut invitations = load_invitations(&invitations_path).map_err(|e| e.to_string())?;
    
    let invitation = invitations.iter_mut()
        .find(|i| i.id == invitation_id)
        .ok_or("Invitation not found")?;
    
    if Utc::now() > invitation.expires_at {
        invitation.status = InvitationStatus::Expired;
        save_invitations(&invitations, &invitations_path).map_err(|e| e.to_string())?;
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
        save_teams(&teams, teams_path).map_err(|e| e.to_string())?;
    }
    
    save_invitations(&invitations, &invitations_path).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn decline_invitation<P: AsRef<Path>>(path: P, invitation_id: String) -> Result<(), String> {
    let mut invitations = load_invitations(&path).map_err(|e| e.to_string())?;
    
    if let Some(invitation) = invitations.iter_mut().find(|i| i.id == invitation_id) {
        invitation.status = InvitationStatus::Declined;
    }
    
    save_invitations(&invitations, &path).map_err(|e| e.to_string())?;
    
    Ok(())
}
