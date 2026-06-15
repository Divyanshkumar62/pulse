import { useEffect } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { create } from 'zustand';

interface UpdaterState {
  updateAvailable: Update | null;
  isChecking: boolean;
  showUpdateModal: boolean;
  setUpdateAvailable: (update: Update | null) => void;
  setShowUpdateModal: (show: boolean) => void;
  checkForUpdates: (forceMock?: boolean) => Promise<void>;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  updateAvailable: null,
  isChecking: false,
  showUpdateModal: false,
  setUpdateAvailable: (update) => set({ updateAvailable: update }),
  setShowUpdateModal: (show) => set({ showUpdateModal: show }),
  checkForUpdates: async (forceMock = false) => {
    try {
      const meta = import.meta as any;
      const isDev = meta.env?.DEV || meta.env?.MODE === 'development';
      const forceMockEnabled = forceMock || (isDev && meta.env?.VITE_FORCE_UPDATE_MODAL === 'true');

      if (forceMockEnabled) {
        console.log('[Updater Log] Forcing mock update modal in development mode');
        set({
          updateAvailable: {
            version: '1.2.0-mock',
            currentVersion: '1.1.1',
            date: new Date().toISOString(),
            body: `Pulse v1.2.0-mock Release Notes — Simulated Update
• Feature A: Mock testing support.
• Feature B: Clean logs.
• Bug Fix C: Focus trapping verification.`,
            rawJson: {
              version: '1.2.0-mock',
              platforms: {
                'windows-x86_64': {
                  url: 'https://github.com/Divyanshkumar62/pulse/releases/download/v1.2.0-mock/pulse-setup.exe',
                  signature: 'mock-sig'
                }
              }
            },
            downloadAndInstall: async (onEvent?: (progress: any) => void) => {
              console.log('[Updater Log] [Mock] downloadAndInstall() started.');
              if (onEvent) {
                onEvent({ event: 'Started', data: { contentLength: 10485760 } }); // 10MB
                await new Promise(resolve => setTimeout(resolve, 400));
                onEvent({ event: 'Progress', data: { chunkLength: 2621440 } }); // 2.5MB
                await new Promise(resolve => setTimeout(resolve, 400));
                onEvent({ event: 'Progress', data: { chunkLength: 5242880 } }); // 5MB
                await new Promise(resolve => setTimeout(resolve, 400));
                onEvent({ event: 'Progress', data: { chunkLength: 2621440 } }); // 2.5MB
                await new Promise(resolve => setTimeout(resolve, 400));
                onEvent({ event: 'Finished' });
              } else {
                await new Promise(resolve => setTimeout(resolve, 1600));
              }
              console.log('[Updater Log] [Mock] downloadAndInstall() completed successfully.');
            }
          } as unknown as Update,
          showUpdateModal: true
        });
        return;
      }

      set({ isChecking: true });
      console.log('[Updater Log] Checking for updates via check()...');
      const update = await check();
      
      if (update) {
        const currentVer = update.currentVersion;
        const availableVer = update.version;
        const platforms = update.rawJson?.platforms as Record<string, any> | undefined;
        // Let's identify the platform target on Windows: typically windows-x86_64
        const targetKey = Object.keys(platforms || {}).find(key => key.includes('windows')) || 'unknown-windows';
        const downloadUrl = platforms?.[targetKey]?.url || 'unknown-url';

        console.log('[Updater Log] Update found:', availableVer);
        console.log('[Updater Log] Current version:', currentVer);
        console.log('[Updater Log] Selected platform target:', targetKey);
        console.log('[Updater Log] Download URL:', downloadUrl);
        console.log('[Updater Log] Expected installer path: %TEMP%\\tauri\\updater.exe');

        set({ 
          updateAvailable: update,
          showUpdateModal: true 
        });
      } else {
        console.log('[Updater Log] No updates available.');
        set({ updateAvailable: null });
      }
    } catch (err) {
      console.error('[Updater Log] Failed to check for updates:', err);
    } finally {
      set({ isChecking: false });
    }
  }
}));

export function useUpdater() {
  const { 
    updateAvailable, 
    isChecking, 
    showUpdateModal,
    setUpdateAvailable, 
    setShowUpdateModal,
    checkForUpdates 
  } = useUpdaterStore();

  useEffect(() => {
    // Check on mount if not already checked or available
    if (!updateAvailable) {
      checkForUpdates();
    }
  }, []);

  return {
    updateAvailable,
    isChecking,
    showUpdateModal,
    setUpdateAvailable,
    setShowUpdateModal,
    checkForUpdates
  };
}

