import SandboxWorker from '../workers/sandbox.worker?worker';
import { SandboxRequest, SandboxResponse, LogEntry, TestResult } from '../types/sandbox';

export interface ExecutionResult {
  logs: LogEntry[];
  tests: TestResult[];
  context: any;
  error?: string;
}

let persistentWorker: Worker | null = null;

function getWorker(): Worker {
  if (!persistentWorker) {
    persistentWorker = new SandboxWorker();
  }
  return persistentWorker;
}

function respawnWorker() {
  if (persistentWorker) {
    persistentWorker.terminate();
    persistentWorker = null;
  }
  persistentWorker = new SandboxWorker();
}

export function resetSandbox() {
  if (persistentWorker) {
    persistentWorker.terminate();
    persistentWorker = null;
  }
}

export function executeScript(script: string, context: any): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = getWorker();
    } catch (e) {
      reject(new Error(`Failed to instantiate sandbox worker: ${e instanceof Error ? e.message : String(e)}`));
      return;
    }

    const logs: LogEntry[] = [];
    
    // Timeout security measure: terminate if executing > 3000ms
    const timeoutId = setTimeout(() => {
      respawnWorker();
      reject(new Error('Timeout Error: Script execution exceeded 3000ms limit (infinite loop detected).'));
    }, 3000) as any;

    const cleanup = () => {
      clearTimeout(timeoutId);
      worker.onmessage = null;
      worker.onerror = null;
    };

    worker.onmessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      if (type === 'log') {
        logs.push(data as LogEntry);
      } else if (type === 'result') {
        cleanup();
        
        const response = data as SandboxResponse;
        resolve({
          logs: response.logs,
          tests: response.tests,
          context: response.context,
          error: response.error,
        });
      }
    };

    worker.onerror = (err) => {
      cleanup();
      respawnWorker();
      reject(new Error(err.message || 'Unknown sandbox worker error'));
    };

    // Send payload to start execution
    const requestPayload: SandboxRequest = { script, context };
    worker.postMessage(requestPayload);
  });
}
