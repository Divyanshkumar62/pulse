import { describe, expect, it } from 'vitest';
import {
  buildLoadTestConfig,
  normalizeCountMap,
  normalizeLoadTestSummary,
  summaryToCsv,
  compareReports,
  generateSoakInsights,
} from '../loadTesting';
import { LoadTestSummary } from '../../types/loadTesting';

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
      thresholds: {
        p95MaxMs: 300
      }
    });

    expect(config.headers).toEqual({ Authorization: 'Bearer abc' });
    expect(config.body).toBe('{"hello":"world"}');
    expect(config.loadMode).toEqual({ type: 'constantRPS', targetRps: 50 });
    expect(config.thresholds).toEqual({ p95MaxMs: 300 });
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
          peakRps: 30,
          lowestRps: 5,
          peakConcurrentRequests: 10,
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

  it('generates soak test insights correctly', () => {
    const mockSummary = {
      config: { durationSeconds: 60 },
      metrics: { 
        rps: 10, 
        activeRequests: 5,
        peakRps: 20,
        lowestRps: 2,
        peakConcurrentRequests: 10
      },
      timeline: []
    } as unknown as LoadTestSummary;

    const insights = generateSoakInsights(mockSummary);
    expect(insights.peakRps).toBe(20);
    expect(insights.lowestRps).toBe(2);
    expect(insights.peakConcurrentRequests).toBe(10);
    expect(insights.testDurationSeconds).toBe(60);
    expect(insights.averageThroughput).toBe(10);
  });

  it('compares reports and detects regressions', () => {
    const runA = {
      metrics: { totalRequests: 200, failedRequests: 20, avgLatencyMs: 300, p50LatencyMs: 250, p95LatencyMs: 400, p99LatencyMs: 500 }
    } as unknown as LoadTestSummary;
    const runB = {
      metrics: { totalRequests: 100, failedRequests: 2, avgLatencyMs: 100, p50LatencyMs: 80, p95LatencyMs: 150, p99LatencyMs: 200 }
    } as unknown as LoadTestSummary;

    const comparison = compareReports(runA, runB);
    const p95Comp = comparison.find(c => c.metric === 'P95 Latency (ms)');
    expect(p95Comp?.isRegression).toBe(true);
    expect(p95Comp?.delta).toBe(250);

    const reqComp = comparison.find(c => c.metric === 'Total Requests');
    expect(reqComp?.isRegression).toBe(false); // Higher is better for total requests
    expect(reqComp?.delta).toBe(100);

    const errComp = comparison.find(c => c.metric === 'Error Rate (%)');
    expect(errComp?.isRegression).toBe(true); // runA error rate is 10%, runB is 2%
    expect(errComp?.delta).toBe(8);
  });
});
