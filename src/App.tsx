import { useEffect, useState } from 'react';
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
import { check, Update } from '@tauri-apps/plugin-updater';
import { UpdateModal } from './components/ui/UpdateModal';

export default function App() {
  const initEnvStore = useEnvStore(state => state.initialize);
  const initSettingsStore = useSettingsStore(state => state.initialize);
  const initTeamStore = useTeamStore(state => state.initialize);
  const initWorkspaceStore = useWorkspaceStore(state => state.initialize);
  const initHistoryStore = useHistoryStore(state => state.initialize);
  const initMockStore = useMockStore(state => state.initialize);
  const initTabStore = useTabStore(state => state.initialize);
  const [updateAvailable, setUpdateAvailable] = useState<Update | null>(null);
  const [debugStatus, setDebugStatus] = useState<string | null>(null);
  
  usePresence();

  useEffect(() => {
    async function checkForUpdates() {
      setDebugStatus("Updater Debug: Starting check");

      try {
        const update = await check();
        if (update && update.available) {
          setDebugStatus(`Updater Debug: Update available - version ${update.version}`);
          setUpdateAvailable(update);
        } else {
          setDebugStatus("No update available");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setDebugStatus(`Updater Error:\n${errMsg}`);
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
        {updateAvailable && (
          <UpdateModal 
            update={updateAvailable} 
            onClose={() => {
              // Suppression logic removed temporarily
              setUpdateAvailable(null);
            }} 
          />
        )}
        {debugStatus && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            fontSize: '18px',
            fontFamily: 'monospace',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ maxWidth: '600px', backgroundColor: '#111', border: '1px solid #333', padding: '32px', borderRadius: '12px' }}>
              <h2 style={{ marginBottom: '16px', color: '#ff4444', fontSize: '22px' }}>Tauri Updater Debugger</h2>
              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{debugStatus}</p>
              <button 
                onClick={() => setDebugStatus(null)} 
                style={{ marginTop: '24px', padding: '8px 24px', backgroundColor: '#333', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </AppShell>
    </ErrorBoundary>
  );
}