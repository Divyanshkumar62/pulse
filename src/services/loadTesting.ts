import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type {
  LoadTestConfig,
  LoadTestConfigDraft,
  LoadTestLifecycleEvent,
  LoadTestSummary,
  LoadTestSummaryRaw,
} from '../types/loadTesting';

export const DEFAULT_LOAD_TEST_CONFIG: LoadTestConfigDraft = {
  url: '',
  method: 'GET',
  headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
  body: '',
  virtualUsers: 25,
  durationSeconds: 30,
  rampUpSeconds: 5,
  requestTimeoutSeconds: 15,
  maxInflightRequests: 250,
  thinkTimeMs: 0,
  loadMode: { type: 'constantVU' },
};

export function buildLoadTestConfig(draft: LoadTestConfigDraft): LoadTestConfig {
  const headers = draft.headers.reduce<Record<string, string>>((acc, header) => {
    const key = header.key.trim();
    if (!key || header.enabled === false) {
      return acc;
    }

    acc[key] = header.value ?? '';
    return acc;
  }, {});

  return {
    url: draft.url.trim(),
    method: draft.method,
    headers,
    body: draft.body.trim() ? draft.body : null,
    virtualUsers: draft.virtualUsers,
    durationSeconds: draft.durationSeconds,
    rampUpSeconds: draft.rampUpSeconds,
    requestTimeoutSeconds: normalizeOptionalNumber(draft.requestTimeoutSeconds),
    maxInflightRequests: normalizeOptionalNumber(draft.maxInflightRequests),
    thinkTimeMs: normalizeOptionalNumber(draft.thinkTimeMs),
    loadMode:
      draft.loadMode.type === 'constantRPS'
        ? { type: 'constantRPS', targetRps: draft.loadMode.targetRps }
        : { type: 'constantVU' },
    thresholds: draft.thresholds,
  };
}

export function normalizeLoadTestSummary(
  raw: LoadTestSummaryRaw,
  outcome: LoadTestSummary['outcome'] = 'COMPLETED'
): LoadTestSummary {
  return {
    runId: raw.runId,
    config: raw.config,
    metrics: raw.metrics,
    statusCodes: normalizeCountMap(raw.statusCodes),
    errors: normalizeCountMap(raw.errors),
    completedAtTimestamp: raw.completedAtTimestamp,
    outcome,
    timeline: [],
    lifecycleEvents: [],
    thresholds: raw.thresholds,
  };
}

export function normalizeCountMap(value: unknown): Record<string, number> {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.reduce<Record<string, number>>((acc, entry, index) => {
      if (Array.isArray(entry) && entry.length === 2) {
        acc[String(entry[0])] = Number(entry[1]) || 0;
        return acc;
      }

      if (typeof entry === 'object' && entry !== null) {
        const objectEntry = entry as Record<string, unknown>;
        const key =
          objectEntry.key ??
          objectEntry.errorType ??
          objectEntry.statusCode ??
          objectEntry.label ??
          `entry-${index + 1}`;
        const count =
          objectEntry.count ??
          objectEntry.value ??
          objectEntry.total ??
          objectEntry.requests ??
          0;
        acc[String(key)] = Number(count) || 0;
      }

      return acc;
    }, {});
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
      (acc, [key, count]) => {
        acc[key] = Number(count) || 0;
        return acc;
      },
      {}
    );
  }

  return {};
}

export function lifecycleOutcomeFromStage(
  stage: LoadTestLifecycleEvent['stage']
): LoadTestSummary['outcome'] | null {
  if (stage === 'COMPLETED' || stage === 'CANCELLED' || stage === 'FAILED') {
    return stage;
  }

  return null;
}

export function formatLifecycleLabel(stage: LoadTestLifecycleEvent['stage'] | 'IDLE'): string {
  switch (stage) {
    case 'STARTED':
      return 'Started';
    case 'RUNNING':
      return 'Running';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Idle';
  }
}

export function summaryToCsv(summary: LoadTestSummary): string {
  const metricRows = Object.entries(summary.metrics).map(([key, value]) => `${escapeCsv(key)},${escapeCsv(value)}`);
  const statusRows = Object.entries(summary.statusCodes).map(([code, count]) => `${escapeCsv(code)},${escapeCsv(count)}`);
  const errorRows = Object.entries(summary.errors).map(([label, count]) => `${escapeCsv(label)},${escapeCsv(count)}`);

  return [
    'section,key,value',
    `meta,runId,${escapeCsv(summary.runId)}`,
    `meta,outcome,${escapeCsv(summary.outcome)}`,
    `meta,completedAt,${escapeCsv(new Date(summary.completedAtTimestamp).toISOString())}`,
    ...metricRows.map((row) => `metrics,${row}`),
    ...statusRows.map((row) => `statusCodes,${row}`),
    ...errorRows.map((row) => `errors,${row}`),
  ].join('\n');
}

export async function exportLoadTestSummary(
  summary: LoadTestSummary,
  format: 'json' | 'csv'
): Promise<boolean> {
  const extension = format === 'json' ? 'json' : 'csv';
  const filePath = await save({
    filters: [
      {
        name: format.toUpperCase(),
        extensions: [extension],
      },
    ],
    defaultPath: `load-test-${summary.runId}.${extension}`,
  });

  if (!filePath) {
    return false;
  }

  const content =
    format === 'json'
      ? JSON.stringify(summary, null, 2)
      : summaryToCsv(summary);

  await writeTextFile(filePath, content);
  return true;
}

export interface RegressionComparison {
  metric: string;
  runA: number;
  runB: number;
  delta: number;
  percentageDelta: number;
  isRegression: boolean;
}

export function compareReports(runA: LoadTestSummary, runB: LoadTestSummary): RegressionComparison[] {
  const errorRateA = runA.metrics.totalRequests > 0 ? (runA.metrics.failedRequests / runA.metrics.totalRequests) * 100 : 0;
  const errorRateB = runB.metrics.totalRequests > 0 ? (runB.metrics.failedRequests / runB.metrics.totalRequests) * 100 : 0;

  const compare = (metric: string, a: number, b: number, lowerIsBetter: boolean): RegressionComparison => {
    const delta = a - b;
    const percentageDelta = b > 0 ? (delta / b) * 100 : (a > 0 ? 100 : 0);
    const isRegression = lowerIsBetter ? delta > 0 : delta < 0;
    return { metric, runA: a, runB: b, delta, percentageDelta, isRegression };
  };

  return [
    compare('Total Requests', runA.metrics.totalRequests, runB.metrics.totalRequests, false),
    compare('Error Rate (%)', errorRateA, errorRateB, true),
    compare('Average Latency (ms)', runA.metrics.avgLatencyMs, runB.metrics.avgLatencyMs, true),
    compare('P50 Latency (ms)', runA.metrics.p50LatencyMs, runB.metrics.p50LatencyMs, true),
    compare('P95 Latency (ms)', runA.metrics.p95LatencyMs, runB.metrics.p95LatencyMs, true),
    compare('P99 Latency (ms)', runA.metrics.p99LatencyMs, runB.metrics.p99LatencyMs, true),
    compare('Peak RPS', runA.metrics.peakRps, runB.metrics.peakRps, false),
    compare('Lowest RPS', runA.metrics.lowestRps, runB.metrics.lowestRps, false),
    compare('Peak Concurrent Reqs', runA.metrics.peakConcurrentRequests, runB.metrics.peakConcurrentRequests, false),
  ];
}

export interface SoakTestInsights {
  peakRps: number;
  lowestRps: number;
  peakConcurrentRequests: number;
  testDurationSeconds: number;
  averageThroughput: number;
}

export function generateSoakInsights(summary: LoadTestSummary): SoakTestInsights {
  return {
    peakRps: summary.metrics.peakRps,
    lowestRps: summary.metrics.lowestRps,
    peakConcurrentRequests: summary.metrics.peakConcurrentRequests,
    testDurationSeconds: summary.config.durationSeconds,
    averageThroughput: summary.metrics.rps,
  };
}

function normalizeOptionalNumber(value: number | undefined): number | null {
  if (value === undefined || Number.isNaN(value) || value <= 0) {
    return null;
  }

  return value;
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
