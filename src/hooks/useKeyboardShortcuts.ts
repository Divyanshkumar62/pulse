import { useEffect } from 'react';
import { useTabStore } from '../stores/useTabStore';
import { useAppStore } from '../stores/useAppStore';

export function useKeyboardShortcuts() {
  const { openTab, closeTab, activeTabId } = useTabStore();
  const { toggleSidebar } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in generic inputs
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Ctrl+T: New Tab
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

      // Ctrl+B: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      // Ctrl+Enter: Send Request globally
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('pulse:send-request'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTab, closeTab, activeTabId, toggleSidebar]);
}
