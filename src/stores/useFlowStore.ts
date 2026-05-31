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
  resetFlowStatus: (flowId: string) => void;
  
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

  resetFlowStatus: (flowId) => {
    set(state => ({
      flows: state.flows.map(f => {
        if (f.id !== flowId) return f;
        return {
          ...f,
          nodes: f.nodes.map(n => ({
            ...n,
            data: { ...n.data, status: 'idle', lastResponse: undefined, triggeredHandle: undefined }
          }))
        };
      })
    }));
  },

  saveFlowsToDisk: async () => {
    const { flows } = get();
    const activeWorkspace = useWorkspaceStore.getState().workspaces.find(
      w => w.id === useWorkspaceStore.getState().activeWorkspaceId
    );
    if (!activeWorkspace?.path) return;

    try {
      const { saveFlowsToDisk } = await import('../hooks/useTauri');
      await saveFlowsToDisk(activeWorkspace.path, flows);
    } catch (e) {
      console.error('[FlowStore] Failed to save flows:', e);
    }
  },

  loadFlowsFromDisk: async (workspacePath: string) => {
    set({ isLoading: true });
    try {
      const { loadFlowsFromWorkspace } = await import('../hooks/useTauri');
      const flows = await loadFlowsFromWorkspace(workspacePath);
      
      const uniqueFlows = Array.from(new Map(flows.map(f => [f.id, f])).values());
      set({ flows: uniqueFlows });
    } catch (e) {
      console.error('[FlowStore] Failed to load flows:', e);
    } finally {
      set({ isLoading: false });
    }
  }
}));

// Auto-save debounced
let saveTimeout: any = null;
useFlowStore.subscribe((state, prevState) => {
  if (state.flows === prevState.flows) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    state.saveFlowsToDisk();
  }, 2000);
});
