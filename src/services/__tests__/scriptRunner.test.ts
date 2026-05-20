import { describe, it, expect } from 'vitest';
import { executePreRequestScript } from '../scriptRunner';
import { Request, Environment, HttpResponse } from '../../types';

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

  it('can extract JSON payload from response and set environment variables', () => {
    const dummyResponse: HttpResponse = {
      status: 200,
      status_text: 'OK',
      headers: [],
      body: JSON.stringify({ access_token: 'new_secret_token' }),
      time_ms: 50
    };

    const script = `
      var data = pulse.response.json();
      if (data && data.access_token) {
        pulse.environment.set('token', data.access_token);
      }
    `;

    const result = executePreRequestScript(script, dummyRequest, dummyEnvironment, dummyResponse);

    expect(result.environmentUpdates['token']).toBe('new_secret_token');
  });

  it('can read existing variables and response headers', () => {
    const dummyResponse: HttpResponse = {
      status: 200,
      status_text: 'OK',
      headers: [{ key: 'X-Rate-Limit', value: '100' }],
      body: '',
      time_ms: 10
    };

    const script = `
      var oldToken = pulse.environment.get('token');
      // Set a new variable based on existing state
      if (oldToken === 'old_token') {
          pulse.environment.set('status', 'validated');
      }
      
      var limit = pulse.response.headers.find(h => h.key === 'X-Rate-Limit');
      if (limit) {
          pulse.environment.set('limit', limit.value);
      }
    `;

    const result = executePreRequestScript(script, dummyRequest, dummyEnvironment, dummyResponse);

    expect(result.environmentUpdates['status']).toBe('validated');
    expect(result.environmentUpdates['limit']).toBe('100');
  });
});
