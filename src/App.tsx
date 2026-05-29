import { useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import TabBar from './components/tabs/TabBar';
import TabContent from './components/tabs/TabContent';
import MonitorDashboard from './components/monitor/MonitorDashboardView';
import EnvironmentVariableEditor from './components/environments/EnvironmentVariableEditor';
import FlowBuilder from './components/flow/FlowBuilder';
import TeamPanel from './components/TeamPanel';
import { useEnvStore } from './stores/useEnvStore';
import { useTeamStore } from './stores/useTeamStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useWorkspaceStore } from './stores/useWorkspaceStore';
import { useHistoryStore } from './stores/useHistoryStore';
import { useAppStore } from './stores/useAppStore';
import { useMockStore } from './stores/useMockStore';
import { ReactFlowProvider } from '@xyflow/react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import MockServerEditor from './components/mock/MockServerEditor';

export default function App() {
  const initEnvStore = useEnvStore(state => state.initialize);
  const initSettingsStore = useSettingsStore(state => state.initialize);
  const initTeamStore = useTeamStore(state => state.initialize);
  const initWorkspaceStore = useWorkspaceStore(state => state.initialize);
  const initHistoryStore = useHistoryStore(state => state.initialize);
  const initMockStore = useMockStore(state => state.initialize);
  
  const { sidebarTab, selectedMonitorId, selectedEnvironmentId } = useAppStore();
  const activeMockServerId = useMockStore(state => state.activeMockServerId);
  const { 
    teams, 
    invitations, 
    createNewTeam, 
    inviteMember, 
    acceptInvite, 
    declineInvite,
    renameTeamAction,
    deleteTeamAction,
    togglePinTeamAction
  } = useTeamStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    initSettingsStore().then(() => {
      initTeamStore().then(() => {
        initWorkspaceStore().then(() => {
          initMockStore();
        });
      });
    });
    initEnvStore();
    initHistoryStore();
  }, [initEnvStore, initSettingsStore, initTeamStore, initWorkspaceStore, initHistoryStore, initMockStore]);

  const showMonitorDashboard = sidebarTab === 'monitor' && selectedMonitorId;
  const showEnvironmentEditor = sidebarTab === 'environments' && selectedEnvironmentId;
  const showFlowBuilder = sidebarTab === 'flows';
  const showMockServerEditor = sidebarTab === 'mock-servers' && activeMockServerId;
  const showTeamDashboard = sidebarTab === 'teams';

  return (
    <ErrorBoundary>
      <AppShell>
        {showMonitorDashboard ? (
          <MonitorDashboard />
        ) : showEnvironmentEditor ? (
          <EnvironmentVariableEditor />
        ) : showFlowBuilder ? (
          <ReactFlowProvider>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
              <FlowBuilder />
            </div>
          </ReactFlowProvider>
        ) : showMockServerEditor ? (
          <MockServerEditor />
        ) : showTeamDashboard ? (
          <TeamPanel
            teams={teams}
            invitations={invitations}
            currentUserEmail={settings?.email || ''}
            currentUserName={settings?.name || ''}
            onCreateTeam={createNewTeam}
            onInvite={inviteMember}
            onAcceptInvitation={acceptInvite}
            onDeclineInvitation={declineInvite}
            onRenameTeam={renameTeamAction}
            onDeleteTeam={deleteTeamAction}
            onTogglePin={togglePinTeamAction}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <TabBar />
            <TabContent />
          </div>
        )}
      </AppShell>
    </ErrorBoundary>
  );
}