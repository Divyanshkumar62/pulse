import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTabStore } from '../useTabStore';
import { Request, Collection } from '../../types';

describe('useTabStore', () => {
  const mockRequest: Request = {
    id: 'req-1',
    name: 'Test Request',
    method: 'GET',
    url: 'https://api.com',
    headers: [],
    body: { type: 'none', content: '' },
    collectionId: 'col-1'
  };

  const mockCollection: Collection = {
    id: 'col-1',
    name: 'Test Collection',
    requests: [mockRequest],
    folders: [],
    variables: []
  };

  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTabId: null, isInitialized: true });
    global.localStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('should open a request tab', () => {
    useTabStore.getState().openTab(mockRequest, 'col-1');
    const state = useTabStore.getState();
    
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].id).toBe('req-1');
    expect(state.tabs[0].type).toBe('request');
    expect(state.activeTabId).toBe('req-1');
  });

  it('should not duplicate an already open request tab', () => {
    useTabStore.getState().openTab(mockRequest, 'col-1');
    useTabStore.getState().openTab(mockRequest, 'col-1');
    const state = useTabStore.getState();
    
    expect(state.tabs.length).toBe(1);
    expect(state.activeTabId).toBe('req-1');
  });

  it('should open a runner tab', () => {
    useTabStore.getState().openRunnerTab(mockCollection);
    const state = useTabStore.getState();
    
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].type).toBe('runner');
    expect(state.activeTabId).toBe('runner-col-1');
  });

  it('should close a tab and set active tab correctly', () => {
    useTabStore.getState().openTab(mockRequest, 'col-1');
    const req2 = { ...mockRequest, id: 'req-2' };
    useTabStore.getState().openTab(req2, 'col-1');
    
    expect(useTabStore.getState().tabs.length).toBe(2);
    expect(useTabStore.getState().activeTabId).toBe('req-2');

    useTabStore.getState().closeTab('req-2');
    
    expect(useTabStore.getState().tabs.length).toBe(1);
    expect(useTabStore.getState().activeTabId).toBe('req-1');
  });

  it('should update tab request name', () => {
    useTabStore.getState().openTab(mockRequest, 'col-1');
    useTabStore.getState().updateTabRequestName('req-1', 'New Name');
    
    expect(useTabStore.getState().tabs[0].request?.name).toBe('New Name');
  });

  it('should mark tab dirty on updateActiveTabRequest', () => {
    useTabStore.getState().openTab(mockRequest, 'col-1');
    useTabStore.getState().updateActiveTabRequest({ url: 'https://new.com' });
    
    const tab = useTabStore.getState().tabs[0];
    expect(tab.request?.url).toBe('https://new.com');
    expect(tab.isDirty).toBe(true);
  });
});