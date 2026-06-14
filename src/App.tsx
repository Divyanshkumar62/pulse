import { useEffect, useState } from 'react';
import AppShell from './components/layout/AppShell';
import TabBar from './components/tabs/TabBar';
import TabContent from './components/tabs/TabContent';
import MonitorDashboard from './components/monitor/MonitorDashboardView';
import LoadTestingView from './components/load-testing/LoadTestingView';
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
import { useTabStore } from './stores/useTabStore';
import { ReactFlowProvider } from '@xyflow/react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import MockServerEditor from './components/mock/MockServerEditor';
import { usePresence } from './hooks/usePresence';
import { check, Update } from '@tauri-apps/plugin-updater';
import { UpdateModal } from './components/ui/UpdateModal';
import { useUpdater } from './hooks/useUpdater';


export default function App() {
  const initEnvStore = useEnvStore(state => state.initialize);
  const initSettingsStore = useSettingsStore(state => state.initialize);
  const initTeamStore = useTeamStore(state => state.initialize);
  const initWorkspaceStore = useWorkspaceStore(state => state.initialize);
  const initHistoryStore = useHistoryStore(state => state.initialize);
  const initMockStore = useMockStore(state => state.initialize);
  const initTabStore = useTabStore(state => state.initialize);
  
  const { updateAvailable, setUpdateAvailable } = useUpdater();
  
  usePresence();

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
    togglePinTeamAction,
    removeMemberAction
  } = useTeamStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    // Phase 1: Initialize Settings, Teams, Environments, and History in parallel
    Promise.all([
      initSettingsStore(),
      initTeamStore(),
      initEnvStore(),
      initHistoryStore()
    ])
    .then(() => {
      // Phase 2: Workspaces depend on Teams metadata to map team workspaces
      return initWorkspaceStore();
    })
    .then(() => {
      // Phase 3: Mock servers and tab states depend on active workspace configurations
      return Promise.all([
        initMockStore(),
        initTabStore()
      ]);
    })
    .catch((error) => {
      console.error("[Pulse] Error during store initialization:", error);
    });
  }, [initEnvStore, initSettingsStore, initTeamStore, initWorkspaceStore, initHistoryStore, initMockStore, initTabStore]);

  const showMonitorDashboard = sidebarTab === 'monitor' && selectedMonitorId;
  const showLoadTestingDashboard = sidebarTab === 'load-testing';
  const showEnvironmentEditor = sidebarTab === 'environments' && selectedEnvironmentId;
  const showFlowBuilder = sidebarTab === 'flows';
  const showMockServerEditor = sidebarTab === 'mock-servers' && activeMockServerId;
  const showTeamDashboard = sidebarTab === 'teams';

  return (
    <ErrorBoundary>
      <AppShell>
        {showMonitorDashboard ? (
          <MonitorDashboard />
        ) : showLoadTestingDashboard ? (
          <LoadTestingView />
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
            onRemoveMember={removeMemberAction}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <TabBar />
            <TabContent />
          </div>
        )}
        {updateAvailable && (
          <UpdateModal 
            update={updateAvailable} 
            onClose={() => {
              // Suppression logic removed temporarily
              setUpdateAvailable(null);
            }} 
          />
        )}
      </AppShell>
    </ErrorBoundary>
  );
}
