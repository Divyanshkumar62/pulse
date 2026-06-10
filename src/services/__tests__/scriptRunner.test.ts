import { describe, it, expect, vi } from 'vitest';
import { executeScript } from '../scriptRunner';
import { Request, Environment, HttpResponse } from '../../types';

// Mock Tauri backend interactions
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd, args) => {
    if (cmd === 'run_script') {
      const { script, context } = args;
      const environment = { ...context.environment };
      const logs: string[] = [];
      const tests: any[] = [];

      // A simple JS-based mock of the pm object for testing the JS logic in the tests
      // In production, this logic is handled by the Rust boa_engine
      const pm = {
        environment: {
          set: (key: string, val: string) => { environment[key] = val; },
          get: (key: string) => environment[key]
        },
        response: {
          json: () => JSON.parse(context.response.body),
          headers: context.response.headers
        }
      };

      try {
        // Use Function constructor to simulate script execution for testing
        // We provide 'pm' as a global-like variable to the script
        const fn = new Function('pm', script);
        fn(pm);
      } catch (e: any) {
        logs.push(e.message);
      }

      return Promise.resolve({
        environment,
        collection: context.collection || {},
        logs,
        tests
      });
    }
    return Promise.resolve();
  })
}));

describe('scriptRunner', () => {
  const dummyRequest: Request = {
    id: 'req1',
    name: 'Test Request',
    method: 'GET',
    url: 'https://api.example.com',
    headers: [],
    body: { type: 'none', content: '' }
  };

  const dummyEnvironment: Environment = {
    id: 'env1',
    name: 'Global',
    variables: [{ key: 'token', value: 'old_token', enabled: true }]
  };

  it('can extract JSON payload from response and set environment variables', async () => {
    const dummyResponse: HttpResponse = {
      status: 200,
      status_text: 'OK',
      headers: [],
      body: JSON.stringify({ access_token: 'new_secret_token' }),
      time_ms: 50
    };

    const script = `
      var data = pm.response.json();
      if (data && data.access_token) {
        pm.environment.set('token', data.access_token);
      }
    `;

    const result = await executeScript(script, dummyRequest, dummyEnvironment, dummyResponse);

    expect(result.environmentUpdates['token']).toBe('new_secret_token');
  });

  it('can read existing variables and response headers', async () => {
    const dummyResponse: HttpResponse = {
      status: 200,
      status_text: 'OK',
      headers: [{ key: 'X-Rate-Limit', value: '100' }],
      body: '',
      time_ms: 10
    };

    const script = `
      var oldToken = pm.environment.get('token');
      // Set a new variable based on existing state
      if (oldToken === 'old_token') {
          pm.environment.set('status', 'validated');
      }
      
      var limit = pm.response.headers['X-Rate-Limit'];
      if (limit) {
          pm.environment.set('limit', limit);
      }
    `;

    const result = await executeScript(script, dummyRequest, dummyEnvironment, dummyResponse);

    expect(result.environmentUpdates['status']).toBe('validated');
    expect(result.environmentUpdates['limit']).toBe('100');
  });
});
