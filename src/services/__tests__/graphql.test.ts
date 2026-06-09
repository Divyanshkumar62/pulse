import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchIntrospectionSchema, INTROSPECTION_QUERY } from '../graphql';

// Mock the dependencies
vi.mock('../../hooks/useTauri', () => ({
  sendRequest: vi.fn()
}));

vi.mock('../../stores/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { timeout: 30000, verifySSL: true }
    })
  }
}));

import { sendRequest } from '../../hooks/useTauri';

describe('GraphQL Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchIntrospectionSchema', () => {
    it('should format headers and body correctly for the introspection request', async () => {
      // Mock successful response
      (sendRequest as any).mockResolvedValue({
        status: 200,
        status_text: 'OK',
        body: JSON.stringify({ data: { __schema: { types: [] } } })
      });

      const url = 'https://api.graphql.com/graphql';
      const headers = [
        { key: 'Authorization', value: 'Bearer token', enabled: true },
        { key: 'X-Custom', value: 'test', enabled: true }
      ];

      const result = await fetchIntrospectionSchema(url, headers);

      // Verify sendRequest was called with the right arguments
      expect(sendRequest).toHaveBeenCalledTimes(1);
      const args = (sendRequest as any).mock.calls[0];
      
      expect(args[0]).toBe('POST'); // Method
      expect(args[1]).toBe(url); // URL
      
      // Verify headers
      expect(args[2]).toEqual({
        'Authorization': 'Bearer token',
        'X-Custom': 'test',
        'Content-Type': 'application/json'
      });
      
      // Verify body
      expect(args[3].type).toBe('json');
      expect(JSON.parse(args[3].content).query).toBe(INTROSPECTION_QUERY);

      // Verify result extraction
      expect(result).toEqual({ __schema: { types: [] } });
    });

    it('should throw an error if the request fails', async () => {
      (sendRequest as any).mockResolvedValue({
        status: 401,
        status_text: 'Unauthorized',
        body: 'Unauthorized access'
      });

      await expect(fetchIntrospectionSchema('https://api.com', []))
        .rejects
        .toThrow('Failed to fetch schema: 401 Unauthorized');
    });
  });
});
