import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Request, HttpResponse, WebSocketMessage, WebSocketStatus, Collection } from '../types';
import { LogEntry, TestResult } from '../types/sandbox';

export type TabType = 'request' | 'runner' | 'docs';

export interface Tab {
  id: string; // Corresponds to request ID or collection ID for runner/docs
  type: TabType;
  collectionId?: string; 
  request?: Request;
  collection?: Collection;
  response?: HttpResponse;
  testResults?: TestResult[];
  consoleLogs?: LogEntry[];
  isDirty?: boolean;
  isLoading?: boolean;
  wsMessages?: WebSocketMessage[];
  wsStatus?: WebSocketStatus;
  isPinned?: boolean;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  isInitialized: boolean;
  
  initialize: () => Promise<void>;
  openTab: (request: Request, collectionId?: string) => void;
  openRunnerTab: (collection: Collection) => void;
  openDocsTab: (collection: Collection) => void;
  closeTab: (id: string) => void;
  togglePinTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveTabRequest: (updates: Partial<Request>) => void;
  markTabClean: (id: string) => void;
  setTabLoading: (id: string, isLoading: boolean) => void;
  updateTabRequestName: (requestId: string, newName: string) => void;
  setTabResponse: (id: string, response: HttpResponse) => void;
  setTabTestResults: (id: string, testResults: TestResult[]) => void;
  setTabConsoleLogs: (id: string, consoleLogs: LogEntry[]) => void;
  clearTabSandboxResults: (id: string) => void;
  addWsMessage: (tabId: string, message: WebSocketMessage) => void;
  setWsStatus: (tabId: string, status: WebSocketStatus) => void;
  clearWsMessages: (tabId: string) => void;
  persistSession: () => void;
}

export const useTabStore = create<TabStore>()(
  subscribeWithSelector((set, get) => ({
  tabs: [],
  activeTabId: null,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      const saved = localStorage.getItem('pulse_session');
      if (saved) {
        const { activeTabId, tabIds, pinnedTabIds = [] } = JSON.parse(saved);
        
        // Re-hydrate tabs from collection store
        // Since this is a client-side app, we can simplify the import
        const collectionModule = await import('./useCollectionStore');
        const { collections } = collectionModule.useCollectionStore.getState();
        
        const allRequests: Request[] = [];
        const extract = (items: any[]) => {
            items.forEach(item => {
                if (item.requests) allRequests.push(...item.requests);
                if (item.folders) extract(item.folders);
            });
        };
        extract(collections);

        const restoredTabs: Tab[] = [];
        (tabIds as string[]).forEach(id => {
            const isPinned = pinnedTabIds.includes(id);
            const req = allRequests.find(r => r.id === id);
            if (req) {
                restoredTabs.push({ id, type: 'request', request: req, isPinned });
            } else if (id.startsWith('runner-')) {
                const colId = id.replace('runner-', '');
                const col = collections.find(c => c.id === colId);
                if (col) restoredTabs.push({ id, type: 'runner', collection: col, collectionId: colId, isPinned });
            } else if (id.startsWith('docs-')) {
                const colId = id.replace('docs-', '');
                const col = collections.find(c => c.id === colId);
                if (col) restoredTabs.push({ id, type: 'docs', collection: col, collectionId: colId, isPinned });
            }
        });

        // Ensure pinned tabs are first
        restoredTabs.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });

        set({ 
            tabs: restoredTabs, 
            activeTabId: restoredTabs.some(t => t.id === activeTabId) ? activeTabId : (restoredTabs[0]?.id || null)
        });
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      set({ isInitialized: true });
    }
  },

  persistSession: () => {
    const { activeTabId, tabs } = get();
    const session = {
      activeTabId,
      tabIds: tabs.map(t => t.id),
      pinnedTabIds: tabs.filter(t => t.isPinned).map(t => t.id)
    };
    localStorage.setItem('pulse_session', JSON.stringify(session));
  },

  openTab: (request, collectionId) => {
    const { tabs } = get();
    const existing = tabs.find(t => t.id === request.id);
    if (!existing) {
      const pinnedTabs = tabs.filter(t => t.isPinned);
      const unpinnedTabs = tabs.filter(t => !t.isPinned);
      set({ 
        // Insert after pinned tabs
        tabs: [...pinnedTabs, { id: request.id, type: 'request', request, collectionId }, ...unpinnedTabs],
        activeTabId: request.id 
      });
    } else {
      set({ activeTabId: request.id });
    }
  },

  openRunnerTab: (collection) => {
    const { tabs } = get();
    const id = `runner-${collection.id}`;
    const existing = tabs.find(t => t.id === id);
    if (!existing) {
      const pinnedTabs = tabs.filter(t => t.isPinned);
      const unpinnedTabs = tabs.filter(t => !t.isPinned);
      set({ 
        tabs: [...pinnedTabs, { id, type: 'runner', collection, collectionId: collection.id }, ...unpinnedTabs],
        activeTabId: id 
      });
    } else {
      set({ activeTabId: id });
    }
  },

  openDocsTab: (collection) => {
    const { tabs } = get();
    const id = `docs-${collection.id}`;
    const existing = tabs.find(t => t.id === id);
    if (!existing) {
      const pinnedTabs = tabs.filter(t => t.isPinned);
      const unpinnedTabs = tabs.filter(t => !t.isPinned);
      set({ 
        tabs: [...pinnedTabs, { id, type: 'docs', collection, collectionId: collection.id }, ...unpinnedTabs],
        activeTabId: id 
      });
    } else {
      set({ activeTabId: id });
    }
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter(t => t.id !== id);
    let newActiveId = activeTabId;
    
    if (activeTabId === id) {
      const idx = tabs.findIndex(t => t.id === id);
      if (newTabs.length > 0) {
        newActiveId = newTabs[Math.min(idx, newTabs.length - 1)].id;
      } else {
        newActiveId = null;
      }
    }
    
    set({ tabs: newTabs, activeTabId: newActiveId });
  },

  togglePinTab: (id) => {
    const { tabs } = get();
    const newTabs = tabs.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t);
    newTabs.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
    set({ tabs: newTabs });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabRequestName: (requestId, newName) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        (t.type === 'request' && t.request?.id === requestId)
          ? { ...t, request: { ...t.request, name: newName } } 
          : t
      )
    });
  },
  
  updateActiveTabRequest: (updates) => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return;
    
    set({
      tabs: tabs.map(t => 
        (t.id === activeTabId && t.type === 'request' && t.request)
          ? { ...t, request: { ...t.request, ...updates }, isDirty: true } 
          : t
      )
    });
  },

  markTabClean: (id) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === id ? { ...t, isDirty: false } : t
      )
    });
  },

  setTabLoading: (id, isLoading) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === id ? { ...t, isLoading } : t
      )
    });
  },

  setTabResponse: (id: string, response: HttpResponse) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === id ? { ...t, response } : t
      )
    });
  },

  setTabTestResults: (id: string, testResults: TestResult[]) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === id ? { ...t, testResults: [...(t.testResults || []), ...testResults] } : t
      )
    });
  },

  setTabConsoleLogs: (id: string, consoleLogs: LogEntry[]) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === id ? { ...t, consoleLogs: [...(t.consoleLogs || []), ...consoleLogs] } : t
      )
    });
  },

  clearTabSandboxResults: (id: string) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === id ? { ...t, testResults: [], consoleLogs: [] } : t
      )
    });
  },

  addWsMessage: (tabId, message) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === tabId 
          ? { ...t, wsMessages: [...(t.wsMessages || []), message] } 
          : t
      )
    });
  },

  setWsStatus: (tabId, status) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === tabId ? { ...t, wsStatus: status } : t
      )
    });
  },

  clearWsMessages: (tabId) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === tabId ? { ...t, wsMessages: [] } : t
      )
    });
  }
}))
);

// Auto-persist session changes
useTabStore.subscribe(
  (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
  (state) => {
    useTabStore.getState().persistSession();
  },
  { 
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) 
  }
);
