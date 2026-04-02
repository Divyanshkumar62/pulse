import { Request, Environment, Collection } from '../types';
import { executeScript, ScriptExecutionResult } from '../hooks/useTauri';

export async function runScript(
  script: string, 
  request: Request, 
  environment?: Environment,
  collection?: Collection,
  response?: { status: number; body: string; headers: Record<string, string> }
): Promise<ScriptExecutionResult> {
  if (!script || !script.trim()) {
    return {
      environment: {},
      collection: {},
      logs: [],
      tests: [],
    };
  }

  // Convert Pulse structures to a flat Record for the Rust sandbox
  const envMap: Record<string, string> = {};
  environment?.variables.forEach(v => {
    if (v.enabled !== false) envMap[v.key] = v.value;
  });

  const colMap: Record<string, string> = {};
  collection?.variables?.forEach(v => {
    if (v.enabled !== false) colMap[v.key] = v.value;
  });

  const headerMap: Record<string, string> = {};
  request.headers.forEach(h => {
    if (h.enabled !== false && h.key) headerMap[h.key] = h.value;
  });

  try {
    const result = await executeScript(script, {
      environment: envMap,
      collection: colMap,
      request: {
        url: request.url,
        method: request.method,
        headers: headerMap,
      },
      response: response ? {
        status: response.status,
        body: response.body,
        headers: response.headers,
      } : undefined,
    });

    return result;
  } catch (error: any) {
    console.error('Script execution error:', error);
    throw new Error(`Script Error: ${error.message || String(error)}`);
  }
}

