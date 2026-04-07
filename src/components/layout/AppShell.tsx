import { ReactNode } from 'react';
import Header from './Header';
import NavSidebar from './NavSidebar';
import ActivityPanel from './ActivityPanel';
import StatusBar from './StatusBar';
import CommandPalette from '../modals/CommandPalette';
import SettingsModal from '../modals/SettingsModal';
import AddEnvironmentModal from '../modals/AddEnvironmentModal';
import ImportModal from '../modals/ImportModal';
import UserProfileModal from '../modals/UserProfileModal';
import CommitModal from '../modals/CommitModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAppStore } from '../../stores/useAppStore';
import { Toaster } from 'sonner';
import '../../styles/components/layout.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isSettingsOpen, setSettingsOpen, sidebarVisible, isAddEnvironmentModalOpen, setAddEnvironmentModalOpen, isImportModalOpen, setImportModalOpen, isProfileOpen, setProfileOpen, isCommitModalOpen, setCommitModalOpen: setCommitModalOpenFn, commitModalStatus, commitModalPath } = useAppStore();
  useKeyboardShortcuts();

  return (
    <div className="app-container">
      <div className="app-layout">
        <Header />
        <div className="layout-body">
          <NavSidebar />
          {sidebarVisible && <ActivityPanel />}
          <main className="main-content">
            {children}
          </main>
        </div>
        <StatusBar />
      </div>
      <CommandPalette />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <AddEnvironmentModal />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setCommitModalOpenFn(false)}
        status={commitModalStatus}
        workspacePath={commitModalPath}
      />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
