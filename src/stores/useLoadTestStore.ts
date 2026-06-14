import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LoadTestConfigDraft,
  LoadTestLifecycleEvent,
  LoadTestLifecycleStage,
  LoadTestSummary,
  LoadTestTimelinePoint,
  MetricSnapshot,
} from '../types/loadTesting';
import { DEFAULT_LOAD_TEST_CONFIG, lifecycleOutcomeFromStage } from '../services/loadTesting';

type DashboardStage = LoadTestLifecycleStage | 'IDLE';

interface LoadTestStore {
  draftConfig: LoadTestConfigDraft;
  currentRunId: string | null;
  currentStage: DashboardStage;
  currentSnapshot: MetricSnapshot | null;
  timeline: LoadTestTimelinePoint[];
  lifecycleEvents: LoadTestLifecycleEvent[];
  reports: LoadTestSummary[];
  selectedReportRunId: string | null;
  activeReport: LoadTestSummary | null;
  isStarting: boolean;
  isStopping: boolean;
  errorMessage: string | null;

  updateDraftConfig: (updates: Partial<LoadTestConfigDraft>) => void;
  resetDraftConfig: () => void;
  setStartPending: (pending: boolean) => void;
  setStopPending: (pending: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  recordLifecycleEvent: (event: LoadTestLifecycleEvent) => void;
  recordSnapshot: (snapshot: MetricSnapshot) => void;
  completeRun: (summary: LoadTestSummary) => void;
  failCurrentRun: (message?: string | null) => void;
  clearLiveState: () => void;
  selectReport: (runId: string | null) => void;
}

const MAX_TIMELINE_POINTS = 120;
const MAX_REPORTS = 25;
const MAX_LIFECYCLE_EVENTS = 60;

export const useLoadTestStore = create<LoadTestStore>()(
  persist(
    (set, get) => ({
      draftConfig: DEFAULT_LOAD_TEST_CONFIG,
      currentRunId: null,
      currentStage: 'IDLE',
      currentSnapshot: null,
      timeline: [],
      lifecycleEvents: [],
      reports: [],
      selectedReportRunId: null,
      activeReport: null,
      isStarting: false,
      isStopping: false,
      errorMessage: null,

      updateDraftConfig: (updates) =>
        set((state) => ({
          draftConfig: {
            ...state.draftConfig,
            ...updates,
          },
        })),

      resetDraftConfig: () => set({ draftConfig: DEFAULT_LOAD_TEST_CONFIG }),

      setStartPending: (pending) => set({ isStarting: pending }),

      setStopPending: (pending) => set({ isStopping: pending }),

      setActiveRunId: (runId) => set({ currentRunId: runId }),

      recordLifecycleEvent: (event) =>
        set((state) => {
          const nextEvents = [event, ...state.lifecycleEvents].slice(0, MAX_LIFECYCLE_EVENTS);
          const nextState: Partial<LoadTestStore> = {
            lifecycleEvents: nextEvents,
            currentStage: event.stage,
            errorMessage: event.stage === 'FAILED' ? event.message || 'Load test failed' : state.errorMessage,
          };

          if (event.stage === 'STARTED') {
            nextState.currentRunId = event.runId;
            nextState.currentSnapshot = null;
            nextState.timeline = [];
            nextState.activeReport = null;
            nextState.isStarting = false;
            nextState.isStopping = false;
            nextState.errorMessage = null;
          }

          if (event.stage === 'RUNNING') {
            nextState.currentRunId = event.runId;
            nextState.isStarting = false;
          }

          if (event.stage === 'CANCELLED') {
            nextState.currentRunId = null;
            nextState.isStopping = false;
          }

          if (event.stage === 'FAILED') {
            nextState.currentRunId = null;
            nextState.isStarting = false;
            nextState.isStopping = false;
            nextState.activeReport = null;
          }

          return nextState as LoadTestStore;
        }),

      recordSnapshot: (snapshot) =>
        set((state) => ({
          currentSnapshot: snapshot,
          timeline: [
            ...state.timeline,
            {
              timestamp: Date.now(),
              rps: snapshot.rps,
              p95LatencyMs: snapshot.p95LatencyMs,
              avgLatencyMs: snapshot.avgLatencyMs,
              activeRequests: snapshot.activeRequests,
              activeVus: snapshot.activeVus,
              completedRequests: snapshot.completedRequests,
              failedRequests: snapshot.failedRequests,
              totalBytes: snapshot.totalBytes,
            },
          ].slice(-MAX_TIMELINE_POINTS),
        })),

      completeRun: (summary) =>
        set((state) => {
          const existingReports = state.reports.filter((report) => report.runId !== summary.runId);
          const inferredOutcome =
            lifecycleOutcomeFromStage(state.currentStage === 'IDLE' ? 'FAILED' : state.currentStage) ||
            summary.outcome;
          
          // RAM Optimization: Downsample timeline if it's too large
          let processedTimeline = state.timeline;
          const MAX_POINTS = 300;
          
          if (processedTimeline.length > MAX_POINTS) {
            const stride = Math.ceil(processedTimeline.length / MAX_POINTS);
            processedTimeline = processedTimeline.filter((_, index) => index % stride === 0).slice(0, MAX_POINTS);
          }

          const nextSummary: LoadTestSummary = { 
            ...summary, 
            outcome: inferredOutcome,
            timeline: processedTimeline,
            lifecycleEvents: state.lifecycleEvents
          };

          const nextReports = [nextSummary, ...existingReports]
            .sort((a, b) => b.completedAtTimestamp - a.completedAtTimestamp)
            .slice(0, MAX_REPORTS);

          return {
            reports: nextReports,
            selectedReportRunId:
              state.selectedReportRunId && state.selectedReportRunId !== state.currentRunId
                ? state.selectedReportRunId
                : nextSummary.runId,
            activeReport: nextSummary,
            currentSnapshot: summary.metrics,
            currentRunId: null,
            isStarting: false,
            isStopping: false,
            errorMessage: null,
          };
        }),

      failCurrentRun: (message) =>
        set({
          currentRunId: null,
          currentStage: 'FAILED',
          isStarting: false,
          isStopping: false,
          errorMessage: message || 'Load test failed',
        }),

      clearLiveState: () =>
        set({
          currentRunId: null,
          currentStage: 'IDLE',
          currentSnapshot: null,
          timeline: [],
          lifecycleEvents: [],
          selectedReportRunId: null,
          activeReport: null,
          isStarting: false,
          isStopping: false,
          errorMessage: null,
        }),

      selectReport: (runId) =>
        set((state) => ({
          selectedReportRunId: runId,
          activeReport: runId ? state.reports.find((report) => report.runId === runId) || null : state.activeReport,
        })),
    }),
    {
      name: 'pulse-load-testing-storage',
      partialize: (state) => ({
        draftConfig: state.draftConfig,
        reports: state.reports,
        selectedReportRunId: state.selectedReportRunId,
      }),
    }
  )
);
