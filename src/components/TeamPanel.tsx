import { useState } from 'react';
import type { Team, Invitation, TeamRole } from '../types';
import '../styles/components/teams.css';
import CustomSelect from './ui/CustomSelect';

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
  const [isCreating, setIsCreating] = useState(false);

  const incomingInvitations = invitations.filter(i => i.status === 'pending' && i.email === currentUserEmail);
  const sentInvitations = invitations.filter(i => i.status === 'pending' && i.invited_by === currentUserEmail);
  
  // Show all teams (including owned teams)
  const userTeams = teams;

  const handleCreateTeam = async () => {
    if (newTeamName.trim() && !isCreating) {
      setIsCreating(true);
      try {
        await onCreateTeam(newTeamName.trim());
        setNewTeamName('');
        setShowCreateModal(false);
      } catch (error) {
        console.error('Failed to create team:', error);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleInvite = async () => {
    if (showInviteModal && inviteEmail.trim()) {
      const team = teams.find(t => t.id === showInviteModal);
      if (team) {
        try {
          await onInvite(showInviteModal, team.name, inviteEmail.trim(), inviteRole);
          setInviteEmail('');
          setInviteRole('member');
          setShowInviteModal(null);
        } catch (error) {
          console.error('Failed to invite:', error);
        }
      }
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
          Invites ({incomingInvitations.length})
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {activeTab === 'teams' && (
          <div className="teams-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {userTeams.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '48px 24px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: 'var(--radius-xl)', 
                border: '1px dashed var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '20px', filter: 'drop-shadow(0 0 10px var(--accent-subtle))' }}>👥</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>No Teams Found</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '200px' }}>
                  Collaborate and sync collections with your colleagues.
                </p>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowCreateModal(true)}>
                  Create Team
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {userTeams.map(team => (
                  <div key={team.id} style={{ 
                    background: 'var(--bg-elevated)', 
                    borderRadius: 'var(--radius-xl)', 
                    border: '1px solid var(--border-subtle)',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'all var(--transition-base)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{team.name}</h3>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', borderRadius: 'var(--radius-md)' }} onClick={() => setShowInviteModal(team.id)}>
                        Invite
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {team.members.map(member => (
                        <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            background: member.role === 'owner' ? 'var(--accent-primary)' : 'var(--bg-surface)', 
                            color: member.role === 'owner' ? '#FFF' : 'var(--accent-primary)',
                            fontSize: '11px', 
                            fontWeight: 800, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '1px solid var(--accent-subtle)',
                            boxShadow: member.role === 'owner' ? '0 0 10px var(--accent-subtle)' : 'none'
                          }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {member.name}
                            {member.email === currentUserEmail && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>(you)</span>}
                          </div>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: 800, 
                            padding: '3px 8px', 
                            background: 'rgba(255,255,255,0.05)', 
                            borderRadius: 'var(--radius-sm)', 
                            border: '1px solid var(--border-subtle)',
                            color: member.role === 'owner' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            letterSpacing: '0.04em'
                          }}>
                            {member.role}
                          </span>
                        </div>
                      ))}
                      
                      {/* Show pending invitations sent for this team */}
                      {sentInvitations.filter(i => i.team_id === team.id).map(invitation => (
                        <div key={invitation.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.6 }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            background: 'var(--bg-deep)',
                            color: 'var(--text-tertiary)',
                            fontSize: '11px', 
                            fontWeight: 800, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '1px dashed var(--border-default)'
                          }}>
                            ?
                          </div>
                          <div style={{ flex: 1, fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                            {invitation.email}
                          </div>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: 700, 
                            padding: '2px 6px', 
                            background: 'var(--bg-deep)', 
                            borderRadius: 'var(--radius-sm)', 
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-tertiary)',
                            letterSpacing: '0.04em'
                          }}>
                            Pending
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '12px', borderStyle: 'dashed', background: 'transparent' }}
                  onClick={() => setShowCreateModal(true)}
                >
                  <span style={{ fontSize: '18px', fontWeight: 400 }}>+</span> Create New Team
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="invitations-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {incomingInvitations.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
                  No pending invitations.
               </div>
            ) : incomingInvitations.map(invitation => (
              <div key={invitation.id} className="invitation-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{invitation.team_name}</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>{invitation.role}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Invited by <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{invitation.invited_by}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '8px' }} onClick={() => onAcceptInvitation(invitation.id)}>Accept</button>
                  <button className="btn-secondary" style={{ flex: 1, padding: '8px' }} onClick={() => onDeclineInvitation(invitation.id)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreateModal || showInviteModal) && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setShowInviteModal(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {showCreateModal && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: 'var(--text-primary)' }}>Create Team</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.5 }}>
                  Set up a shared space for your projects and collaborate in real-time.
                </p>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: '10px', letterSpacing: '0.05em' }}>Team Name</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g., Engineering Team, Side Project"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                    autoFocus
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button 
                    className="btn-primary" 
                    onClick={handleCreateTeam} 
                    disabled={!newTeamName.trim() || isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </>
            )}

            {showInviteModal && (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: 'var(--text-primary)' }}>Invite Member</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.5 }}>
                  Add a colleague to <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{teams.find(t => t.id === showInviteModal)?.name}</span>.
                </p>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: '10px', letterSpacing: '0.05em' }}>Email Address</label>
                  <input
                    type="email"
                    className="text-input"
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: '10px', letterSpacing: '0.05em' }}>Role</label>
                  <CustomSelect 
                    value={inviteRole}
                    onChange={(val) => setInviteRole(val as TeamRole)}
                    options={[
                      { value: 'member', label: 'Member' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowInviteModal(null)}>Cancel</button>
                  <button className="btn-primary" onClick={handleInvite} disabled={!inviteEmail.trim()}>Send Invite</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

