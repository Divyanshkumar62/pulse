import { useState } from 'react';
import type { Team, Invitation, TeamRole } from '../types';
import '../styles/components/teams.css';

interface TeamPanelProps {
  teams: Team[];
  invitations: Invitation[];
  currentUserEmail: string;
  currentUserName: string;
  onCreateTeam: (name: string) => void;
  onInvite: (teamId: string, teamName: string, email: string, role: TeamRole) => void;
  onAcceptInvitation: (id: string) => void;
  onDeclineInvitation: (id: string) => void;
}

export default function TeamPanel({
  teams,
  invitations,
  currentUserEmail,
  currentUserName,
  onCreateTeam,
  onInvite,
  onAcceptInvitation,
  onDeclineInvitation,
}: TeamPanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [activeTab, setActiveTab] = useState<'teams' | 'invitations'>('teams');

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const userTeams = teams.filter(team => 
    team.members.some(m => m.email === currentUserEmail)
  );

  const handleCreateTeam = () => {
    if (newTeamName.trim()) {
      onCreateTeam(newTeamName.trim());
      setNewTeamName('');
      setShowCreateModal(false);
    }
  };

  const handleInvite = () => {
    if (showInviteModal && inviteEmail.trim()) {
      const team = teams.find(t => t.id === showInviteModal);
      if (team) {
        onInvite(showInviteModal, team.name, inviteEmail.trim(), inviteRole);
      }
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(null);
    }
  };

  const getRoleBadgeClass = (role: TeamRole) => {
    switch (role) {
      case 'owner': return 'role-owner';
      case 'admin': return 'role-admin';
      default: return 'role-member';
    }
  };

  return (
    <div className="team-panel">
      <div className="team-tabs">
        <button 
          className={`team-tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams ({userTeams.length})
        </button>
        <button 
          className={`team-tab ${activeTab === 'invitations' ? 'active' : ''}`}
          onClick={() => setActiveTab('invitations')}
        >
          Invites ({pendingInvitations.length})
        </button>
      </div>

      {activeTab === 'teams' && (
        <div className="teams-content">
          {userTeams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>You're not part of any team yet.</p>
              <button className="btn-primary-sm" onClick={() => setShowCreateModal(true)}>
                Create a Team
              </button>
            </div>
          ) : (
            <>
              {userTeams.map(team => (
                <div key={team.id} className="team-card">
                  <div className="team-header">
                    <h3 className="team-name">{team.name}</h3>
                    <button className="btn-secondary-sm" onClick={() => setShowInviteModal(team.id)}>
                      + Invite
                    </button>
                  </div>
                  <div className="team-members">
                    {team.members.map(member => (
                      <div key={member.user_id} className="member-row">
                        <div className="member-avatar">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="member-info">
                          <span className="member-name">
                            {member.name}
                            {member.email === currentUserEmail && ' (you)'}
                          </span>
                        </div>
                        <span className={`role-badge ${getRoleBadgeClass(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                className="btn-secondary-sm" 
                style={{ width: '100%', padding: '8px' }}
                onClick={() => setShowCreateModal(true)}
              >
                + Create New Team
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="invitations-content">
          {pendingInvitations.map(invitation => (
            <div key={invitation.id} className="invitation-card">
              <div className="invitation-header">
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{invitation.team_name}</span>
                <span className={`role-badge ${getRoleBadgeClass(invitation.role)}`}>{invitation.role}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Invited by {invitation.invited_by}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary-sm" style={{ flex: 1 }} onClick={() => onAcceptInvitation(invitation.id)}>Accept</button>
                <button className="btn-secondary-sm" style={{ flex: 1 }} onClick={() => onDeclineInvitation(invitation.id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <h2 className="text-h2">Create New Team</h2>
            <input
              type="text"
              className="text-input"
              style={{ width: '100%', padding: '8px 12px', margin: '16px 0' }}
              placeholder="Team name"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateTeam} disabled={!newTeamName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <h2 className="text-h2">Invite to Team</h2>
            <input
              type="email"
              className="text-input"
              style={{ width: '100%', padding: '8px 12px', margin: '16px 0' }}
              placeholder="Email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              autoFocus
            />
             <div style={{ marginBottom: '16px' }}>
              <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>Role</label>
              <select 
                value={inviteRole} 
                onChange={e => setInviteRole(e.target.value as TeamRole)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px' }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowInviteModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleInvite} disabled={!inviteEmail.trim()}>Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

