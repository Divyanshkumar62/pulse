import React, { useState } from 'react';
import Header from './Header';
import NavSidebar from './NavSidebar';
import ActivityPanel from './ActivityPanel';
import StatusBar from './StatusBar';
import CommandPalette from '../modals/CommandPalette';
import SettingsModal from '../modals/SettingsModal';
import AddEnvironmentModal from '../modals/AddEnvironmentModal';
import ImportModal from '../modals/ImportModal';
import UserProfileModal from '../modals/UserProfileModal';
import GlobalVariablesModal from '../modals/GlobalVariablesModal';
import CommitModal from '../modals/CommitModal';
import CreateFlowModal from '../modals/CreateFlowModal';
import MonitorEngine from '../monitor/MonitorEngine';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAppStore } from '../../stores/useAppStore';
import { Toaster } from 'sonner';
import '../../styles/components/layout.css';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { 
    isSettingsOpen, setSettingsOpen, 
    sidebarVisible, 
    isImportModalOpen, setImportModalOpen, 
    isProfileOpen, setProfileOpen, 
    isCommitModalOpen, setCommitModalOpen: setCommitModalOpenFn, 
    isGlobalVariablesModalOpen, setGlobalVariablesModalOpen,
    commitModalStatus, commitModalPath, commitModalRefresh,
    isCreateFlowModalOpen, setCreateFlowModalOpen 
  } = useAppStore();
  
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
      
      {/* Modals are now moved outside main layout for better isolation, many use Portals anyway */}
      <CommandPalette />
      <MonitorEngine />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <AddEnvironmentModal />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
      <GlobalVariablesModal isOpen={isGlobalVariablesModalOpen} onClose={() => setGlobalVariablesModalOpen(false)} />
      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setCommitModalOpenFn(false)}
        status={commitModalStatus}
        workspacePath={commitModalPath}
        refreshStatus={commitModalRefresh || undefined}
      />
      <CreateFlowModal isOpen={isCreateFlowModalOpen} onClose={() => setCreateFlowModalOpen(false)} />
      <Toaster position="bottom-right" richColors theme="dark" />
    </div>
  );
}
