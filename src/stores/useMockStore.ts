import { create } from 'zustand';
import { MockServer, MockRoute } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from './useWorkspaceStore';

interface MockStore {
  mockServers: MockServer[];
  activeMockServerId: string | null;
  isLoading: boolean;

  initialize: () => Promise<void>;
  addMockServer: (name: string, port: number) => Promise<void>;
  updateMockServer: (id: string, updates: Partial<MockServer>) => Promise<void>;
  deleteMockServer: (id: string) => Promise<void>;
  setActiveMockServerId: (id: string | null) => void;
  startMockServer: (id: string) => Promise<void>;
  stopMockServer: (id: string) => Promise<void>;
  saveMockServersToDisk: () => Promise<void>;
}

const getWorkspacePath = () => {
  const state = useWorkspaceStore.getState();
  return state.workspaces.find(w => w.id === state.activeWorkspaceId)?.path;
};

const isTauri = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export const useMockStore = create<MockStore>((set, get) => ({
  mockServers: [],
  activeMockServerId: null,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      let servers: MockServer[] = [];
      
      if (isTauri()) {
        const workspacePath = getWorkspacePath();
        if (workspacePath) {
          servers = await invoke<MockServer[]>('load_workspace_mock_servers', { workspacePath });
        } else {
          servers = await invoke<MockServer[]>('load_mock_servers');
        }

        // Check which servers are actually running in the backend
        const runningIds = await invoke<string[]>('get_running_mock_servers');
        
        // Update statuses based on what's actually running
        const verifiedServers = servers.map(server => ({
          ...server,
          status: runningIds.includes(server.id) ? ('active' as const) : ('inactive' as const)
        }));
        servers = verifiedServers;
      } else {
        const saved = localStorage.getItem('pulse_mock_servers');
        if (saved) {
          servers = JSON.parse(saved);
        }
      }

      set({
        mockServers: servers,
        activeMockServerId: servers.length > 0 ? servers[0].id : null
      });
    } catch (e) {
      console.error('[Pulse] Failed to load mock servers:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addMockServer: async (name, port) => {
    const newServer: MockServer = {
      id: crypto.randomUUID(),
      name,
      port,
      routes: [],
      status: 'inactive'
    };

    const updated = [...get().mockServers, newServer];
    set({ mockServers: updated, activeMockServerId: newServer.id });
    await get().saveMockServersToDisk();
  },

  updateMockServer: async (id, updates) => {
    const updated = get().mockServers.map(server => 
      server.id === id ? { ...server, ...updates } : server
    );
    set({ mockServers: updated });
    await get().saveMockServersToDisk();

    // If active server is modified (e.g. routes change) and it's active, we should restart it in the backend
    const server = updated.find(s => s.id === id);
    if (server && server.status === 'active' && isTauri()) {
      try {
        await invoke('stop_mock_server', { id });
        await invoke('start_mock_server', { 
          id: server.id, 
          port: server.port, 
          routes: server.routes.map(r => ({
            id: r.id,
            path: r.path,
            method: r.method,
            statusCode: r.statusCode,
            responseBody: r.responseBody,
            headers: r.headers
          }))
        });
      } catch (e) {
        console.error('[Pulse] Failed to restart running mock server on updates:', e);
        // Set inactive if restart failed
        const fallback = get().mockServers.map(s => 
          s.id === id ? { ...s, status: 'inactive' as const } : s
        );
        set({ mockServers: fallback });
        await get().saveMockServersToDisk();
      }
    }
  },

  deleteMockServer: async (id) => {
    const server = get().mockServers.find(s => s.id === id);
    if (server && server.status === 'active' && isTauri()) {
      try {
        await invoke('stop_mock_server', { id });
      } catch (e) {
        console.error(e);
      }
    }

    const updated = get().mockServers.filter(s => s.id !== id);
    const { activeMockServerId } = get();
    set({ 
      mockServers: updated,
      activeMockServerId: activeMockServerId === id ? (updated[0]?.id || null) : activeMockServerId
    });
    await get().saveMockServersToDisk();
  },

  setActiveMockServerId: (id) => {
    set({ activeMockServerId: id });
  },

  startMockServer: async (id) => {
    const server = get().mockServers.find(s => s.id === id);
    if (!server) return;

    if (isTauri()) {
      try {
        await invoke('start_mock_server', { 
          id: server.id, 
          port: server.port, 
          routes: server.routes.map(r => ({
            id: r.id,
            path: r.path,
            method: r.method,
            statusCode: r.statusCode,
            responseBody: r.responseBody,
            headers: r.headers
          }))
        });
      } catch (e: any) {
        console.error('[Pulse] Failed to start mock server:', e);
        throw new Error(e.toString());
      }
    }
    
    const updated = get().mockServers.map(s => 
      s.id === id ? { ...s, status: 'active' as const } : s
    );
    set({ mockServers: updated });
    await get().saveMockServersToDisk();
  },

  stopMockServer: async (id) => {
    const server = get().mockServers.find(s => s.id === id);
    if (!server) return;

    if (isTauri()) {
      try {
        await invoke('stop_mock_server', { id });
      } catch (e) {
        console.error('[Pulse] Failed to stop mock server:', e);
      }
    }
    
    const updated = get().mockServers.map(s => 
      s.id === id ? { ...s, status: 'inactive' as const } : s
    );
    set({ mockServers: updated });
    await get().saveMockServersToDisk();
  },

  saveMockServersToDisk: async () => {
    const servers = get().mockServers;
    if (isTauri()) {
      try {
        const workspacePath = getWorkspacePath();
        if (workspacePath) {
          await invoke('save_workspace_mock_servers', { workspacePath, servers });
        } else {
          await invoke('save_mock_servers', { servers });
        }
      } catch (e) {
        console.error('[Pulse] Failed to save mock servers to disk:', e);
      }
    } else {
      localStorage.setItem('pulse_mock_servers', JSON.stringify(servers));
    }
  }
}));
