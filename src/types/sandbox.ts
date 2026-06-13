export interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface SandboxRequest {
  script: string;
  context: any;
}

export interface SandboxResponse {
  logs: LogEntry[];
  tests: TestResult[];
  context: any;
  error?: string;
}
