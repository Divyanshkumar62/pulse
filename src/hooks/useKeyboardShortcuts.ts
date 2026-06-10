import { useEffect } from 'react';
import { useTabStore } from '../stores/useTabStore';
import { useAppStore } from '../stores/useAppStore';

export function useKeyboardShortcuts() {
  const { openTab, closeTab, activeTabId } = useTabStore();
  const { toggleSidebar, setCommandPaletteOpen } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Ctrl+P or Ctrl+K: Command Palette (always allowed)
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl+Enter: Send Request or Run Flow (always allowed)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const appState = useAppStore.getState();
        if (appState.sidebarTab === 'flows') {
          window.dispatchEvent(new CustomEvent('pulse:run-flow'));
        } else {
          window.dispatchEvent(new CustomEvent('pulse:send-request'));
        }
        return;
      }

      // Ctrl+S: Save current entity (always allowed)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('pulse:save-entity'));
        return;
      }

      // Ctrl+B: Toggle Sidebar (always allowed)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Ctrl+N: Open a "New Request" tab (always allowed)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openTab({
          id: crypto.randomUUID(),
          name: 'New Request',
          method: 'GET',
          url: '',
          headers: [],
          body: { type: 'none', content: '' }
        });
        return;
      }

      // Don't trigger other single-key or navigation shortcuts if user is typing in generic inputs
      if (isInput) return;

      // Ctrl+T: Support browser-like new tab fallback
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        openTab({
          id: crypto.randomUUID(),
          name: 'New Request',
          method: 'GET',
          url: '',
          headers: [],
          body: { type: 'none', content: '' }
        });
      }

      // Ctrl+W: Close Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        if (activeTabId) {
          e.preventDefault();
          closeTab(activeTabId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTab, closeTab, activeTabId, toggleSidebar, setCommandPaletteOpen]);
}
