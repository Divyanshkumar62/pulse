import { create } from 'zustand';
import { Flow, FlowNode, FlowEdge, HttpResponse } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';

export interface ExecutionLog {
  id: string;
  timestamp: number;
  nodeId: string;
  message: string;
  level: 'info' | 'success' | 'error' | 'warn';
  latencyMs?: number;
}

interface FlowStore {
  flows: Flow[];
  activeFlowId: string | null;
  isLoading: boolean;
  executionState: 'idle' | 'running' | 'done' | 'error';
  executionLogs: ExecutionLog[];
  
  initialize: () => Promise<void>;
  setActiveFlowId: (id: string | null) => void;
  addFlow: (flow: Flow) => void;
  updateFlow: (id: string, updates: Partial<Flow>) => void;
  deleteFlow: (id: string) => void;
  
  setExecutionState: (state: 'idle' | 'running' | 'done' | 'error') => void;
  addLog: (log: ExecutionLog) => void;
  clearLogs: () => void;
  updateNodeData: (nodeId: string, data: Partial<FlowNode['data']>) => void;
  
  saveFlowsToDisk: () => Promise<void>;
  loadFlowsFromDisk: (workspacePath: string) => Promise<void>;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  flows: [],
  activeFlowId: null,
  isLoading: false,
  executionState: 'idle',
  executionLogs: [],

  initialize: async () => {
    // Initial loading happens via WorkspaceStore
  },

  setActiveFlowId: (id) => set({ activeFlowId: id, executionState: 'idle', executionLogs: [] }),

  addFlow: (flow) => set((state) => ({ flows: [...state.flows, flow] })),

  updateFlow: (id, updates) => set((state) => ({
    flows: state.flows.map((f) => f.id === id ? { ...f, ...updates } : f)
  })),

  deleteFlow: (id) => set((state) => ({
    flows: state.flows.filter((f) => f.id !== id),
    activeFlowId: state.activeFlowId === id ? null : state.activeFlowId
  })),

  setExecutionState: (executionState) => set({ executionState }),

  addLog: (log) => set((state) => ({
    executionLogs: [...state.executionLogs, log]
  })),

  clearLogs: () => set({ executionLogs: [] }),

  updateNodeData: (nodeId, data) => {
    const { activeFlowId, flows } = get();
    if (!activeFlowId) return;

    set({
      flows: flows.map(f => {
        if (f.id !== activeFlowId) return f;
        return {
          ...f,
          nodes: f.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)
        };
      })
    });
  },

  saveFlowsToDisk: async () => {
    const { flows } = get();
    const activeWorkspace = useWorkspaceStore.getState().workspaces.find(
      w => w.id === useWorkspaceStore.getState().activeWorkspaceId
    );
    
    let path = activeWorkspace?.path;
    if (!path) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        path = await invoke<string>('create_data_dir');
      } catch (e) {
        console.error('[Pulse FlowStore] Failed to get default data directory for saving:', e);
        return;
      }
    }

    try {
      const { saveFlowsToDisk } = await import('../hooks/useTauri');
      console.log(`[Pulse FlowStore] Saving flows to disk at: ${path}. Flows count: ${flows.length}`);
      await saveFlowsToDisk(path, flows);
    } catch (e) {
      console.error('[Pulse FlowStore] Failed to save flows:', e);
    }
  },

  loadFlowsFromDisk: async (workspacePath: string) => {
    set({ isLoading: true });
    try {
      const { loadFlowsFromWorkspace } = await import('../hooks/useTauri');
      const flows = await loadFlowsFromWorkspace(workspacePath);
      
      // Deduplicate flows by ID to prevent UI crashes with duplicate keys
      const uniqueFlows = Array.from(new Map(flows.map(f => [f.id, f])).values());
      set({ flows: uniqueFlows });
    } catch (e) {
      console.error('[FlowStore] Failed to load flows:', e);
    } finally {
      set({ isLoading: false });
    }
  }
}));

// Auto-save debounced (reduced to 500ms to prevent data loss on rapid app restarts)
let saveTimeout: any = null;
useFlowStore.subscribe((state, prevState) => {
  if (state.flows === prevState.flows) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    state.saveFlowsToDisk();
  }, 500);
});
