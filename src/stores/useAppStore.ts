import { create } from 'zustand';

type SidebarTab = 'collections' | 'history' | 'environments' | 'teams';

interface AppStore {
  sidebarTab: SidebarTab;
  sidebarWidth: number;
  sidebarVisible: boolean;
  isSettingsOpen: boolean;
  
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarTab: 'collections',
  sidebarWidth: 280,
  sidebarVisible: true,
  isSettingsOpen: false,
  
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
}));
