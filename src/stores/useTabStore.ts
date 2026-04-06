import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Request, HttpResponse, WebSocketMessage, WebSocketStatus } from '../types';

export interface Tab {
  id: string; // Typically corresponds to the request ID
  collectionId?: string; 
  request: Request;
  response?: HttpResponse;
  isDirty?: boolean;
  wsMessages?: WebSocketMessage[];
  wsStatus?: WebSocketStatus;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  
  openTab: (request: Request, collectionId?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveTabRequest: (updates: Partial<Request>) => void;
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
        tabs: [...tabs, { id: request.id, request, collectionId }],
        activeTabId: request.id 
      });
    } else {
      set({ activeTabId: request.id });
    }
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter(t => t.id !== id);
    let newActiveId = activeTabId;
    
    if (activeTabId === id) {
      const idx = tabs.findIndex(t => t.id === id);
      if (newTabs.length > 0) {
        newActiveId = newTabs[Math.max(0, idx - 1)].id;
      } else {
        newActiveId = null;
      }
    }
    
    set({ tabs: newTabs, activeTabId: newActiveId });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
  
  updateActiveTabRequest: (updates) => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return;
    
    set({
      tabs: tabs.map(t => 
        t.id === activeTabId 
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
