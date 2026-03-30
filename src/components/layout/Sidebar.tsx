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
    { id: 'collections', icon: '📁', label: 'Collections' },
    { id: 'history', icon: '🕐', label: 'History' },
    { id: 'environments', icon: '🌍', label: 'Environments' },
    { id: 'teams', icon: '👥', label: 'Teams' },
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
      <div className="sidebar-header">
        <h1>
          <span>⚡</span>
          Pulse
        </h1>
        <div className="sidebar-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-tab ${sidebarTab === tab.id ? 'active' : ''}`}
              onClick={() => setSidebarTab(tab.id)}
            >
              {tab.label}
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
