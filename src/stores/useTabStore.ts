import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Request, HttpResponse, WebSocketMessage, WebSocketStatus, Collection } from '../types';

export type TabType = 'request' | 'runner' | 'docs';

export interface Tab {
  id: string; // Corresponds to request ID or collection ID for runner/docs
  type: TabType;
  collectionId?: string; 
  request?: Request;
  collection?: Collection;
  response?: HttpResponse;
  isDirty?: boolean;
  wsMessages?: WebSocketMessage[];
  wsStatus?: WebSocketStatus;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  
  openTab: (request: Request, collectionId?: string) => void;
  openRunnerTab: (collection: Collection) => void;
  openDocsTab: (collection: Collection) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveTabRequest: (updates: Partial<Request>) => void;
  updateTabRequestName: (requestId: string, newName: string) => void;
  setTabResponse: (id: string, response: HttpResponse) => void;
  addWsMessage: (tabId: string, message: WebSocketMessage) => void;
  setWsStatus: (tabId: string, status: WebSocketStatus) => void;
  clearWsMessages: (tabId: string) => void;
}

export const useTabStore = create<TabStore>()(
  subscribeWithSelector((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (request, collectionId) => {
    const { tabs } = get();
    const existing = tabs.find(t => t.id === request.id);
    if (!existing) {
      set({ 
        // Prepend new tab to the left
        tabs: [{ id: request.id, type: 'request', request, collectionId }, ...tabs],
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
      set({ 
        tabs: [{ id, type: 'runner', collection, collectionId: collection.id }, ...tabs],
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
      set({ 
        tabs: [{ id, type: 'docs', collection, collectionId: collection.id }, ...tabs],
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

  setTabResponse: (id, response) => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t => 
        t.id === id ? { ...t, response } : t
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
