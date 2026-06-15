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
            version: '1.1.0',
            date: new Date().toISOString(),
            body: `Pulse v1.1.0 Release Notes — HTTP Load Testing Engine

[New Feature: Enterprise Load Testing Engine]
• High-Performance Concurrency: Built a native, multi-threaded load engine using Rust and Tokio tasks to simulate up to 500 Virtual Users seamlessly.
• Architectural Protection: Implemented Tokio Semaphore in-flight bounding and bounded MPSC backpressure channels to protect local system resources from OOM crashes.
• Microsecond Precision Telemetry: Integrated high-performance 'hdrhistogram' metric bucketing for constant-memory O(1) tracking of P50, P90, P95, and P99 latency percentiles.
• Dual-State Canvas UI: Completely re-architected the main workspace into a dedicated full-width visual suite featuring interactive configuration Builders and real-time SVG throughput/latency Dashboards.
• RAM Optimization: Introduced a stride-based timeline downsampling algorithm that intelligently compresses thousands of snapshots into sleek, lightweight trend lines.
• Report Export System: Integrated native Tauri OS dialogs allowing seamless disk persistence for test summaries in both JSON and CSV formats.

[Performance & Bug Fixes]
• Fixed a Tauri IPC serialization bug involving HashMap error classifications.
• Restructured the application shell to left-justify main dashboard elements for superior readability.
• Streamlined sidebar run histories into high-glanceability cards featuring method truncations and success status iconography.`,
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

