import { create } from 'zustand';
import { GitStatus } from '../hooks/useTauri';

type SidebarTab = 'collections' | 'environments' | 'history' | 'mock-servers' | 'monitor' | 'teams' | 'flows';
type ResponsePosition = 'bottom' | 'right';

interface AppStore {
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  sidebarVisible: boolean;
  isSettingsOpen: boolean;
  isProfileOpen: boolean;
  isCommandPaletteOpen: boolean;
  responsePosition: ResponsePosition;
  responseHeight: number;
  responseWidth: number;
  selectedMonitorId: string | null;
  selectedEnvironmentId: string | null;
  isAddEnvironmentModalOpen: boolean;
  isImportModalOpen: boolean;
  isCommitModalOpen: boolean;
  isGlobalVariablesModalOpen: boolean;
  isCreateFlowModalOpen: boolean;
  commitModalStatus: GitStatus | null;
  commitModalPath: string;
  commitModalRefresh: (() => void) | null;
  
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setResponsePosition: (position: ResponsePosition) => void;
  setResponseHeight: (height: number) => void;
  setResponseWidth: (width: number) => void;
  setSelectedMonitorId: (id: string | null) => void;
  setSelectedEnvironmentId: (id: string | null) => void;
  setAddEnvironmentModalOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  setGlobalVariablesModalOpen: (open: boolean) => void;
  setCommitModalOpen: (open: boolean, status?: GitStatus | null, path?: string, refresh?: () => void) => void;
  setCreateFlowModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarTab: 'collections',
  sidebarWidth: 280,
  sidebarVisible: true,
  isSettingsOpen: false,
  isProfileOpen: false,
  isCommandPaletteOpen: false,
  responsePosition: 'bottom',
  responseHeight: 400,
  responseWidth: 500,
  selectedMonitorId: null,
  selectedEnvironmentId: null,
  isAddEnvironmentModalOpen: false,
  isImportModalOpen: false,
  isCommitModalOpen: false,
  isGlobalVariablesModalOpen: false,
  isCreateFlowModalOpen: false,
  commitModalStatus: null,
  commitModalPath: '',
  commitModalRefresh: null,
  
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setProfileOpen: (open) => set({ isProfileOpen: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setResponsePosition: (position) => set({ responsePosition: position }),
  setResponseHeight: (height) => set({ responseHeight: height }),
  setResponseWidth: (width) => set({ responseWidth: width }),
  setSelectedMonitorId: (id) => set({ selectedMonitorId: id }),
  setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),
  setAddEnvironmentModalOpen: (open) => set({ isAddEnvironmentModalOpen: open }),
  setImportModalOpen: (open) => set({ isImportModalOpen: open }),
  setGlobalVariablesModalOpen: (open) => set({ isGlobalVariablesModalOpen: open }),
  setCommitModalOpen: (open, status, path, refresh) => set({
    isCommitModalOpen: open,
    commitModalStatus: status ?? null,
    commitModalPath: path ?? '',
    commitModalRefresh: refresh ?? null
  }),
  setCreateFlowModalOpen: (open) => set({ isCreateFlowModalOpen: open }),
}));
