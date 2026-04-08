import { create } from 'zustand';
import { Flow, FlowNode, FlowEdge, HttpResponse } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';

interface FlowStore {
  flows: Flow[];
  activeFlowId: string | null;
  executionState: 'idle' | 'running' | 'paused' | 'done' | 'error';
  flowState: Record<string, any>;
  
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
  
  // Persistence
  saveFlowsToDisk: () => Promise<void>;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  flows: [],
  activeFlowId: null,
  executionState: 'idle',
  flowState: {},

  addFlow: (flow: Flow) => set((state) => ({ flows: [...state.flows, flow] })),

  updateFlow: (id, updates) => set((state) => ({
    flows: state.flows.map((f) => (f.id === id ? { ...f, ...updates } : f))
  })),

  deleteFlow: (id) => set((state) => ({
    flows: state.flows.filter((f) => f.id !== id),
    activeFlowId: state.activeFlowId === id ? null : state.activeFlowId
  })),

  setActiveFlow: (id) => set({ activeFlowId: id }),

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

  resetFlowState: () => set({ flowState: {}, executionState: 'idle' }),

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
