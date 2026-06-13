import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeScript } from '../SandboxEngine';

// Keep track of the mocked worker instance to inspect actions/timing
let mockWorkerInstance: any = null;

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((err: ErrorEvent) => void) | null = null;
  terminated = false;
  scriptUrl: string;
  options: any;

  constructor(scriptUrl: string, options?: any) {
    this.scriptUrl = scriptUrl;
    this.options = options;
    mockWorkerInstance = this;
  }

  postMessage(payload: any) {
    const { script, context } = payload;
    
    // Simulating the actual sandbox.worker.ts logic in JS environment
    if (script.includes('infinite loop')) {
      // Do nothing, simulate infinite execution so timeout gets triggered
      return;
    }

    if (script.includes('throw new Error')) {
      // Simulate syntax/runtime execution error in worker
      const errorMsg = 'Mocked execution error';
      const logs = [{ type: 'error', message: `Execution Error: ${errorMsg}`, timestamp: new Date().toISOString() }];
      
      if (this.onmessage) {
        this.onmessage({
          data: {
            type: 'log',
            data: logs[0]
          }
        } as any);

        this.onmessage({
          data: {
            type: 'result',
            data: {
              logs,
              tests: [],
              context,
              error: errorMsg
            }
          }
        } as any);
      }
      return;
    }

    // Standard success path
    const logs: any[] = [];
    const tests: any[] = [];

    // Catch console logs
    if (script.includes('console.log')) {
      const logEntry = { type: 'log', message: 'Hello from script', timestamp: new Date().toISOString() };
      logs.push(logEntry);
      if (this.onmessage) {
        this.onmessage({
          data: { type: 'log', data: logEntry }
        } as any);
      }
    }

    // Catch tests
    if (script.includes('pulse.test')) {
      tests.push({ name: 'assert status', passed: true });
    }

    if (this.onmessage) {
      this.onmessage({
        data: {
          type: 'result',
          data: {
            logs,
            tests,
            context
          }
        }
      } as any);
    }
  }

  terminate() {
    this.terminated = true;
  }
}

// Assign the mocked Worker constructor to globalThis for jsdom test runner compatibility
(globalThis as any).Worker = MockWorker;

describe('SandboxEngine', () => {
  beforeEach(() => {
    mockWorkerInstance = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should successfully run script and collect logs & tests', async () => {
    const script = `
      console.log('Hello from script');
      pulse.test('assert status', () => {});
    `;
    const context = { value: 42 };

    const executionPromise = executeScript(script, context);
    const result = await executionPromise;

    expect(result.error).toBeUndefined();
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].message).toBe('Hello from script');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('assert status');
    expect(result.tests[0].passed).toBe(true);
    expect(mockWorkerInstance.terminated).toBe(true);
  });

  it('should catch errors thrown during script execution in worker', async () => {
    const script = `throw new Error('Failure');`;
    const context = {};

    const result = await executeScript(script, context);

    expect(result.error).toBe('Mocked execution error');
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].type).toBe('error');
    expect(mockWorkerInstance.terminated).toBe(true);
  });

  it('should terminate worker and reject if execution exceeds 3000ms (timeout)', async () => {
    const script = `// infinite loop`;
    const context = {};

    const executionPromise = executeScript(script, context);

    // Fast-forward time to trigger timeout
    vi.advanceTimersByTime(3000);

    await expect(executionPromise).rejects.toThrow('Timeout Error');
    expect(mockWorkerInstance.terminated).toBe(true);
  });
});
