import { Flow, FlowNode, HttpResponse } from '../types';
import { useFlowStore } from '../stores/useFlowStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { sendRequest } from '../hooks/useTauri';

interface ExecutionLog {
  timestamp: number;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  nodeId?: string;
  nodeName?: string;
  data?: any;
}

export class FlowRunner {
  private flow: Flow;
  private flowState: Record<string, any> = {};
  private visited: Set<string> = new Set();
  private logs: ExecutionLog[] = [];

  constructor(flow: Flow) {
    this.flow = flow;
  }

  async run(): Promise<ExecutionLog[]> {
    this.logs = [];
    this.flowState = {};
    this.visited = new Set();

    this.log('info', `Starting flow: ${this.flow.name}`, undefined, { nodeCount: this.flow.nodes.length });
    
    useFlowStore.getState().setExecutionState('running');
    useFlowStore.getState().resetFlowState();

    try {
      const sortedNodes = this.topologicalSort();
      
      for (const node of sortedNodes) {
        await this.executeNode(node);
        
        if (useFlowStore.getState().executionState === 'error') {
          break;
        }
      }

      const finalState = useFlowStore.getState().executionState;
      if (finalState !== 'error') {
        useFlowStore.getState().setExecutionState('done');
        this.log('success', 'Flow completed successfully');
      }
    } catch (error: any) {
      console.error('[FlowRunner] Flow execution failed:', error);
      useFlowStore.getState().setExecutionState('error');
      this.log('error', `Flow failed: ${error.message}`);
    }

    return this.logs;
  }

  private topologicalSort(): FlowNode[] {
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, FlowNode>();

    this.flow.nodes.forEach(node => {
      inDegree.set(node.id, 0);
      nodeMap.set(node.id, node);
    });

    this.flow.edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: FlowNode[] = [];
    this.flow.nodes.forEach(node => {
      if ((inDegree.get(node.id) || 0) === 0) {
        queue.push(node);
      }
    });

    const sorted: FlowNode[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      this.flow.edges
        .filter(e => e.source === node.id)
        .forEach(edge => {
          const newDegree = (inDegree.get(edge.target) || 0) - 1;
          inDegree.set(edge.target, newDegree);
          if (newDegree === 0) {
            const nextNode = nodeMap.get(edge.target);
            if (nextNode) queue.push(nextNode);
          }
        });
    }

    if (sorted.length !== this.flow.nodes.length) {
      this.log('warn', 'Circular dependency detected, executing remaining nodes');
      const remaining = this.flow.nodes.filter(n => !sorted.includes(n));
      sorted.push(...remaining);
    }

    return sorted;
  }

  private async executeNode(node: FlowNode): Promise<void> {
    if (this.visited.has(node.id)) return;
    this.visited.add(node.id);

    this.log('info', `Executing: ${node.data.name}`, node.id, { type: node.type });

    useFlowStore.getState().updateFlowNodeStatus(this.flow.id, node.id, 'running');

    try {
      let response: HttpResponse | undefined;

      switch (node.type) {
        case 'request':
          response = await this.executeRequestNode(node);
          break;
        case 'delay':
          await this.executeDelayNode(node);
          break;
        case 'logic':
          await this.executeLogicNode(node);
          break;
        default:
          this.log('warn', `Unknown node type: ${node.type}`, node.id);
      }

      useFlowStore.getState().updateFlowNodeStatus(this.flow.id, node.id, 'success', response);
      this.log('success', `Completed: ${node.data.name}`, node.id, { status: response?.status });

    } catch (error: any) {
      useFlowStore.getState().updateFlowNodeStatus(this.flow.id, node.id, 'error');
      this.log('error', `Failed: ${node.data.name} - ${error.message}`, node.id);
      useFlowStore.getState().setExecutionState('error');
      throw error;
    }
  }

  private async executeRequestNode(node: FlowNode): Promise<HttpResponse> {
    const url = node.data.url || '';
    const method = node.data.method || 'GET';
    const headers: Record<string, string> = {};

    if (node.data.headers) {
      node.data.headers
        .filter(h => h.enabled)
        .forEach(h => {
          headers[h.key] = this.hydrateString(h.value);
        });
    }

    const hydratedUrl = this.hydrateString(url);
    const body = { type: 'none' as const, content: '' };
    
    const settings = useSettingsStore.getState().settings;
    if (!settings) throw new Error('User settings not configured');

    const response = await sendRequest(method, hydratedUrl, headers, body, settings);

    if (node.data.mappings && response.body) {
      try {
        const bodyObj = JSON.parse(response.body);
        for (const mapping of node.data.mappings) {
          const value = this.getValueByPath(bodyObj, mapping.sourcePath);
          if (value !== undefined) {
            useFlowStore.getState().setFlowStateValue(mapping.targetVar, value);
            this.flowState[mapping.targetVar] = value;
            this.log('info', `Extracted ${mapping.targetVar} = ${JSON.stringify(value)}`, node.id);
          }
        }
      } catch (e) {
        this.log('warn', 'Failed to parse response body for mappings', node.id);
      }
    }

    return response;
  }

  private async executeDelayNode(node: FlowNode): Promise<void> {
    const delayMs = node.data.delayMs || 1000;
    this.log('info', `Waiting ${delayMs}ms...`, node.id);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private async executeLogicNode(node: FlowNode): Promise<void> {
    const condition = node.data.condition || '';
    
    if (condition) {
      const result = this.evaluateCondition(condition);
      this.log('info', `Condition "${condition}" = ${result}`, node.id, { result });
    }
  }

  private evaluateCondition(condition: string): boolean {
    try {
      const hydrated = this.hydrateString(condition);
      
      if (hydrated.includes('===') || hydrated.includes('==')) {
        return new Function('return ' + hydrated)();
      }
      
      return !!hydrated;
    } catch (e) {
      this.log('warn', 'Failed to evaluate condition: ' + condition);
      return false;
    }
  }

  private hydrateString(str: string): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
      const trimmedKey = key.trim();
      return this.flowState[trimmedKey] ?? _match;
    });
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.').filter(p => p.length > 0);
    let current: any = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    
    return current;
  }

  private log(level: ExecutionLog['level'], message: string, nodeId?: string, data?: any) {
    const entry: ExecutionLog = {
      timestamp: Date.now(),
      level,
      message,
      nodeId,
      nodeName: nodeId ? this.flow.nodes.find(n => n.id === nodeId)?.data.name : undefined,
      data,
    };
    
    this.logs.push(entry);
    
    const prefix = {
      info: '[INFO]',
      success: '[SUCCESS]',
      error: '[ERROR]',
      warn: '[WARN]',
    }[level];
    
    console.log('[FlowRunner] ' + prefix + ' ' + message, data || '');
  }
}