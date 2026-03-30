import { useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import TabBar from './components/tabs/TabBar';
import TabContent from './components/tabs/TabContent';
import { useEnvStore } from './stores/useEnvStore';
import { useTeamStore } from './stores/useTeamStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useWorkspaceStore } from './stores/useWorkspaceStore';
import ErrorBoundary from './components/ui/ErrorBoundary';

console.log('[Pulse] App component loading...');

export default function App() {
  console.log('[Pulse] App component rendered');
  
  const initEnvStore = useEnvStore(state => state.initialize);
  const initSettingsStore = useSettingsStore(state => state.initialize);
  const initTeamStore = useTeamStore(state => state.initialize);
  const initWorkspaceStore = useWorkspaceStore(state => state.initialize);

  useEffect(() => {
    console.log('[Pulse] App useEffect running - initializing stores...');
    
    initSettingsStore().then(() => {
      console.log('[Pulse] Settings initialized, now initializing teams...');
      initTeamStore().then(() => {
        console.log('[Pulse] Teams initialized, now initializing workspaces...');
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
