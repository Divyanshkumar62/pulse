import { beforeEach, describe, expect, it } from 'vitest';
import { useLoadTestStore } from '../useLoadTestStore';
import { DEFAULT_LOAD_TEST_CONFIG } from '../../services/loadTesting';

describe('useLoadTestStore', () => {
  beforeEach(() => {
    useLoadTestStore.setState({
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
    });
  });

  it('records lifecycle transitions and resets live state on started', () => {
    useLoadTestStore.getState().recordLifecycleEvent({
      runId: 'run-1',
      stage: 'STARTED',
      message: null,
      timestamp: 1,
    });

    const state = useLoadTestStore.getState();
    expect(state.currentRunId).toBe('run-1');
    expect(state.currentStage).toBe('STARTED');
    expect(state.timeline).toEqual([]);
  });

  it('stores timeline snapshots and final summaries', () => {
    useLoadTestStore.getState().recordSnapshot({
      totalRequests: 10,
      completedRequests: 10,
      failedRequests: 0,
      activeRequests: 2,
      rps: 20,
      bandwidthBytesPerSec: 1000,
      totalBytes: 4000,
      minLatencyMs: 10,
      maxLatencyMs: 80,
      avgLatencyMs: 30,
      p50LatencyMs: 25,
      p90LatencyMs: 60,
      p95LatencyMs: 70,
      p99LatencyMs: 80,
      activeVus: 5,
      isRunning: true,
    });

    useLoadTestStore.getState().completeRun({
      runId: 'run-1',
      config: {
        url: 'https://api.example.com',
        method: 'GET',
        headers: {},
        body: null,
        virtualUsers: 5,
        durationSeconds: 10,
        rampUpSeconds: 2,
        requestTimeoutSeconds: 5,
        maxInflightRequests: 10,
        thinkTimeMs: 0,
        loadMode: { type: 'constantVU' },
      },
      metrics: useLoadTestStore.getState().currentSnapshot!,
      statusCodes: { '200': 10 },
      errors: {},
      completedAtTimestamp: 2,
      outcome: 'COMPLETED',
      timeline: useLoadTestStore.getState().timeline,
      lifecycleEvents: useLoadTestStore.getState().lifecycleEvents,
    });

    const state = useLoadTestStore.getState();
    expect(state.timeline).toHaveLength(1);
    expect(state.reports).toHaveLength(1);
    expect(state.selectedReportRunId).toBe('run-1');
  });

  it('captures failure messages from lifecycle events', () => {
    useLoadTestStore.getState().recordLifecycleEvent({
      runId: 'run-2',
      stage: 'FAILED',
      message: 'network failure',
      timestamp: 3,
    });

    const state = useLoadTestStore.getState();
    expect(state.currentStage).toBe('FAILED');
    expect(state.errorMessage).toBe('network failure');
    expect(state.currentRunId).toBeNull();
  });
});
