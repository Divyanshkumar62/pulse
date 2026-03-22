import { create } from 'zustand';
import { UserSettings, getUserSettings, saveUserSettings } from '../hooks/useTauri';

interface SettingsStore {
  settings: UserSettings | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  isLoading: false,
  
  initialize: async () => {
    set({ isLoading: true });
    try {
      const settings = await getUserSettings();
      set({ settings });
    } catch (error) {
      set({ 
        settings: { 
          email: 'user@example.com', 
          name: 'User', 
          default_timeout_secs: 30, 
          follow_redirects: true, 
          verify_ssl: true,
          theme: 'dark'
        } 
      });
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateSettings: async (updates) => {
    const { settings } = get();
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    set({ settings: newSettings });
    await saveUserSettings(newSettings);
  }
}));

// Apply theme class to document root whenever it changes
useSettingsStore.subscribe((state) => {
  const theme = state.settings?.theme;
  if (theme) {
    const root = document.documentElement;
    // Remove all existing theme classes
    const themeClasses = Array.from(root.classList).filter(c => c.startsWith('theme-'));
    themeClasses.forEach(c => root.classList.remove(c));
    
    // Add new theme class (except for default "dark")
    if (theme !== 'dark') {
      root.classList.add(`theme-${theme}`);
    }
  }
});
