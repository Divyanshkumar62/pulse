import { Flow, FlowNode, HttpResponse } from '../types';
import { useFlowStore } from '../stores/useFlowStore';
import { useEnvStore } from '../stores/useEnvStore';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export class FlowRunner {
  private flow: Flow;

  constructor(flow: Flow) {
    this.flow = flow;
  }

  async run() {
    const { setExecutionState, clearLogs, updateNodeData, addLog } = useFlowStore.getState();
    const { environments } = useEnvStore.getState();
    
    const environment = environments.find(e => e.id === this.flow.environmentId);
    
    setExecutionState('running');
    clearLogs();

    // 1. Setup listeners for real-time updates from Rust
    const unlistenStatus = await listen<{ node_id: string, status: string, last_response?: HttpResponse }>(
      'flow-node-status', 
      (event) => {
        const { node_id, status, last_response } = event.payload as any;
        updateNodeData(node_id, { status, lastResponse: last_response });
      }
    );

    const unlistenLog = await listen<{ node_id: string, message: string, level: string }>(
      'flow-log',
      (event) => {
        const { node_id, message, level } = event.payload as any;
        addLog({
          id: Math.random().toString(36).substring(7),
          nodeId: node_id,
          message,
          level: level as any,
          timestamp: Date.now()
        });
      }
    );

    try {
      // 2. Invoke the Rust Flow Runner
      await invoke('run_flow', { 
        flow: this.flow, 
        environment: environment || null 
      });
      setExecutionState('done');
    } catch (error: any) {
      console.error('[FlowRunner] Execution failed:', error);
      setExecutionState('error');
      addLog({
        id: 'error-final',
        nodeId: 'system',
        message: `Execution failed: ${error}`,
        level: 'error',
        timestamp: Date.now()
      });
    } finally {
      // Cleanup listeners
      unlistenStatus();
      unlistenLog();
    }
  }
}
