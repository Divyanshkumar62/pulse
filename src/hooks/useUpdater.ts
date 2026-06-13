import { useEffect } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { create } from 'zustand';

interface UpdaterState {
  updateAvailable: Update | null;
  isChecking: boolean;
  setUpdateAvailable: (update: Update | null) => void;
  checkForUpdates: (forceMock?: boolean) => Promise<void>;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  updateAvailable: null,
  isChecking: false,
  setUpdateAvailable: (update) => set({ updateAvailable: update }),
  checkForUpdates: async (forceMock = false) => {
    try {
      if (forceMock || (import.meta as any).env?.VITE_FORCE_UPDATE_MODAL === 'true') {
        set({
          updateAvailable: {
            version: '1.0.99',
            date: new Date().toISOString(),
            body: 'This is a mock update for testing the updater UI.\n\n* Added feature X\n* Fixed bug Y',
            downloadAndInstall: async () => {
              console.log('[Mock] Downloading and installing...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              console.log('[Mock] Install complete.');
            }
          } as unknown as Update
        });
        return;
      }

      set({ isChecking: true });
      const update = await check();
      if (update && update.available) {
        set({ updateAvailable: update });
      } else {
        set({ updateAvailable: null });
      }
    } catch (err) {
      console.error('[Updater] Failed to check for updates:', err);
    } finally {
      set({ isChecking: false });
    }
  }
}));

export function useUpdater() {
  const { updateAvailable, isChecking, setUpdateAvailable, checkForUpdates } = useUpdaterStore();

  useEffect(() => {
    // Check on mount if not already checked or available
    if (!updateAvailable) {
      checkForUpdates();
    }
  }, []);

  return {
    updateAvailable,
    isChecking,
    setUpdateAvailable,
    checkForUpdates
  };
}

