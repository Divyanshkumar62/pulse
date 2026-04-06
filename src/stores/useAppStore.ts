import { create } from 'zustand';

type SidebarTab = 'collections' | 'environments' | 'history' | 'mock-servers' | 'monitor' | 'teams';
type ResponsePosition = 'bottom' | 'right';

interface AppStore {
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  sidebarVisible: boolean;
  isSettingsOpen: boolean;
  isProfileOpen: boolean;
  responsePosition: ResponsePosition;
  responseHeight: number;
  responseWidth: number;
  selectedMonitorId: string | null;
  selectedEnvironmentId: string | null;
  isAddEnvironmentModalOpen: boolean;
  
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;
  setResponsePosition: (position: ResponsePosition) => void;
  setResponseHeight: (height: number) => void;
  setResponseWidth: (width: number) => void;
  setSelectedMonitorId: (id: string | null) => void;
  setSelectedEnvironmentId: (id: string | null) => void;
  setAddEnvironmentModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarTab: 'collections',
  sidebarWidth: 280,
  sidebarVisible: true,
  isSettingsOpen: false,
  isProfileOpen: false,
  responsePosition: 'bottom',
  responseHeight: 400,
  responseWidth: 500,
  selectedMonitorId: null,
  selectedEnvironmentId: null,
  isAddEnvironmentModalOpen: false,
  
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setProfileOpen: (open) => set({ isProfileOpen: open }),
  setResponsePosition: (position) => set({ responsePosition: position }),
  setResponseHeight: (height) => set({ responseHeight: height }),
  setResponseWidth: (width) => set({ responseWidth: width }),
  setSelectedMonitorId: (id) => set({ selectedMonitorId: id }),
  setSelectedEnvironmentId: (id) => set({ selectedEnvironmentId: id }),
  setAddEnvironmentModalOpen: (open) => set({ isAddEnvironmentModalOpen: open }),
}));
