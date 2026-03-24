use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
    pub id: String,
    pub name: String,
    pub owner_id: String,
    pub members: Vec<TeamMember>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamMember {
    pub user_id: String,
    pub email: String,
    pub name: String,
    pub role: TeamRole,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TeamRole {
    Owner,
    Admin,
    Member,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invitation {
    pub id: String,
    pub team_id: String,
    pub team_name: String,
    pub email: String,
    pub role: TeamRole,
    pub status: InvitationStatus,
    pub invited_by: String,
    pub invited_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InvitationStatus {
    Pending,
    Accepted,
    Declined,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteRequest {
    pub email: String,
    pub role: TeamRole,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailPayload {
    pub to: String,
    pub subject: String,
    pub html: String,
}

impl Team {
    pub fn new(name: String, owner_id: String, owner_email: String, owner_name: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            owner_id: owner_id.clone(),
            members: vec![TeamMember {
                user_id: owner_id,
                email: owner_email,
                name: owner_name,
                role: TeamRole::Owner,
                joined_at: Utc::now(),
            }],
            created_at: Utc::now(),
        }
    }
}

impl Invitation {
    pub fn new(
        team_id: String,
        team_name: String,
        email: String,
        role: TeamRole,
        invited_by: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            team_id,
            team_name,
            email,
            role,
            status: InvitationStatus::Pending,
            invited_by,
            invited_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::days(7),
            accepted_at: None,
        }
    }
}
