import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface MonitorCheck {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: 'healthy' | 'degraded' | 'failing' | 'pending';
  responseTime: number | null;
  statusCode: number | null;
  lastCheck: string | null;
}

export interface CheckRun {
  id: string;
  timestamp: string;
  statusCode: number | null;
  responseTime: number | null;
}

interface MonitorStore {
  monitors: MonitorCheck[];
  checkRuns: Record<string, CheckRun[]>;
  isChecking: boolean;
  
  addMonitor: (monitor: Omit<MonitorCheck, 'id' | 'status' | 'responseTime' | 'statusCode' | 'lastCheck'>) => void;
  deleteMonitor: (id: string) => void;
  updateMonitor: (id: string, updates: Partial<MonitorCheck>) => void;
  addRun: (monitorId: string, run: CheckRun) => void;
  setChecking: (checking: boolean) => void;
}

import { persist } from 'zustand/middleware';

export const useMonitorStore = create<MonitorStore>()(
  persist(
    (set) => ({
      monitors: [],
      checkRuns: {},
      isChecking: false,
      
      addMonitor: (monitor) => set((state) => ({
        monitors: [...state.monitors, {
          ...monitor,
          id: uuidv4(),
          status: 'pending',
          responseTime: null,
          statusCode: null,
          lastCheck: null
        }]
      })),
      
      deleteMonitor: (id) => set((state) => {
        const newCheckRuns = { ...state.checkRuns };
        delete newCheckRuns[id];
        return {
          monitors: state.monitors.filter((m) => m.id !== id),
          checkRuns: newCheckRuns
        };
      }),
      
      updateMonitor: (id, updates) => set((state) => ({
        monitors: state.monitors.map((m) => (m.id === id ? { ...m, ...updates } : m))
      })),
      
      addRun: (monitorId, run) => set((state) => {
        const existingRuns = state.checkRuns[monitorId] || [];
        return {
          checkRuns: {
            ...state.checkRuns,
            [monitorId]: [run, ...existingRuns.slice(0, 19)]
          }
        };
      }),
      
      setChecking: (checking) => set({ isChecking: checking })
    }),
    {
      name: 'pulse-monitor-storage',
    }
  )
);
