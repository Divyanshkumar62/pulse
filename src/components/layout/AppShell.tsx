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
    <div className="app-shell">
      <TitleBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
