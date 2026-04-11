import { create } from 'zustand';
import { Flow, FlowNode, FlowEdge, HttpResponse } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';

export interface ExecutionLog {
  id: string;
  timestamp: number;
  nodeId?: string;
  nodeName?: string;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  latencyMs?: number;
  data?: any;
}

interface FlowStore {
  flows: Flow[];
  activeFlowId: string | null;
  executionState: 'idle' | 'running' | 'paused' | 'done' | 'error';
  flowState: Record<string, any>;
  logs: ExecutionLog[];
  
  // Actions
  addFlow: (flow: Flow) => void;
  updateFlow: (id: string, updates: Partial<Flow>) => void;
  deleteFlow: (id: string) => void;
  setActiveFlow: (id: string | null) => void;
  
  // Execution
  setExecutionState: (state: 'idle' | 'running' | 'paused' | 'done' | 'error') => void;
  updateFlowNodeStatus: (flowId: string, nodeId: string, status: FlowNode['data']['status'], response?: HttpResponse) => void;
  setFlowStateValue: (key: string, value: any) => void;
  resetFlowState: () => void;
  addLog: (log: Omit<ExecutionLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  
  // Persistence
  saveFlowsToDisk: () => Promise<void>;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  flows: [],
  activeFlowId: null,
  executionState: 'idle',
  flowState: {},
  logs: [],

  addFlow: (flow: Flow) => {
    console.log('[FlowStore] addFlow called with flow:', flow.id);
    set((state) => ({ flows: [...state.flows, flow] }));
    console.log('[FlowStore] flows after add:', get().flows.length);
  },

  updateFlow: (id, updates) => set((state) => ({
    flows: state.flows.map((f) => (f.id === id ? { ...f, ...updates } : f))
  })),

  deleteFlow: (id) => set((state) => ({
    flows: state.flows.filter((f) => f.id !== id),
    activeFlowId: state.activeFlowId === id ? null : state.activeFlowId
  })),

  setActiveFlow: (id) => {
    console.log('[FlowStore] setActiveFlow called with:', id);
    set({ activeFlowId: id });
    console.log('[FlowStore] activeFlowId is now:', get().activeFlowId);
  },

  setExecutionState: (executionState) => set({ executionState }),

  updateFlowNodeStatus: (flowId, nodeId, status, response) => set((state) => ({
    flows: state.flows.map((f) => {
      if (f.id !== flowId) return f;
      return {
        ...f,
        nodes: f.nodes.map((n) => 
          n.id === nodeId ? { ...n, data: { ...n.data, status, lastResponse: response } } : n
        )
      };
    })
  })),

  setFlowStateValue: (key, value) => set((state) => ({
    flowState: { ...state.flowState, [key]: value }
  })),

  addLog: (log) => set((state) => ({
    logs: [...state.logs, {
      ...log,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now()
    }]
  })),

  clearLogs: () => set({ logs: [] }),

  resetFlowState: () => set({ flowState: {}, executionState: 'idle', logs: [] }),

  saveFlowsToDisk: async () => {
    const activeWorkspace = useWorkspaceStore.getState().workspaces.find(
      w => w.id === useWorkspaceStore.getState().activeWorkspaceId
    );
    const workspacePath = activeWorkspace?.path;
    if (!workspacePath) return;

    // Use a custom invoke for flows if we add it to the backend, 
    // or for now we can bundle it into workspace.json
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_flows_to_disk', { workspacePath, flows: get().flows });
    } catch (e) {
      console.error('[Pulse] Failed to save flows to disk:', e);
    }
  }
}));
