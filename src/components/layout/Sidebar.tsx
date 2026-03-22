import { useAppStore } from '../../stores/useAppStore';
import { useResizable } from '../../hooks/useResizable';
import { useTeamStore } from '../../stores/useTeamStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import TeamPanel from '../TeamPanel';
import CollectionTree from '../collections/CollectionTree';
import ActivityFeed from '../ActivityFeed';

export default function Sidebar() {
  const { sidebarTab, setSidebarTab, sidebarWidth, setSidebarWidth, setSettingsOpen } = useAppStore();
  const { width, isDragging, startDrag } = useResizable(sidebarWidth, 200, 600, setSidebarWidth);

  // Teams store
  const { 
    teams, invitations, 
    createNewTeam, inviteMember, acceptInvite, declineInvite 
  } = useTeamStore();
  
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
            onCreateTeam={createNewTeam}
            onInvite={inviteMember}
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
    <aside className="sidebar-container" style={{ width: `${width}px` }}>
      <nav className="sidebar-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sidebar-nav-item ${sidebarTab === tab.id ? 'active' : ''}`}
            onClick={() => setSidebarTab(tab.id)}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="sidebar-nav-item"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{ marginBottom: '8px' }}
        >
          ⚙️
        </button>
      </nav>
      
      <div className="sidebar-content" style={{ overflowY: 'auto' }}>
        {renderContent()}
      </div>

      <div 
        className={`sidebar-resizer ${isDragging ? 'dragging' : ''}`} 
        onMouseDown={startDrag}
      />
    </aside>
  );
}
