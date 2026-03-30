import { useAppStore } from '../../stores/useAppStore';
import { useResizable } from '../../hooks/useResizable';
import { useTeamStore } from '../../stores/useTeamStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import TeamPanel from '../TeamPanel';
import CollectionTree from '../collections/CollectionTree';
import ActivityFeed from '../ActivityFeed';

console.log('[Pulse] Sidebar component loaded');

export default function Sidebar() {
  const { sidebarTab, setSidebarTab, sidebarWidth, setSidebarWidth, setSettingsOpen } = useAppStore();
  const { width, isDragging, startDrag } = useResizable(sidebarWidth, 200, 600, setSidebarWidth);

  // Teams store
  const { 
    teams, invitations, error, clearError,
    createNewTeam, inviteMember, acceptInvite, declineInvite, resendInvite
  } = useTeamStore();
  
  console.log('[Pulse] Sidebar: teams from store:', teams);
  
  // Settings store
  const { settings } = useSettingsStore();

  const tabs = [
    { 
      id: 'collections', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ), 
      label: 'Collections' 
    },
    { 
      id: 'history', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ), 
      label: 'History' 
    },
    { 
      id: 'environments', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ), 
      label: 'Environments' 
    },
    { 
      id: 'teams', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ), 
      label: 'Teams' 
    },
  ] as const;

  const renderContent = () => {
    switch (sidebarTab) {
      case 'collections':
        return <CollectionTree />;
      case 'teams':
        if (!settings) return <div style={{ padding: '12px' }}>Loading...</div>;
        return (
          <TeamPanel
            teams={teams}
            invitations={invitations}
            currentUserEmail={settings.email}
            currentUserName={settings.name}
            error={error}
            onClearError={clearError}
            onCreateTeam={createNewTeam}
            onInvite={inviteMember}
            onResendInvite={resendInvite}
            onAcceptInvitation={acceptInvite}
            onDeclineInvitation={declineInvite}
          />
        );
      case 'history':
        return <ActivityFeed />;
      default:
        return (
          <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>
            <h2 className="text-h2" style={{ textTransform: 'capitalize', marginBottom: '16px', color: 'var(--text-primary)' }}>
              {sidebarTab}
            </h2>
            <p className="text-body">Phase 2: Content for {sidebarTab} goes here...</p>
          </div>
        );
    }
  };

  return (
    <aside className="sidebar" style={{ width: `${width}px` }}>
      <div className="sidebar-header" style={{ padding: 'var(--space-4)' }}>
        <div className="sidebar-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-tab ${sidebarTab === tab.id ? 'active' : ''}`}
              onClick={() => setSidebarTab(tab.id)}
              data-tooltip={tab.label}
              style={{ padding: '8px', justifyContent: 'center' }}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </div>
      
      <div className="sidebar-content">
        {renderContent()}
      </div>

      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
        <button
          className="btn-secondary"
          style={{ width: '100%', padding: '10px' }}
          onClick={() => setSettingsOpen(true)}
        >
          ⚙️ Settings
        </button>
      </div>
      
      <div 
        className={`sidebar-resizer ${isDragging ? 'dragging' : ''}`} 
        onMouseDown={startDrag}
        style={{ cursor: 'col-resize', width: '4px', position: 'absolute', right: 0, top: 0, bottom: 0 }}
      />
    </aside>
  );
}
