import { SandboxRequest, SandboxResponse, LogEntry, TestResult } from '../types/sandbox';

const ctx: Worker = self as any;

const logs: LogEntry[] = [];

function captureLog(type: LogEntry['type'], args: any[]) {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  const logEntry: LogEntry = {
    type,
    message,
    timestamp: new Date().toISOString(),
  };
  logs.push(logEntry);

  // Stream log back incrementally
  ctx.postMessage({ type: 'log', data: logEntry });
}

// Override console methods
console.log = (...args: any[]) => captureLog('log', args);
console.warn = (...args: any[]) => captureLog('warn', args);
console.error = (...args: any[]) => captureLog('error', args);
console.info = (...args: any[]) => captureLog('info', args);

const testResults: TestResult[] = [];

// Store modified variables to return them
let environmentUpdates: Record<string, any> = {};
let collectionUpdates: Record<string, any> = {};
let globalUpdates: Record<string, any> = {};

const pulse = {
  test: (name: string, callback: () => void) => {
    try {
      callback();
      testResults.push({ name, passed: true });
    } catch (e: any) {
      testResults.push({ 
        name, 
        passed: false, 
        error: e instanceof Error ? e.message : String(e) 
      });
    }
  },
  environment: {
    get: (key: string) => {
      return environmentUpdates[key] ?? (self as any).variables?.environment?.[key];
    },
    set: (key: string, value: any) => {
      environmentUpdates[key] = value;
    }
  },
  collectionVariables: {
    get: (key: string) => {
      return collectionUpdates[key] ?? (self as any).variables?.collection?.[key];
    },
    set: (key: string, value: any) => {
      collectionUpdates[key] = value;
    }
  },
  globals: {
    get: (key: string) => {
      return globalUpdates[key] ?? (self as any).variables?.globals?.[key];
    },
    set: (key: string, value: any) => {
      globalUpdates[key] = value;
    }
  }
};

const pm = pulse;

// Phase 2: Get AsyncFunction constructor
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

// Phase 3: Hardening "Shield"
// Disable network exfiltration APIs
(self as any).fetch = undefined;
(self as any).XMLHttpRequest = undefined;
(self as any).WebSocket = undefined;

ctx.onmessage = async (event: MessageEvent<SandboxRequest>) => {
  // Reset state to guarantee stateless execution runs
  logs.length = 0;
  testResults.length = 0;
  environmentUpdates = {};
  collectionUpdates = {};
  globalUpdates = {};

  const { script, context } = event.data;

  // Make context variables available globally in the worker
  Object.assign(self, context);

  try {
    const contextKeys = Object.keys(context || {});
    const contextValues = Object.values(context || {});

    // Create async runner
    const runner = new AsyncFunction(
      'pulse',
      'pm',
      ...contextKeys,
      `
      "use strict";
      ${script}
      `
    );

    // Await execution
    await runner(pulse, pm, ...contextValues);

    ctx.postMessage({
      type: 'result',
      data: {
        logs,
        tests: testResults,
        context: {
          ...context,
          environmentUpdates,
          collectionUpdates,
          globalUpdates
        },
      } as SandboxResponse
    });
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Write directly to native error streaming instead of standard console loop to prevent stack overflow
    const errorLogEntry: LogEntry = {
      type: 'error',
      message: `Execution Error: ${errorMsg}`,
      timestamp: new Date().toISOString(),
    };
    logs.push(errorLogEntry);
    ctx.postMessage({ type: 'log', data: errorLogEntry });
    
    ctx.postMessage({
      type: 'result',
      data: {
        logs,
        tests: testResults,
        context,
        error: errorMsg
      } as SandboxResponse
    });
  }
};
