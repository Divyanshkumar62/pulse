import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { useLoadTestStore } from '../../stores/useLoadTestStore';
import type {
  LoadTestLifecycleEvent,
  LoadTestSummaryRaw,
  MetricSnapshot,
} from '../../types/loadTesting';
import {
  formatLifecycleLabel,
  lifecycleOutcomeFromStage,
  normalizeLoadTestSummary,
} from '../../services/loadTesting';

export default function LoadTestingEngine() {
  useEffect(() => {
    let disposed = false;

    const setupListeners = async () => {
      const unlistenLifecycle = await listen<LoadTestLifecycleEvent>(
        'load-test-lifecycle',
        (event) => {
          if (disposed) {
            return;
          }

          const payload = event.payload;
          const store = useLoadTestStore.getState();
          store.recordLifecycleEvent(payload);

          if (payload.stage === 'STARTED') {
            toast.loading(`Load test queued: ${payload.runId}`, { id: 'load-test-status' });
          } else if (payload.stage === 'RUNNING') {
            toast.loading('Load test is running', { id: 'load-test-status' });
          } else if (payload.stage === 'COMPLETED') {
            toast.success('Load test completed', { id: 'load-test-status' });
          } else if (payload.stage === 'CANCELLED') {
            toast.warning('Load test cancelled', { id: 'load-test-status' });
          } else if (payload.stage === 'FAILED') {
            toast.error(payload.message || 'Load test failed', { id: 'load-test-status' });
          }
        }
      );

      const unlistenSnapshot = await listen<MetricSnapshot>(
        'load-test-snapshot',
        (event) => {
          if (disposed) {
            return;
          }

          useLoadTestStore.getState().recordSnapshot(event.payload);
        }
      );

      const unlistenComplete = await listen<LoadTestSummaryRaw>(
        'load-test-complete',
        (event) => {
          if (disposed) {
            return;
          }

          const currentStage = useLoadTestStore.getState().currentStage;
          const outcome = lifecycleOutcomeFromStage(
            currentStage === 'IDLE' ? 'COMPLETED' : currentStage
          ) || 'COMPLETED';
          const summary = normalizeLoadTestSummary(event.payload, outcome);
          useLoadTestStore.getState().completeRun(summary);
          toast.success(`Summary ready: ${formatLifecycleLabel(outcome)}`, {
            id: 'load-test-summary',
          });
        }
      );

      return [unlistenLifecycle, unlistenSnapshot, unlistenComplete];
    };

    let cleanup: Array<() => void> = [];

    setupListeners()
      .then((listeners) => {
        cleanup = listeners;
      })
      .catch((error) => {
        console.error('[Pulse] Failed to bind load testing events:', error);
        toast.error('Failed to initialize load testing event stream');
      });

    return () => {
      disposed = true;
      cleanup.forEach((unlisten) => unlisten());
    };
  }, []);

  return null;
}
