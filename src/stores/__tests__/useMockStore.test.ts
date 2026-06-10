import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMockStore } from '../useMockStore';

// Mock Tauri invoke to avoid actual backend calls during tests
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([])
}));

vi.mock('../useWorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => ({ activeWorkspaceId: 'default', workspaces: [{ id: 'default', path: '' }] })
  }
}));

describe('useMockStore', () => {
  beforeEach(() => {
    useMockStore.setState({ mockServers: [], activeMockServerId: null, isLoading: false });
    // Mock localStorage for fallback saves
    (globalThis as any).localStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('should add a new mock server', async () => {
    await useMockStore.getState().addMockServer('Test Server', 3000);
    
    const servers = useMockStore.getState().mockServers;
    expect(servers.length).toBe(1);
    expect(servers[0].name).toBe('Test Server');
    expect(servers[0].port).toBe(3000);
    expect(servers[0].status).toBe('inactive');
  });

  describe('createMockFromRequest URL Parsing', () => {
    it('should extract correct path from a full URL', async () => {
      await useMockStore.getState().createMockFromRequest({
        name: 'Full URL Request',
        method: 'POST',
        url: 'https://api.example.com/v1/users?active=true'
      });

      const server = useMockStore.getState().mockServers[0];
      const route = server.routes[0];
      
      expect(route.method).toBe('POST');
      // Should strip host and query params
      expect(route.path).toBe('/v1/users');
    });

    it('should handle relative paths correctly', async () => {
      await useMockStore.getState().createMockFromRequest({
        method: 'GET',
        url: '/health-check'
      });

      const route = useMockStore.getState().mockServers[0].routes[0];
      expect(route.path).toBe('/health-check');
    });

    it('should prepend slash if missing on relative paths', async () => {
      await useMockStore.getState().createMockFromRequest({
        method: 'PUT',
        url: 'api/data'
      });

      const route = useMockStore.getState().mockServers[0].routes[0];
      expect(route.path).toBe('/api/data');
    });

    it('should strip query parameters from relative paths', async () => {
      await useMockStore.getState().createMockFromRequest({
        method: 'DELETE',
        url: '/api/resource?id=123&force=true'
      });

      const route = useMockStore.getState().mockServers[0].routes[0];
      expect(route.path).toBe('/api/resource');
    });
  });
});