import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCollectionStore } from '../useCollectionStore';
import { Collection, Folder, Request } from '../../types';

// Mock Tauri backend interactions
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('mock-data-dir')
}));

vi.mock('../../hooks/useTauri', () => ({
  deleteCollectionFromDisk: vi.fn().mockResolvedValue(undefined),
  saveCollectionToDisk: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../useWorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => ({ activeWorkspaceId: 'default', workspaces: [{ id: 'default', path: '' }] })
  }
}));

describe('useCollectionStore', () => {
  const mockCollection: Collection = {
    id: 'col-1',
    name: 'Mock API',
    requests: [],
    folders: [],
    variables: []
  };

  const mockFolder: Folder = {
    id: 'fld-1',
    name: 'Users',
    requests: [],
    folders: []
  };

  const mockRequest: Request = {
    id: 'req-1',
    name: 'Get User',
    method: 'GET',
    url: 'https://api.com/user',
    headers: [],
    body: { type: 'none', content: '' }
  };

  beforeEach(() => {
    useCollectionStore.setState({ collections: [], activeCollectionId: null, isLoading: false });
    
    // Mock the instance method saveCollectionToDisk to avoid triggering actual backend logic during local state tests
    useCollectionStore.getState().saveCollectionToDisk = vi.fn().mockResolvedValue(undefined);
  });

  describe('Collections', () => {
    it('should add a new collection', async () => {
      await useCollectionStore.getState().addCollection(mockCollection, '/path/to/workspace');
      
      const cols = useCollectionStore.getState().collections;
      expect(cols.length).toBe(1);
      expect(cols[0].name).toBe('Mock API');
    });

    it('should delete a collection', async () => {
      await useCollectionStore.getState().addCollection(mockCollection, '');
      await useCollectionStore.getState().deleteCollection('col-1');
      
      expect(useCollectionStore.getState().collections.length).toBe(0);
    });

    it('should duplicate a collection', async () => {
      await useCollectionStore.getState().addCollection(mockCollection, '');
      useCollectionStore.getState().duplicateCollection('col-1');
      
      const cols = useCollectionStore.getState().collections;
      expect(cols.length).toBe(2);
      expect(cols[1].name).toBe('Mock API (Copy)');
      expect(cols[1].id).not.toBe('col-1');
    });
  });

  describe('Folders', () => {
    beforeEach(async () => {
      await useCollectionStore.getState().addCollection(mockCollection, '');
    });

    it('should add a folder to the root of a collection', async () => {
      await useCollectionStore.getState().addFolder('col-1', null, mockFolder);
      
      const col = useCollectionStore.getState().collections[0];
      expect(col.folders.length).toBe(1);
      expect(col.folders[0].name).toBe('Users');
    });

    it('should delete a folder', async () => {
      await useCollectionStore.getState().addFolder('col-1', null, mockFolder);
      useCollectionStore.getState().deleteFolder('col-1', 'fld-1');
      
      const col = useCollectionStore.getState().collections[0];
      expect(col.folders.length).toBe(0);
    });
  });

  describe('Requests', () => {
    beforeEach(async () => {
      await useCollectionStore.getState().addCollection(mockCollection, '');
    });

    it('should add a request to the root of a collection', async () => {
      await useCollectionStore.getState().addRequest('col-1', null, mockRequest);
      
      const col = useCollectionStore.getState().collections[0];
      expect(col.requests.length).toBe(1);
      expect(col.requests[0].name).toBe('Get User');
    });

    it('should add a request inside a folder', async () => {
      await useCollectionStore.getState().addFolder('col-1', null, mockFolder);
      await useCollectionStore.getState().addRequest('col-1', 'fld-1', mockRequest);
      
      const col = useCollectionStore.getState().collections[0];
      expect(col.requests.length).toBe(0);
      expect(col.folders[0].requests.length).toBe(1);
      expect(col.folders[0].requests[0].name).toBe('Get User');
    });

    it('should delete a request from root', async () => {
      await useCollectionStore.getState().addRequest('col-1', null, mockRequest);
      useCollectionStore.getState().deleteRequest('col-1', 'req-1');
      
      const col = useCollectionStore.getState().collections[0];
      expect(col.requests.length).toBe(0);
    });

    it('should duplicate a request from root', async () => {
      await useCollectionStore.getState().addRequest('col-1', null, mockRequest);
      useCollectionStore.getState().duplicateRequest('col-1', 'req-1');

      const col = useCollectionStore.getState().collections[0];
      expect(col.requests.length).toBe(2);
      expect(col.requests[0].id).toBe('req-1');
      expect(col.requests[1].name).toBe('Get User (Copy)');
      expect(col.requests[1].id).not.toBe('req-1');
    });

    it('should duplicate a request inside a folder', async () => {
      await useCollectionStore.getState().addFolder('col-1', null, mockFolder);
      await useCollectionStore.getState().addRequest('col-1', 'fld-1', mockRequest);
      useCollectionStore.getState().duplicateRequest('col-1', 'req-1');

      const col = useCollectionStore.getState().collections[0];
      expect(col.folders[0].requests.length).toBe(2);
      expect(col.folders[0].requests[0].id).toBe('req-1');
      expect(col.folders[0].requests[1].name).toBe('Get User (Copy)');
      expect(col.folders[0].requests[1].id).not.toBe('req-1');
    });
  });

  describe('Move Operations', () => {
    beforeEach(async () => {
      await useCollectionStore.getState().addCollection(mockCollection, '');
    });

    it('should move a request from collection root to a folder', async () => {
      await useCollectionStore.getState().addFolder('col-1', null, mockFolder);
      await useCollectionStore.getState().addRequest('col-1', null, mockRequest);
      
      let col = useCollectionStore.getState().collections[0];
      expect(col.requests.length).toBe(1);
      expect(col.folders[0].requests.length).toBe(0);

      await useCollectionStore.getState().moveRequest('col-1', 'col-1', 'req-1', 'fld-1', 0);

      col = useCollectionStore.getState().collections[0];
      expect(col.requests.length).toBe(0);
      expect(col.folders[0].requests.length).toBe(1);
      expect(col.folders[0].requests[0].id).toBe('req-1');
    });

    it('should move a folder under another folder and prevent circular dependency', async () => {
      const folder2: Folder = {
        id: 'fld-2',
        name: 'Auth',
        requests: [],
        folders: []
      };

      await useCollectionStore.getState().addFolder('col-1', null, mockFolder); // fld-1
      await useCollectionStore.getState().addFolder('col-1', null, folder2);   // fld-2

      // Move fld-2 under fld-1
      await useCollectionStore.getState().moveFolder('col-1', 'col-1', 'fld-2', 'fld-1', 0);

      let col = useCollectionStore.getState().collections[0];
      expect(col.folders.length).toBe(1); // Only fld-1 at root
      expect(col.folders[0].folders!.length).toBe(1);
      expect(col.folders[0].folders![0].id).toBe('fld-2');

      // Now, try to move fld-1 (parent) under fld-2 (child) -> Circular!
      await expect(
        useCollectionStore.getState().moveFolder('col-1', 'col-1', 'fld-1', 'fld-2', 0)
      ).rejects.toThrow('Circular dependency');
    });

    it('should move a request across different collections', async () => {
      const mockCollection2: Collection = {
        id: 'col-2',
        name: 'Second Collection',
        requests: [],
        folders: [],
        variables: []
      };

      await useCollectionStore.getState().addCollection(mockCollection2, '');
      await useCollectionStore.getState().addRequest('col-1', null, mockRequest);

      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-1')?.requests.length).toBe(1);
      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-2')?.requests.length).toBe(0);

      await useCollectionStore.getState().moveRequest('col-1', 'col-2', 'req-1', null, 0);

      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-1')?.requests.length).toBe(0);
      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-2')?.requests.length).toBe(1);
      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-2')?.requests[0].id).toBe('req-1');
    });

    it('should move a folder across different collections', async () => {
      const mockCollection2: Collection = {
        id: 'col-2',
        name: 'Second Collection',
        requests: [],
        folders: [],
        variables: []
      };

      await useCollectionStore.getState().addCollection(mockCollection2, '');
      await useCollectionStore.getState().addFolder('col-1', null, mockFolder);

      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-1')?.folders.length).toBe(1);
      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-2')?.folders.length).toBe(0);

      await useCollectionStore.getState().moveFolder('col-1', 'col-2', 'fld-1', null, 0);

      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-1')?.folders.length).toBe(0);
      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-2')?.folders.length).toBe(1);
      expect(useCollectionStore.getState().collections.find(c => c.id === 'col-2')?.folders[0].id).toBe('fld-1');
    });
  });
});