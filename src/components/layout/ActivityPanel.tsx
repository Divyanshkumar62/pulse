import { useAppStore } from '../../stores/useAppStore';
import { useResizable } from '../../hooks/useResizable';
import { useEnvStore } from '../../stores/useEnvStore';
import { useTeamStore } from '../../stores/useTeamStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import TeamPanel from '../TeamPanel';
import CollectionTree from '../collections/CollectionTree';
import ActivityFeed from '../ActivityFeed';
import EnvironmentsPanel from '../sidebar/EnvironmentsPanel';
import CustomSelect from '../ui/CustomSelect';
import MockServerPanel from '../sidebar/MockServerPanel';
import MonitorSidebar from '../monitor/MonitorSidebar';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/components/activity-panel.css';

export default function ActivityPanel() {
  const { sidebarTab, sidebarWidth, setSidebarWidth } = useAppStore();
  const { width, isDragging, startDrag } = useResizable(sidebarWidth, 240, 600, setSidebarWidth, 'x');
  const { environments, activeEnvId, setActiveEnvId } = useEnvStore();
  const { addCollection } = useCollectionStore();

  const handleCreateCollection = () => {
    addCollection({
      id: uuidv4(),
      name: 'New Collection',
      description: null,
      requests: [],
      folders: [],
      variables: []
    }, '');
  };

  const activeEnv = environments.find(e => e.id === activeEnvId);

  // Teams store
  const { 
    teams, invitations, 
    createNewTeam, inviteMember, acceptInvite, declineInvite 
  } = useTeamStore();
  
  // Settings store
  const { settings } = useSettingsStore();

  const getContextIcon = () => {
    switch (sidebarTab) {
      case 'collections':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        );
      case 'history':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        );
      case 'environments':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 13V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15C14.2091 15 16 13.2091 16 11V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V11C8 13.2091 9.79086 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  const getContextTitle = () => {
    switch (sidebarTab) {
      case 'collections': return 'Collections';
      case 'history': return 'History';
      case 'environments': return 'Environments';
      case 'teams': return 'Teams';
      case 'mock-servers': return 'Mock Servers';
      case 'monitor': return 'Monitor';
      default: return 'Collections';
    }
  };

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
      case 'environments':
        return <EnvironmentsPanel />;
      case 'mock-servers':
        return <MockServerPanel />;
      case 'monitor':
        return <MonitorSidebar />;
      default:
        return null;
    }
  };

  return (
    <aside className="activity-panel" style={{ width: `${width}px` }}>
      {sidebarTab === 'teams' && (
        <div className="panel-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="panel-context">
              <div className="context-icon">
                {getContextIcon()}
              </div>
              <div className="context-info">
                <span className="context-title">{getContextTitle()}</span>
                <span className="context-subtitle">API Development</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {sidebarTab === 'teams' && (
        <div className="panel-nav">
          <div className={`panel-nav-item active`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            {sidebarTab.charAt(0).toUpperCase() + sidebarTab.slice(1)}
          </div>
        </div>
      )}
      
      <div className="panel-content">
        {renderContent()}
      </div>
      
      <div 
        className={`panel-resizer ${isDragging ? 'dragging' : ''}`} 
        onMouseDown={startDrag}
      />
    </aside>
  );
}
