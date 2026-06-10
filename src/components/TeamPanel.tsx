import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Team, Invitation, TeamRole, TeamMember } from '../types';
import '../styles/components/teams.css';
import CustomSelect from './ui/CustomSelect';
import { getGravatarUrl } from '../utils/gravatar';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface CachedRepoData {
  timestamp: number;
  owner: string;
  repo: string;
  members: TeamMember[];
  invitations: Invitation[];
}

const githubCache: Record<string, CachedRepoData> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

interface TeamPanelProps {
  teams: Team[];
  invitations: Invitation[];
  currentUserEmail: string;
  currentUserName: string;
  onCreateTeam: (name: string) => void;
  onInvite: (teamId: string, teamName: string, email: string, role: TeamRole) => void;
  onAcceptInvitation: (id: string) => void;
  onDeclineInvitation: (id: string) => void;
  onRenameTeam: (id: string, newName: string) => Promise<void>;
  onDeleteTeam: (id: string) => Promise<void>;
  onTogglePin: (id: string) => Promise<void>;
  onRemoveMember: (teamId: string, userId: string) => Promise<void>;
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
  onRenameTeam,
  onDeleteTeam,
  onTogglePin,
  onRemoveMember,
}: TeamPanelProps) {
  const { workspaces } = useWorkspaceStore();
  const { settings } = useSettingsStore();
  const [githubData, setGithubData] = useState<Record<string, {
    owner: string;
    repo: string;
    members: TeamMember[];
    invitations: Invitation[];
    loading: boolean;
  }>>({});

  const fetchGithubDataForTeam = async (teamId: string, force = false) => {
    const token = settings?.github_token;
    if (!token) return;

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const workspace = workspaces.find(w => w.teamId === team.id);
    if (!workspace?.path) return;

    try {
      const repoInfo = await invoke<[string, string] | null>('get_github_repo_info', { path: workspace.path });
      if (repoInfo) {
        const [owner, repo] = repoInfo;
        
        const cached = githubCache[team.id];
        const now = Date.now();
        if (!force && cached && cached.owner === owner && cached.repo === repo && (now - cached.timestamp < CACHE_TTL_MS)) {
          setGithubData(prev => ({
            ...prev,
            [team.id]: {
              owner,
              repo,
              members: cached.members,
              invitations: cached.invitations,
              loading: false
            }
          }));
          return;
        }

        setGithubData(prev => ({
          ...prev,
          [team.id]: {
            ...(prev[team.id] || { members: [], invitations: [] }),
            owner,
            repo,
            loading: true
          }
        }));

        try {
          const [members, invites] = await Promise.all([
            invoke<TeamMember[]>('get_github_collaborators', { token, owner, repo }),
            invoke<Invitation[]>('get_github_invitations', { token, owner, repo })
          ]);

          githubCache[team.id] = {
            timestamp: now,
            owner,
            repo,
            members,
            invitations: invites
          };

          setGithubData(prev => ({
            ...prev,
            [team.id]: {
              owner,
              repo,
              members,
              invitations: invites,
              loading: false
            }
          }));
        } catch (err) {
          console.error(`Failed to fetch GitHub data for repo ${owner}/${repo}:`, err);
          setGithubData(prev => ({
            ...prev,
            [team.id]: {
              ...(prev[team.id] || { members: [], invitations: [] }),
              owner,
              repo,
              loading: false
            }
          }));
        }
      }
    } catch (e) {
      console.error("Failed to get repo info:", e);
    }
  };

  useEffect(() => {
    const loadGithubData = async () => {
      if (!settings?.github_token) return;
      for (const team of teams) {
        await fetchGithubDataForTeam(team.id, false);
      }
    };

    loadGithubData();
  }, [teams, workspaces, settings?.github_token]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<string | null>(null);
  const [showManageMembersModal, setShowManageMembersModal] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [renameTeamName, setRenameTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [activeTab, setActiveTab] = useState<'teams' | 'invitations'>('teams');
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (showManageMembersModal) {
      const isGithubTeam = !!githubData[showManageMembersModal];
      if (isGithubTeam) {
        fetchGithubDataForTeam(showManageMembersModal, true);
      }
    }
  }, [showManageMembersModal]);

  const incomingInvitations = invitations.filter(i => i.status === 'pending' && i.email.toLowerCase() === currentUserEmail.toLowerCase());
  const sentInvitations = invitations.filter(i => i.status === 'pending' && i.invited_by.toLowerCase() === currentUserEmail.toLowerCase());
  
  // Sort teams: Pinned teams first, then alphabetical by name
  const sortedTeams = [...teams].sort((a, b) => {
    const aPinned = a.pinned ? 1 : 0;
    const bPinned = b.pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return a.name.localeCompare(b.name);
  });

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
      const gitTeam = githubData[showInviteModal];
      if (gitTeam && settings?.github_token) {
        try {
          await invoke('invite_github_collaborator', {
            token: settings.github_token,
            owner: gitTeam.owner,
            repo: gitTeam.repo,
            username: inviteEmail.trim(),
            role: inviteRole
          });
          toast.success(`GitHub invitation sent to ${inviteEmail.trim()}`);
          
          const invites = await invoke<Invitation[]>('get_github_invitations', {
            token: settings.github_token,
            owner: gitTeam.owner,
            repo: gitTeam.repo
          });
          
          // Update cache
          if (githubCache[showInviteModal]) {
            githubCache[showInviteModal].invitations = invites;
            githubCache[showInviteModal].timestamp = Date.now();
          }

          setGithubData(prev => ({
            ...prev,
            [showInviteModal]: {
              ...prev[showInviteModal],
              invitations: invites
            }
          }));
          
          setInviteEmail('');
          setInviteRole('member');
          setShowInviteModal(null);
        } catch (error: any) {
          console.error('Failed to invite:', error);
          toast.error(error.toString() || 'Failed to send GitHub invitation');
        }
      } else {
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
    }
  };

  const handleRenameTeam = async () => {
    if (showRenameModal && renameTeamName.trim() && !isRenaming) {
      setIsRenaming(true);
      try {
        await onRenameTeam(showRenameModal, renameTeamName.trim());
        setRenameTeamName('');
        setShowRenameModal(null);
      } catch (error) {
        console.error('Failed to rename team:', error);
      } finally {
        setIsRenaming(false);
      }
    }
  };

  const handleDeleteTeam = async () => {
    if (showDeleteConfirmModal && !isDeleting) {
      setIsDeleting(true);
      try {
        await onDeleteTeam(showDeleteConfirmModal);
        setShowDeleteConfirmModal(null);
      } catch (error) {
        console.error('Failed to delete team:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await onRemoveMember(teamId, userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const getRoleBadgeClass = (role: TeamRole) => {
    switch (role) {
      case 'owner': return 'role-owner';
      case 'admin': return 'role-admin';
      default: return 'role-member';
    }
  };

  const getTeamGradient = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #4f46e5, #3730a3)', // Indigo
      'linear-gradient(135deg, #0d9488, #115e59)', // Teal
      'linear-gradient(135deg, #2563eb, #1e40af)', // Blue
      'linear-gradient(135deg, #ea580c, #9a3412)', // Orange
      'linear-gradient(135deg, #db2777, #9d174d)', // Pink
      'linear-gradient(135deg, #16a34a, #166534)'  // Green
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="team-panel">
      {/* Header bar structure */}
      <div className="teams-header-bar">
        <div className="teams-header-left">
          <div className="teams-title-row">
            <h1 className="teams-page-title">Teams</h1>
            <span className="teams-count-badge">{sortedTeams.length}</span>
          </div>
          <p className="teams-page-subtitle">
            Manage your collaborative environments and team members.
          </p>
        </div>
        <div className="teams-header-right">
          <button 
            className={`invites-toggle-btn ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'teams' ? 'invitations' : 'teams')}
          >
            {activeTab === 'invitations' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateY(-0.5px)' }}>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Teams
              </span>
            ) : (
              <>
                <span>Invites</span>
                <span className="invites-count-badge">{incomingInvitations.length}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="teams-container">
        {activeTab === 'teams' && (
          <div className="teams-grid">
            {sortedTeams.map(team => {
              const isGithubTeam = !!githubData[team.id];
              const gitData = githubData[team.id];
              
              const displayMembers = isGithubTeam ? (gitData.members || []) : team.members;
              const displayInvitations = isGithubTeam ? (gitData.invitations || []) : sentInvitations.filter(i => i.team_id === team.id);

              const hasCurrentUser = displayMembers.some(m => isGithubTeam
                ? (settings?.github_username && m.name.toLowerCase() === settings.github_username.toLowerCase())
                : (m.role === 'owner' || m.email.toLowerCase() === currentUserEmail.toLowerCase() || m.email === 'user@example.com')
              );

              const currentUserMember = displayMembers.find(m => isGithubTeam
                ? (settings?.github_username && m.name.toLowerCase() === settings.github_username.toLowerCase())
                : (m.role === 'owner' || m.email.toLowerCase() === currentUserEmail.toLowerCase() || (currentUserEmail === '' && m.email === 'user@example.com'))
              );
              
              const role = currentUserMember?.role || (isGithubTeam ? 'member' : 'owner');
              const totalExtraCount = displayMembers.length + displayInvitations.length - (hasCurrentUser ? 1 : 0);

              return (
                <div key={team.id} className="premium-team-card">
                  {/* Card Header Info */}
                  <div className="team-card-header">
                    <div className="team-card-info-left">
                      <div 
                        className="team-square-avatar" 
                        style={{ background: getTeamGradient(team.name) }}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="team-card-meta">
                        <h3 className="team-card-title">{team.name}</h3>
                        <span className="team-card-subtitle">
                          {isGithubTeam && gitData.loading ? (
                            'Loading members...'
                          ) : (
                            `${displayMembers.length} ${displayMembers.length === 1 ? 'Member' : 'Members'}`
                          )}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`premium-role-badge ${getRoleBadgeClass(role)}`}>
                        {role.toUpperCase()}
                      </span>
                      <div className="team-card-actions-top">
                        {/* Sync GitHub Collaborators (visible only for GitHub teams) */}
                        {isGithubTeam && gitData && (
                          <button 
                            className={`team-action-icon-btn refresh-btn ${gitData.loading ? 'loading' : ''}`}
                            title="Sync Collaborators"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await fetchGithubDataForTeam(team.id, true);
                            }}
                            disabled={gitData.loading}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={gitData.loading ? 'spin-animation' : ''}>
                              <path d="M23 4v6h-6" />
                              <path d="M1 20v-6h6" />
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                          </button>
                        )}

                        {/* Pin Button */}
                        <button 
                          className={`team-action-icon-btn pin-btn ${team.pinned ? 'pinned' : ''}`}
                          title={team.pinned ? "Unpin Team" : "Pin Team"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(team.id);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={team.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" style={{ transform: 'rotate(45deg)', transition: 'all 0.2s' }}>
                            <path d="M15 3h6v2h-2v7l2 2v2h-7v6l-1 1-1-1v-6H5v-2l2-2V5H5V3h10z" />
                          </svg>
                        </button>
                        
                        {/* Edit Button */}
                        <button 
                          className="team-action-icon-btn edit-btn"
                          title="Rename Team"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTeamName(team.name);
                            setShowRenameModal(team.id);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button 
                          className="team-action-icon-btn delete-btn"
                          title="Delete Team"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirmModal(team.id);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pending Invites Row (if any) */}
                  {displayInvitations.length > 0 && (
                    <div className="team-pending-invites">
                      {displayInvitations.map(inv => (
                        <div key={inv.id} className="team-pending-row">
                          <span className="pending-email" title={inv.email}>{inv.email}</span>
                          <span className="pending-badge">PENDING</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Card Footer: Avatar Stack & Invite Button */}
                  <div className="team-card-footer">
                    <div 
                      className="avatar-stack-container"
                      onClick={() => setShowManageMembersModal(team.id)}
                      title="Manage Team Members"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="avatar-stack">
                        {/* Render the user's avatar */}
                        {hasCurrentUser && (
                          <img 
                            className="avatar-stack-item user-avatar-item"
                            title={`${isGithubTeam ? (settings?.github_username || 'You') : (currentUserName || 'You')} (${role})`}
                            src={isGithubTeam && settings?.github_username
                              ? `https://github.com/${settings.github_username}.png`
                              : getGravatarUrl(currentUserEmail || 'user@example.com', 32)
                            }
                            alt={isGithubTeam ? (settings?.github_username || 'You') : (currentUserName || 'You')}
                            style={{ zIndex: 10, padding: 0, objectFit: 'cover', width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', maxWidth: '28px', maxHeight: '28px', borderRadius: '50%', flexShrink: 0 }}
                          />
                        )}
                        
                        {/* Render other members */}
                        {displayMembers
                          .filter(m => {
                            const isCurrent = isGithubTeam
                              ? (settings?.github_username && m.name.toLowerCase() === settings.github_username.toLowerCase())
                              : (m.role === 'owner' ||
                                 m.email.toLowerCase() === currentUserEmail.toLowerCase() ||
                                 (currentUserEmail === '' && m.email === 'user@example.com') ||
                                 (m.email === 'user@example.com' && currentUserEmail !== ''));
                            return !isCurrent;
                          })
                          .slice(0, 2)
                          .map((member, idx) => (
                            <img 
                              key={member.user_id} 
                              className="avatar-stack-item"
                              title={`${member.name} (${member.role})`}
                              src={isGithubTeam
                                ? `https://github.com/${member.name}.png`
                                : getGravatarUrl(member.email, 32)
                              }
                              alt={member.name}
                              style={{ zIndex: 9 - idx, padding: 0, objectFit: 'cover', width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', maxWidth: '28px', maxHeight: '28px', borderRadius: '50%', flexShrink: 0 }}
                            />
                          ))
                        }
                        
                        {/* Show +N badge if there are remaining members/invites */}
                        {totalExtraCount > 0 && (
                          <div className="avatar-stack-item extra-count-item" style={{ zIndex: 1 }} title={`${totalExtraCount} other members`}>
                            +{totalExtraCount}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      className="card-invite-btn"
                      onClick={() => setShowInviteModal(team.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                      Invite
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Create New Team dashed card */}
            <div 
              className="create-team-dashed-card"
              onClick={() => setShowCreateModal(true)}
            >
              <div className="create-team-plus-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="create-team-text">Create New Team</span>
            </div>
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="premium-invitation-list">
            {incomingInvitations.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
                  No pending invitations.
               </div>
            ) : incomingInvitations.map(invitation => (
              <div key={invitation.id} className="premium-invitation-card">
                <div className="invitation-card-header">
                  <h3 className="invitation-team-name">{invitation.team_name}</h3>
                  <span className="invitation-role-badge">{invitation.role}</span>
                </div>
                <div className="invitation-details">
                  Invited by <span className="inviter-highlight">{invitation.invited_by}</span> to join the team.
                </div>
                <div className="invitation-actions">
                  <button className="btn-accept" onClick={() => onAcceptInvitation(invitation.id)}>Accept</button>
                  <button className="btn-decline" onClick={() => onDeclineInvitation(invitation.id)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-h2">Create Team</h2>
            <div style={{ marginBottom: '32px', marginTop: '16px' }}>
              <label className="text-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>Team Name</label>
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
          </div>
        </div>,
        document.getElementById('root') || document.body
      )}

      {showInviteModal && (() => {
        const isGithubTeam = !!githubData[showInviteModal];
        return createPortal(
          <div className="modal-overlay" onClick={() => setShowInviteModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2 className="text-h2">Invite Member</h2>
              <div style={{ marginBottom: '24px', marginTop: '16px' }}>
                <label className="text-label" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  {isGithubTeam ? 'GitHub Username' : 'Email Address'}
                </label>
                <input
                  type={isGithubTeam ? 'text' : 'email'}
                  className="text-input"
                  placeholder={isGithubTeam ? 'e.g., octocat' : 'name@company.com'}
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '32px' }}>
                <label className="text-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px', display: 'block' }}>Role</label>
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
            </div>
          </div>,
          document.getElementById('root') || document.body
        );
      })()}

      {showRenameModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowRenameModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-h2">Rename Team</h2>
            <p className="text-body">
              Choose a new name for your team workspace.
            </p>
            <div style={{ marginBottom: '32px' }}>
              <label className="text-label">New Team Name</label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g., Engineering Team, Side Project"
                value={renameTeamName}
                onChange={e => setRenameTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRenameTeam()}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowRenameModal(null)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleRenameTeam} 
                disabled={!renameTeamName.trim() || isRenaming}
              >
                {isRenaming ? 'Renaming...' : 'Rename Team'}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('root') || document.body
      )}

      {showDeleteConfirmModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowDeleteConfirmModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-h2">Delete Team</h2>
            <p className="text-body">
              Are you sure you want to delete <span style={{ color: 'var(--status-error)', fontWeight: 700 }}>{teams.find(t => t.id === showDeleteConfirmModal)?.name}</span>? This action is permanent and cannot be undone. All shared configurations for this team workspace will be lost.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirmModal(null)}>Cancel</button>
              <button 
                className="btn-danger" 
                onClick={handleDeleteTeam} 
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('root') || document.body
      )}

      {showManageMembersModal && (() => {
        const team = teams.find(t => t.id === showManageMembersModal);
        if (!team) return null;
        
        const isGithubTeam = !!githubData[team.id];
        const gitData = githubData[team.id];
        const displayMembers = isGithubTeam ? (gitData.members || []) : team.members;
        
        return createPortal(
          <div className="modal-overlay" onClick={() => setShowManageMembersModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
              <h2 className="text-h2" style={{ marginBottom: '24px' }}>Manage Members</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
                {displayMembers.map(member => {
                   const isOwner = isGithubTeam ? (member.role === 'owner') : (team.owner_id === member.user_id || member.role === 'owner');
                   const isCurrentUser = isGithubTeam
                     ? (settings?.github_username && member.name.toLowerCase() === settings.github_username.toLowerCase())
                     : (member.role === 'owner' ||
                        member.email.toLowerCase() === currentUserEmail.toLowerCase() || 
                        (currentUserEmail === '' && member.email === 'user@example.com') ||
                        (member.email === 'user@example.com'));
                   
                   const currentUserMember = displayMembers.find(m => isGithubTeam
                     ? (settings?.github_username && m.name.toLowerCase() === settings.github_username.toLowerCase())
                     : (m.role === 'owner' || m.email.toLowerCase() === currentUserEmail.toLowerCase() || m.email === 'user@example.com')
                   );
                   const currentUserIsAdmin = isGithubTeam
                     ? (currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin')
                     : (team.owner_id === currentUserMember?.user_id || currentUserMember?.role === 'owner');
                   
                   const canActuallyRemove = !isGithubTeam && !isCurrentUser && currentUserIsAdmin && !isOwner;

                   // Reflect updated name/email for current user
                   const displayName = isCurrentUser 
                     ? (isGithubTeam ? (settings?.github_username || member.name) : (currentUserName || member.name)) 
                     : member.name;
                   const displayEmail = isCurrentUser 
                     ? (isGithubTeam ? (settings?.github_username || member.email) : (currentUserEmail || member.email)) 
                     : member.email;
                   const avatarUrl = isGithubTeam
                     ? `https://github.com/${member.name}.png`
                     : getGravatarUrl(displayEmail, 64);

                  return (
                    <div key={member.user_id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px', 
                      background: 'var(--bg-surface)', 
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <img 
                        src={avatarUrl}
                        alt={displayName}
                        className="member-avatar-img"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName} {isCurrentUser && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isGithubTeam ? `@${displayEmail}` : displayEmail}
                        </div>
                      </div>
                      <span className={`premium-role-badge ${getRoleBadgeClass(member.role)}`} style={{ fontSize: '9px' }}>
                        {member.role.toUpperCase()}
                      </span>
                      {canActuallyRemove && (
                        <button 
                          className="team-action-icon-btn delete-btn"
                          title="Remove Member"
                          onClick={() => handleRemoveMember(team.id, member.user_id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowManageMembersModal(null)}>Close</button>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setShowManageMembersModal(null);
                    setShowInviteModal(showManageMembersModal);
                  }}
                >
                  Invite New Member
                </button>
              </div>
            </div>
          </div>,
          document.getElementById('root') || document.body
        );
      })()}
    </div>
  );
}

