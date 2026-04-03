import { useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import TabBar from './components/tabs/TabBar';
import TabContent from './components/tabs/TabContent';
import { useEnvStore } from './stores/useEnvStore';
import { useTeamStore } from './stores/useTeamStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useWorkspaceStore } from './stores/useWorkspaceStore';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
  const initEnvStore = useEnvStore(state => state.initialize);
  const initSettingsStore = useSettingsStore(state => state.initialize);
  const initTeamStore = useTeamStore(state => state.initialize);
  const initWorkspaceStore = useWorkspaceStore(state => state.initialize);

  useEffect(() => {
    // Initialize required stores on boot
    initSettingsStore().then(() => {
      // Teams need settings for email/name
      initTeamStore().then(() => {
        // Workspaces need teams for team workspaces
        initWorkspaceStore();
      });
    });
    initEnvStore();
  }, [initEnvStore, initSettingsStore, initTeamStore, initWorkspaceStore]);

  return (
    <ErrorBoundary>
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <TabBar />
          <TabContent />
        </div>
      </AppShell>
    </ErrorBoundary>
  );
}
