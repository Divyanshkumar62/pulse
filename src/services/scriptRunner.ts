import { Request, Environment, Header, HttpResponse } from '../types';

export interface ScriptResult {
  modifiedUrl?: string;
  addedHeaders: Header[];
  environmentUpdates: Record<string, string>;
}

export function executePreRequestScript(
  script: string, 
  request: Request, 
  environment?: Environment,
  response?: HttpResponse
): ScriptResult {
  const result: ScriptResult = {
    addedHeaders: [],
    environmentUpdates: {},
  };

  if (!script || !script.trim()) return result;

  // Pulse API implementation
  const pulse = {
    request: {
      url: {
        set: (url: string) => { result.modifiedUrl = url; }
      },
      headers: {
        add: (key: string, value: string) => {
          result.addedHeaders.push({ key, value, enabled: true });
        }
      }
    },
    environment: {
      get: (key: string) => {
        const variable = environment?.variables.find(v => v.key === key && v.enabled !== false);
        return variable ? variable.value : undefined;
      },
      set: (key: string, value: string) => {
        result.environmentUpdates[key] = value;
      }
    },
    response: response ? {
      json: () => {
        try {
          return JSON.parse(response.body);
        } catch {
          return null;
        }
      },
      status: response.status,
      headers: response.headers,
      body: response.body
    } : undefined
  };

  try {
    // We use a Function constructor for a simple sandbox. 
    // In a production app, a more robust sandbox like isolated-vm would be preferred,
    // but for a Tauri/Web context, this provides localized scope.
    const runner = new Function('pulse', script);
    runner(pulse);
  } catch (error: any) {
    console.error('Pre-request script error:', error);
    throw new Error(`Script Error: ${error.message}`);
  }

  return result;
}
