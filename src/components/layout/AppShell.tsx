import { ReactNode } from 'react';
import TitleBar from './TitleBar';
import StatusBar from './StatusBar';
import Sidebar from './Sidebar';
import CommandPalette from '../modals/CommandPalette';
import SettingsModal from '../modals/SettingsModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAppStore } from '../../stores/useAppStore';
import { Toaster } from 'sonner';
import '../../styles/components/layout.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isSettingsOpen, setSettingsOpen } = useAppStore();
  useKeyboardShortcuts();

  return (
    <div className="app-container">
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        <TitleBar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {children}
          </main>
        </div>
        <StatusBar />
      </div>
      <CommandPalette />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
