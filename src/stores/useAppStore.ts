import { create } from 'zustand';

type SidebarTab = 'collections' | 'environments' | 'history' | 'mock-servers' | 'monitor' | 'teams';
type ResponsePosition = 'bottom' | 'right';

interface AppStore {
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  sidebarVisible: boolean;
  isSettingsOpen: boolean;
  responsePosition: ResponsePosition;
  responseHeight: number;
  responseWidth: number;
  
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  setResponsePosition: (position: ResponsePosition) => void;
  setResponseHeight: (height: number) => void;
  setResponseWidth: (width: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarTab: 'collections',
  sidebarWidth: 280,
  sidebarVisible: true,
  isSettingsOpen: false,
  responsePosition: 'bottom',
  responseHeight: 400,
  responseWidth: 500,
  
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setResponsePosition: (position) => set({ responsePosition: position }),
  setResponseHeight: (height) => set({ responseHeight: height }),
  setResponseWidth: (width) => set({ responseWidth: width }),
}));
