import { describe, expect, it } from 'vitest';
import {
  buildLoadTestConfig,
  normalizeCountMap,
  normalizeLoadTestSummary,
  summaryToCsv,
} from '../loadTesting';

describe('loadTesting service', () => {
  it('builds backend config payload from draft values', () => {
    const config = buildLoadTestConfig({
      url: 'https://api.example.com/test',
      method: 'POST',
      headers: [
        { key: 'Authorization', value: 'Bearer abc', enabled: true },
        { key: 'X-Disabled', value: 'ignore', enabled: false },
      ],
      body: '{"hello":"world"}',
      virtualUsers: 10,
      durationSeconds: 30,
      rampUpSeconds: 5,
      requestTimeoutSeconds: 15,
      maxInflightRequests: 100,
      thinkTimeMs: 25,
      loadMode: { type: 'constantRPS', targetRps: 50 },
    });

    expect(config.headers).toEqual({ Authorization: 'Bearer abc' });
    expect(config.body).toBe('{"hello":"world"}');
    expect(config.loadMode).toEqual({ type: 'constantRPS', targetRps: 50 });
  });

  it('normalizes count maps from object and array payloads', () => {
    expect(normalizeCountMap({ '200': 10, '500': 2 })).toEqual({ '200': 10, '500': 2 });
    expect(
      normalizeCountMap([
        ['200', 10],
        { errorType: 'TIMEOUT', count: 3 },
      ])
    ).toEqual({ '200': 10, TIMEOUT: 3 });
  });

  it('creates exportable summaries and csv output', () => {
    const summary = normalizeLoadTestSummary(
      {
        runId: 'run-123',
        config: {
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: {},
          body: null,
          virtualUsers: 10,
          durationSeconds: 30,
          rampUpSeconds: 5,
          requestTimeoutSeconds: 15,
          maxInflightRequests: 100,
          thinkTimeMs: 0,
          loadMode: { type: 'constantVU' },
        },
        metrics: {
          totalRequests: 100,
          completedRequests: 98,
          failedRequests: 2,
          activeRequests: 0,
          rps: 25,
          bandwidthBytesPerSec: 1024,
          totalBytes: 4096,
          minLatencyMs: 10,
          maxLatencyMs: 500,
          avgLatencyMs: 120,
          p50LatencyMs: 100,
          p90LatencyMs: 180,
          p95LatencyMs: 220,
          p99LatencyMs: 300,
          activeVus: 0,
          isRunning: false,
        },
        statusCodes: { '200': 98, '500': 2 },
        errors: { TIMEOUT: 2 },
        completedAtTimestamp: 1_700_000_000_000,
      },
      'COMPLETED'
    );

    const csv = summaryToCsv(summary);
    expect(summary.outcome).toBe('COMPLETED');
    expect(csv).toContain('meta,runId,run-123');
    expect(csv).toContain('statusCodes,200,98');
    expect(csv).toContain('errors,TIMEOUT,2');
  });
});
