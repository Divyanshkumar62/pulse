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
import { useTabStore } from './stores/useTabStore';
import { ReactFlowProvider } from '@xyflow/react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import MockServerEditor from './components/mock/MockServerEditor';
import { usePresence } from './hooks/usePresence';
import { check } from '@tauri-apps/plugin-updater';
import { ask } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

export default function App() {
  const initEnvStore = useEnvStore(state => state.initialize);
  const initSettingsStore = useSettingsStore(state => state.initialize);
  const initTeamStore = useTeamStore(state => state.initialize);
  const initWorkspaceStore = useWorkspaceStore(state => state.initialize);
  const initHistoryStore = useHistoryStore(state => state.initialize);
  const initMockStore = useMockStore(state => state.initialize);
  const initTabStore = useTabStore(state => state.initialize);
  
  usePresence();

  useEffect(() => {
    async function checkForUpdates() {
      try {
        console.log("[Pulse] Checking for updates...");
        const update = await check();
        if (update && update.available) {
          console.log("[Pulse] Update available:", update.version);
          const yes = await ask(
            `A new version (${update.version}) of Pulse is available. Would you like to install it and restart the app?`,
            { title: 'Update Available', kind: 'info', okLabel: 'Yes', cancelLabel: 'No' }
          );
          if (yes) {
            console.log("[Pulse] Downloading and installing update...");
            await update.downloadAndInstall();
            console.log("[Pulse] Relaunching app...");
            await relaunch();
          }
        } else {
          console.log("[Pulse] No updates available");
        }
      } catch (err) {
        console.warn("[Pulse] Updater check failed or ignored (normal if running in browser):", err);
      }
    }
    checkForUpdates();
  }, []);

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
            onRemoveMember={removeMemberAction}
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