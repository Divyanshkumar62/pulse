import { useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import TabBar from './components/tabs/TabBar';
import TabContent from './components/tabs/TabContent';
import MonitorDashboard from './components/monitor/MonitorDashboardView';
import EnvironmentVariableEditor from './components/environments/EnvironmentVariableEditor';
import { useEnvStore } from './stores/useEnvStore';
import { useTeamStore } from './stores/useTeamStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useWorkspaceStore } from './stores/useWorkspaceStore';
import { useHistoryStore } from './stores/useHistoryStore';
import { useAppStore } from './stores/useAppStore';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
  const initEnvStore = useEnvStore(state => state.initialize);
  const initSettingsStore = useSettingsStore(state => state.initialize);
  const initTeamStore = useTeamStore(state => state.initialize);
  const initWorkspaceStore = useWorkspaceStore(state => state.initialize);
  const initHistoryStore = useHistoryStore(state => state.initialize);
  const { sidebarTab, selectedMonitorId, selectedEnvironmentId } = useAppStore();

  useEffect(() => {
    initSettingsStore().then(() => {
      initTeamStore().then(() => {
        initWorkspaceStore();
      });
    });
    initEnvStore();
    initHistoryStore();
  }, [initEnvStore, initSettingsStore, initTeamStore, initWorkspaceStore, initHistoryStore]);

  const showMonitorDashboard = sidebarTab === 'monitor' && selectedMonitorId;
  const showEnvironmentEditor = sidebarTab === 'environments' && selectedEnvironmentId;

  return (
    <ErrorBoundary>
      <AppShell>
        {showMonitorDashboard ? (
          <MonitorDashboard />
        ) : showEnvironmentEditor ? (
          <EnvironmentVariableEditor />
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
