use serde::Serialize;
use crate::collections::team::{Invitation, TeamRole};

#[derive(Debug, Clone, Serialize)]
pub struct EmailSettings {
    pub provider: EmailProvider,
    pub api_key: String,
    pub from_email: String,
    pub from_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EmailProvider {
    Resend,
    Sendgrid,
    Mock,
}

impl Default for EmailSettings {
    fn default() -> Self {
        Self {
            provider: EmailProvider::Mock,
            api_key: String::new(),
            from_email: "noreply@pulse.app".to_string(),
            from_name: "Pulse API Client".to_string(),
        }
    }
}

impl EmailSettings {
    pub fn from_env() -> Self {
        let provider = std::env::var("EMAIL_PROVIDER")
            .unwrap_or_else(|_| "mock".to_string())
            .to_lowercase();
        
        let provider = match provider.as_str() {
            "resend" => EmailProvider::Resend,
            "sendgrid" => EmailProvider::Sendgrid,
            _ => EmailProvider::Mock,
        };
        let api_key = std::env::var("EMAIL_API_KEY").unwrap_or_default();
        let from_email = std::env::var("EMAIL_FROM").unwrap_or_else(|_| "noreply@pulse.app".to_string());
        let from_name = std::env::var("EMAIL_FROM_NAME").unwrap_or_else(|_| "Pulse API Client".to_string());
        
        log::info!("[Email] Settings loaded - provider: {:?}, api_key_set: {}, from_email: {}", 
                   provider, !api_key.is_empty(), from_email);
        
        Self {
            provider,
            api_key,
            from_email,
            from_name,
        }
    }

    pub fn is_configured(&self) -> bool {
        !self.api_key.is_empty() && !matches!(self.provider, EmailProvider::Mock)
    }
}

#[derive(Debug, Serialize)]
pub struct ResendEmail {
    pub from: String,
    pub to: Vec<String>,
    pub subject: String,
    pub html: String,
}

pub fn build_invitation_html(invitation: &Invitation, inviter_name: &str) -> String {
    let role_str = match invitation.role {
        TeamRole::Owner => "Owner",
        TeamRole::Admin => "Admin",
        TeamRole::Member => "Member",
    };
    
    let accept_url = format!("pulse://invite/accept/{}", invitation.id);
    let decline_url = format!("pulse://invite/decline/{}", invitation.id);
    
    format!(r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }}
        .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #e94560, #ff6b6b); color: white; padding: 40px 30px; text-align: center; }}
        .header h1 {{ font-size: 28px; margin-bottom: 8px; }}
        .header p {{ opacity: 0.9; font-size: 16px; }}
        .content {{ padding: 40px 30px; }}
        .content p {{ margin-bottom: 16px; font-size: 15px; }}
        .content strong {{ color: #e94560; }}
        .role-badge {{ display: inline-block; background: #e94560; color: white; padding: 4px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }}
        .buttons {{ text-align: center; margin: 30px 0; }}
        .btn {{ display: inline-block; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px; }}
        .btn-primary {{ background: #e94560; color: white; }}
        .btn-secondary {{ background: #6c757d; color: white; }}
        .footer {{ background: #f8f9fa; padding: 20px 30px; text-align: center; color: #888; font-size: 12px; }}
        .footer a {{ color: #e94560; text-decoration: none; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You've Been Invited! 🎉</h1>
            <p>Join your team on Pulse API Client</p>
        </div>
        <div class="content">
            <p>Hello!</p>
            <p><strong>{inviter_name}</strong> has invited you to join the team <strong>"{team_name}"</strong> on Pulse API Client.</p>
            <p>Your role will be: <span class="role-badge">{role}</span></p>
            <div class="buttons">
                <a href="{accept_url}" class="btn btn-primary">Accept Invitation</a>
                <a href="{decline_url}" class="btn btn-secondary">Decline</a>
            </div>
            <p style="color: #888; font-size: 13px;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
        </div>
        <div class="footer">
            <p>Pulse API Client - Team Collaboration</p>
            <p>© 2024 Pulse</p>
        </div>
    </div>
</body>
</html>"#,
        inviter_name = inviter_name,
        team_name = invitation.team_name,
        role = role_str,
        accept_url = accept_url,
        decline_url = decline_url
    )
}

pub fn build_invitation_plain(invitation: &Invitation, inviter_name: &str) -> String {
    let role_str = match invitation.role {
        TeamRole::Owner => "Owner",
        TeamRole::Admin => "Admin",
        TeamRole::Member => "Member",
    };
    
    format!(
        "You've Been Invited to Join {} on Pulse\n\
        \n\
        Hello!\n\
        \n\
        {1} has invited you to join the team \"{0}\" on Pulse API Client.\n\
        \n\
        Your role: {2}\n\
        \n\
        Accept: pulse://invite/accept/{3}\n\
        Decline: pulse://invite/decline/{3}\n\
        \n\
        This invitation expires in 7 days.\n\
        \n\
        ---\n\
        Pulse API Client - Team Collaboration",
        invitation.team_name,
        inviter_name,
        role_str,
        invitation.id
    )
}

pub async fn send_email(settings: &EmailSettings, to: &str, subject: &str, html: &str) -> Result<(), String> {
    match settings.provider {
        EmailProvider::Resend => send_via_resend(settings, to, subject, html).await,
        EmailProvider::Sendgrid => send_via_sendgrid(settings, to, subject, html).await,
        EmailProvider::Mock => {
            log::info!("[Mock Email] To: {}, Subject: {}", to, subject);
            Ok(())
        }
    }
}

async fn send_via_resend(settings: &EmailSettings, to: &str, subject: &str, html: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    let from = format!("{} <{}>", settings.from_name, settings.from_email);
    
    #[derive(Serialize)]
    struct ResendRequest {
        from: String,
        to: Vec<String>,
        subject: String,
        html: String,
    }
    
    let request = ResendRequest {
        from,
        to: vec![to.to_string()],
        subject: subject.to_string(),
        html: html.to_string(),
    };
    
    log::info!("[Email] Sending via Resend API to {} from {}", to, settings.from_email);
    
    let response = client.post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", settings.api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    
    if status.is_success() {
        log::info!("[Email] Sent successfully via Resend to {}", to);
        Ok(())
    } else {
        log::error!("[Email] Resend API error ({}): {}", status, body);
        Err(format!("Resend API error ({}): {}", status, body))
    }
}

async fn send_via_sendgrid(settings: &EmailSettings, to: &str, subject: &str, html: &str) -> Result<(), String> {
    #[derive(Serialize)]
    struct SendgridEmail {
        personalizations: Vec<SendgridPersonalization>,
        from: SendgridAddress,
        subject: String,
        content: Vec<SendgridContent>,
    }
    
    #[derive(Serialize)]
    struct SendgridPersonalization {
        to: Vec<SendgridAddress>,
    }
    
    #[derive(Serialize)]
    struct SendgridAddress {
        email: String,
        name: Option<String>,
    }
    
    #[derive(Serialize)]
    struct SendgridContent {
        #[serde(rename = "type")]
        content_type: String,
        value: String,
    }
    
    let email = SendgridEmail {
        personalizations: vec![SendgridPersonalization {
            to: vec![SendgridAddress {
                email: to.to_string(),
                name: None,
            }],
        }],
        from: SendgridAddress {
            email: settings.from_email.clone(),
            name: Some(settings.from_name.clone()),
        },
        subject: subject.to_string(),
        content: vec![SendgridContent {
            content_type: "text/html".to_string(),
            value: html.to_string(),
        }],
    };
    
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.sendgrid.com/v3/mail/send")
        .header("Authorization", format!("Bearer {}", settings.api_key))
        .header("Content-Type", "application/json")
        .json(&email)
        .send()
        .await
        .map_err(|e| format!("Failed to send email: {}", e))?;
    
    if response.status().is_success() || response.status().as_u16() == 202 {
        log::info!("[Email] Sent successfully via SendGrid to {}", to);
        Ok(())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(format!("SendGrid API error ({}): {}", status, body))
    }
}

pub async fn send_invitation_email(
    invitation: &Invitation,
    inviter_name: &str,
) -> Result<(), String> {
    let settings = EmailSettings::from_env();
    let html = build_invitation_html(invitation, inviter_name);
    let subject = format!("You've been invited to join {} on Pulse", invitation.team_name);
    
    log::info!("[Email] Preparing to send invitation to {} via {:?}", invitation.email, settings.provider);
    
    if settings.is_configured() {
        log::info!("[Email] Sending configured email via {:?}", settings.provider);
        match send_email(&settings, &invitation.email, &subject, &html).await {
            Ok(()) => {
                log::info!("[Email] Sent successfully to {}", invitation.email);
                Ok(())
            }
            Err(e) => {
                log::error!("[Email] Failed to send email: {}", e);
                Err(e)
            }
        }
    } else {
        log::info!("[Email] Using mock mode (not configured)");
        log::info!("[Email Preview] To: {}, Subject: {}", invitation.email, subject);
        log::info!("{}", html);
        Ok(())
    }
}

pub async fn resend_invitation_email(
    invitation: &Invitation,
) -> Result<(), String> {
    log::info!("[Email] Resending invitation to {}", invitation.email);
    send_invitation_email(invitation, &invitation.invited_by_name).await
}
