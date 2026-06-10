import { invoke } from '@tauri-apps/api/core';
import { Request, Environment, Header, HttpResponse } from '../types';

export interface ScriptResult {
  modifiedUrl?: string;
  addedHeaders: Header[];
  environmentUpdates: Record<string, string>;
  logs: string[];
  tests: { name: string; passed: boolean; message?: string }[];
}

export interface RustScriptResult {
  environment: Record<string, string>;
  collection: Record<string, string>;
  logs: string[];
  tests: { name: string; passed: boolean; message?: string }[];
}

/**
 * Executes a script (pre-request or test) using the Rust boa_engine sandbox.
 * This provides a more robust and Postman-compatible environment than browser eval.
 */
export async function executeScript(
  script: string, 
  request: Request, 
  environment?: Environment,
  response?: HttpResponse,
  collectionVariables: Record<string, string> = {}
): Promise<ScriptResult> {
  if (!script || !script.trim()) {
    return {
      addedHeaders: [],
      environmentUpdates: {},
      logs: [],
      tests: []
    };
  }

  // Map our frontend types to the expected Rust ScriptContext
  // Added safety checks for .reduce calls to prevent crashes if arrays are undefined
  const context = {
    environment: (environment?.variables || []).reduce((acc, v) => {
      if (v.enabled !== false) acc[v.key] = v.value;
      return acc;
    }, {} as Record<string, string>),
    collection: collectionVariables,
    request: {
      url: request.url,
      method: request.method,
      headers: (request.headers || []).reduce((acc, h) => {
        if (h.enabled !== false) {
          const lowerKey = h.key.toLowerCase();
          if (lowerKey !== 'authorization' && lowerKey !== 'cookie') {
            acc[h.key] = h.value;
          }
        }
        return acc;
      }, {} as Record<string, string>)
    },
    response: response ? {
      status: response.status,
      body: response.body,
      headers: (response.headers || []).reduce((acc, h) => {
        acc[h.key] = h.value;
        return acc;
      }, {} as Record<string, string>)
    } : null
  };

  try {
    const result = await invoke<RustScriptResult>('run_script', { script, context });
    
    // Process results back into our ScriptResult format
    return {
      environmentUpdates: result.environment,
      logs: result.logs,
      tests: result.tests,
      addedHeaders: [], // Headers modification via script can be added to Rust sandbox later
    };
  } catch (error: any) {
    console.error('[ScriptRunner] Execution failed:', error);
    throw new Error(`Script Error: ${error}`);
  }
}

