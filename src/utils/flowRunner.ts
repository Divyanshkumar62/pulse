import { Flow, FlowNode, HttpResponse } from '../types';
import { useFlowStore } from '../stores/useFlowStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { sendRequest } from '../hooks/useTauri';

export class FlowRunner {
  private flow: Flow;
  private visited: Set<string> = new Set();
  private flowState: Record<string, any> = {};

  constructor(flow: Flow) {
    this.flow = flow;
  }

  async run() {
    console.log(`[FlowRunner] Starting execution for flow: ${this.flow.name}`);
    useFlowStore.getState().setExecutionState('running');
    useFlowStore.getState().resetFlowState();
    this.flowState = {};

    const startNode = this.flow.nodes.find(n => n.type === 'start') || this.flow.nodes[0];
    if (!startNode) {
      console.error('[FlowRunner] No start node found');
      useFlowStore.getState().setExecutionState('error');
      return;
    }

    try {
      await this.executeNode(startNode.id);
      useFlowStore.getState().setExecutionState('done');
      console.log('[FlowRunner] Flow execution complete');
    } catch (error) {
      console.error('[FlowRunner] Flow execution failed:', error);
      useFlowStore.getState().setExecutionState('error');
    }
  }

  private async executeNode(nodeId: string) {
    if (this.visited.has(nodeId)) return;
    this.visited.add(nodeId);

    const node = this.flow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    useFlowStore.getState().updateFlowNodeStatus(this.flow.id, nodeId, 'running');

    try {
      switch (node.type) {
        case 'request':
          await this.handleRequestNode(node);
          break;
        case 'delay':
          await new Promise(resolve => setTimeout(resolve, node.data.delayMs || 1000));
          break;
        case 'logic':
          // Simplified logic: execute both paths if they exist, or follow condition
          break;
        default:
          break;
      }

      useFlowStore.getState().updateFlowNodeStatus(this.flow.id, nodeId, 'success');

      // Find next nodes
      const nextEdges = this.flow.edges.filter(e => e.source === nodeId);
      for (const edge of nextEdges) {
        await this.executeNode(edge.target);
      }
    } catch (error: any) {
      useFlowStore.getState().updateFlowNodeStatus(this.flow.id, nodeId, 'error');
      throw error;
    }
  }

  private async handleRequestNode(node: FlowNode) {
    if (!node.data.requestId) throw new Error('Request node missing requestId');

    // Find the request in collection store
    const request = this.findRequest(node.data.requestId);
    if (!request) throw new Error(`Request not found: ${node.data.requestId}`);

    const settings = useSettingsStore.getState().settings;
    if (!settings) throw new Error('User settings not found');

    // 1. Hydrate variables in URL, Body, Headers
    const hydratedUrl = this.hydrateString(request.url);
    const hydratedHeaders: Record<string, string> = {};
    request.headers.forEach((h: any) => {
      if (h.enabled !== false) {
        hydratedHeaders[h.key] = this.hydrateString(h.value);
      }
    });

    // 2. Execute request
    const response = await sendRequest(
      request.method,
      hydratedUrl,
      hydratedHeaders,
      request.body, // In real world we should hydrate body too
      settings
    );

    useFlowStore.getState().updateFlowNodeStatus(this.flow.id, node.id, 'success', response);

    // 3. Process mappings (extract from response and save to flowState)
    if (node.data.mappings && response.body) {
      try {
        const bodyObj = JSON.parse(response.body);
        for (const mapping of node.data.mappings) {
          const value = this.getValueByPath(bodyObj, mapping.sourcePath);
          if (value !== undefined) {
            useFlowStore.getState().setFlowStateValue(mapping.targetVar, value);
            this.flowState[mapping.targetVar] = value;
          }
        }
      } catch (e) {
        console.warn('[FlowRunner] Failed to parse response body for mappings', e);
      }
    }
  }

  private hydrateString(str: string): string {
    // Replace {{flow.varName}} or {{varName}} with values from flowState
    return str.replace(/\{\{(?:flow\.)?([^}]+)\}\}/g, (match, key) => {
      return this.flowState[key.trim()] ?? match;
    });
  }

  private findRequest(requestId: string) {
    const collections = useCollectionStore.getState().collections;
    for (const collection of collections) {
      const req = collection.requests.find(r => r.id === requestId);
      if (req) return req;
      
      const findInFolders = (folders: any[]): any => {
        for (const f of folders) {
          const r = f.requests.find((r: any) => r.id === requestId);
          if (r) return r;
          if (f.folders) {
            const found = findInFolders(f.folders);
            if (found) return found;
          }
        }
      };
      const found = findInFolders(collection.folders);
      if (found) return found;
    }
    return null;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
