import { useEffect } from 'react';
import { usePresenceStore } from '../stores/usePresenceStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useTabStore } from '../stores/useTabStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export function usePresence() {
  const { updatePresence, fetchPresence } = usePresenceStore();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { activeTabId, tabs } = useTabStore();
  const { settings } = useSettingsStore();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const userEmail = settings?.email;

  // Update presence when active tab changes
  useEffect(() => {
    if (activeWorkspace?.path && userEmail && activeTabId) {
      updatePresence(activeWorkspace.path, userEmail, activeTabId);
    }
  }, [activeWorkspace?.path, userEmail, activeTabId, updatePresence]);

  // Periodic fetch presence
  useEffect(() => {
    if (!activeWorkspace?.path) return;

    const interval = setInterval(() => {
      fetchPresence(activeWorkspace.path);
      
      // Also pulse our own presence if we have an active tab
      if (userEmail && activeTabId) {
        updatePresence(activeWorkspace.path, userEmail, activeTabId);
      }
    }, 30000); // Every 30 seconds

    fetchPresence(activeWorkspace.path);

    return () => clearInterval(interval);
  }, [activeWorkspace?.path, userEmail, activeTabId, fetchPresence, updatePresence]);
}
