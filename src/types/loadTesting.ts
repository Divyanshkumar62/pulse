import type { HttpMethod, KeyValuePair } from './index';

export type LoadTestMethod = Exclude<HttpMethod, 'WS'>;

export type LoadTestLifecycleStage =
  | 'STARTED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type LoadTestModeDraft =
  | { type: 'constantVU' }
  | { type: 'constantRPS'; targetRps: number };

export interface LoadTestConfigDraft {
  url: string;
  method: LoadTestMethod;
  headers: KeyValuePair[];
  body: string;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  requestTimeoutSeconds?: number;
  maxInflightRequests?: number;
  thinkTimeMs?: number;
  loadMode: LoadTestModeDraft;
}

export type LoadTestMode =
  | { type: 'constantVU' }
  | { type: 'constantRPS'; targetRps: number };

export interface LoadTestConfig {
  url: string;
  method: LoadTestMethod;
  headers: Record<string, string>;
  body?: string | null;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  requestTimeoutSeconds?: number | null;
  maxInflightRequests?: number | null;
  thinkTimeMs?: number | null;
  loadMode: LoadTestMode;
}

export interface MetricSnapshot {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  activeRequests: number;
  rps: number;
  bandwidthBytesPerSec: number;
  totalBytes: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  activeVus: number;
  isRunning: boolean;
}

export interface LoadTestLifecycleEvent {
  runId: string;
  stage: LoadTestLifecycleStage;
  message?: string | null;
  timestamp: number;
}

export interface LoadTestSummary {
  runId: string;
  config: LoadTestConfig;
  metrics: MetricSnapshot;
  statusCodes: Record<string, number>;
  errors: Record<string, number>;
  completedAtTimestamp: number;
  outcome: Extract<LoadTestLifecycleStage, 'COMPLETED' | 'CANCELLED' | 'FAILED'>;
  timeline: LoadTestTimelinePoint[];
  lifecycleEvents: LoadTestLifecycleEvent[];
}

export interface LoadTestSummaryRaw {
  runId: string;
  config: LoadTestConfig;
  metrics: MetricSnapshot;
  statusCodes?: unknown;
  errors?: unknown;
  completedAtTimestamp: number;
}

export interface LoadTestTimelinePoint {
  timestamp: number;
  rps: number;
  p95LatencyMs: number;
  avgLatencyMs: number;
  activeRequests: number;
  activeVus: number;
  completedRequests: number;
  failedRequests: number;
  totalBytes: number;
}
