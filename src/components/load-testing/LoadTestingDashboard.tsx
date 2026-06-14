import { BarChart3, CircleOff, Download, Gauge, Layers3, Radar, Timer, Zap, History, LayoutPanelLeft, Plus, CheckCircle2, XCircle, ArrowRightLeft, TrendingUp, TrendingDown, Activity, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useState } from 'react';
import EmptyState from '../ui/EmptyState';
import { formatLifecycleLabel, generateSoakInsights, compareReports } from '../../services/loadTesting';
import { stopLoadTest } from '../../hooks/useTauri';
import { useLoadTestStore } from '../../stores/useLoadTestStore';
import '../../styles/components/load-testing.css';

export default function LoadTestingDashboard() {
  const {
    currentRunId,
    currentStage,
    currentSnapshot,
    lifecycleEvents: liveLifecycleEvents,
    timeline: liveTimeline,
    reports,
    selectedReportRunId,
    activeReport,
    isStopping,
    setStopPending,
    clearLiveState,
    draftConfig,
  } = useLoadTestStore();

  const [compareMode, setCompareMode] = useState(false);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);

  const isLive = currentStage === 'STARTED' || currentStage === 'RUNNING';
  const displayedReport =
    (selectedReportRunId && reports.find((report) => report.runId === selectedReportRunId)) ||
    activeReport ||
    null;

  const displayedMetrics = isLive ? currentSnapshot : displayedReport?.metrics || currentSnapshot;
  const displayedTimeline = isLive ? liveTimeline : displayedReport?.timeline || [];
  const displayedEvents = isLive ? liveLifecycleEvents : displayedReport?.lifecycleEvents || [];
  const displayedStage = isLive ? currentStage : displayedReport?.outcome || 'IDLE';
  const displayedThresholds = displayedReport?.thresholds || null;
  const soakInsights = displayedReport ? generateSoakInsights(displayedReport) : null;
  
  const compareTargetReport = reports.find(r => r.runId === compareTargetId);
  const comparisonResults = (displayedReport && compareTargetReport) ? compareReports(compareTargetReport, displayedReport) : null;
  
  // Use config from report if available, otherwise from draft
  const method = displayedReport?.config.method || draftConfig.method;
  const url = displayedReport?.config.url || draftConfig.url;

  const handleStop = async () => {
    setStopPending(true);

    try {
      const stopped = await stopLoadTest();
      if (!stopped) {
        setStopPending(false);
        toast.info('No running load test found');
      }
    } catch (error: any) {
      setStopPending(false);
      toast.error(error?.message || 'Failed to stop load test');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!displayedReport) {
      toast.error('No summary available to export yet');
      return;
    }

    try {
      let content = '';
      
      // Smart Filename Generator
      const now = new Date(displayedReport.completedAtTimestamp);
      const YYYYMMDD = now.toISOString().split('T')[0].replace(/-/g, '');
      const HHMMSS = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const timestamp = `${YYYYMMDD}-${HHMMSS}`;
      
      let hostname = 'unknown';
      try {
        hostname = new URL(displayedReport.config.url).hostname.replace(/\./g, '-');
      } catch (e) {
        // Fallback if URL is invalid
      }
      
      const defaultPath = `pulse-loadtest-${displayedReport.config.method}-${hostname}-${timestamp}.${format}`;

      const exportData = {
        ...displayedReport,
        insights: soakInsights,
        comparison: comparisonResults
      };

      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
      } else {
        // Simple CSV format
        const rows = [
          ['Run ID', displayedReport.runId],
          ['Outcome', displayedReport.outcome],
          ['Timestamp', new Date(displayedReport.completedAtTimestamp).toISOString()],
          ['Method', displayedReport.config.method],
          ['URL', displayedReport.config.url],
          ['VUs', displayedReport.config.virtualUsers],
          ['Duration', `${displayedReport.config.durationSeconds}s`],
          [],
          ['Metric', 'Value'],
          ['Total Requests', (displayedReport.metrics.completedRequests ?? 0) + (displayedReport.metrics.failedRequests ?? 0)],
          ['Completed', displayedReport.metrics.completedRequests ?? 0],
          ['Failed', displayedReport.metrics.failedRequests ?? 0],
          ['Avg RPS', (displayedReport.metrics.rps ?? 0).toFixed(2)],
          ['Peak RPS', soakInsights ? (soakInsights.peakRps ?? 0).toFixed(2) : 'N/A'],
          ['Avg Latency (ms)', (displayedReport.metrics.avgLatencyMs ?? 0).toFixed(2)],
          ['P95 Latency (ms)', (displayedReport.metrics.p95LatencyMs ?? 0).toFixed(2)],
          ['Max Latency (ms)', (displayedReport.metrics.maxLatencyMs ?? 0).toFixed(2)],
        ];

        if (displayedThresholds && displayedThresholds.length > 0) {
          rows.push([]);
          rows.push(['Threshold', 'Expected', 'Actual', 'Passed']);
          displayedThresholds.forEach(t => rows.push([t.name, t.expected, (t.actual ?? 0).toFixed(2), t.passed ? 'YES' : 'NO']));
        }

        if (comparisonResults) {
          rows.push([]);
          rows.push(['Regression Comparison', 'Baseline', 'Current', 'Delta %', 'Regression?']);
          comparisonResults.forEach(c => rows.push([c.metric, (c.runB ?? 0).toFixed(2), (c.runA ?? 0).toFixed(2), (c.percentageDelta ?? 0).toFixed(2), c.isRegression ? 'YES' : 'NO']));
        }

        content = rows.map(row => row.join(',')).join('\n');
      }

      const filePath = await save({
        defaultPath,
        filters: [{
          name: format.toUpperCase(),
          extensions: [format]
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, content);
        toast.success(`Load test summary exported to disk`);
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(error?.message || 'Failed to export summary');
    }
  };

  return (
    <div className="load-test-shell custom-scrollbar-mini">
      <div className="load-test-hero" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <div className="icon-action-btn-container" style={{ marginTop: '4px' }}>
            <button 
              className="icon-action-btn" 
              onClick={clearLiveState}
              title="Back to Builder"
              style={{ padding: '10px', borderRadius: '12px' }}
            >
              <LayoutPanelLeft size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className={`load-test-status-pill ${statusTone(displayedStage as string)}`}>
              <span className="load-test-status-dot" />
              {formatLifecycleLabel(displayedStage as any)}
            </div>
            <h1 style={{ marginTop: '12px', marginBottom: '4px', textAlign: 'left' }}>
                {isLive ? 'Live Telemetry' : 'Test Summary'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <span className="text-accent" style={{ fontWeight: 800, fontSize: '11px', padding: '2px 6px', background: 'var(--accent-subtle)', borderRadius: '4px' }}>{method}</span>
                <span className="text-mono" style={{ opacity: 0.8, fontSize: '13px' }}>{url}</span>
            </div>
          </div>
        </div>

        <div className="load-test-hero-actions">
          {displayedReport && !isLive && (
            <>
                <button className="btn-secondary" onClick={() => handleExport('json')}>
                    <Download size={14} /> Export JSON
                </button>
                <button className="btn-secondary" onClick={() => handleExport('csv')}>
                    <Download size={14} /> Export CSV
                </button>
            </>
          )}
          
          {isLive ? (
            <button 
              className="btn-primary" 
              onClick={handleStop} 
              disabled={isStopping}
              style={{ background: 'var(--error-surface)', color: 'var(--error-text)', borderColor: 'var(--error-border)' }}
            >
              <CircleOff size={14} />
              {isStopping ? 'Stopping…' : 'Cancel Run'}
            </button>
          ) : (
            <button 
              className="btn-primary" 
              onClick={clearLiveState}
            >
              <Plus size={14} />
              New Test
            </button>
          )}
        </div>
      </div>

      <div className="load-test-metric-grid">
        <MetricCard
          icon={Zap}
          label="Throughput"
          value={metricValue(displayedMetrics?.rps, 'rps')}
          tone="info"
        />
        <MetricCard
          icon={Timer}
          label="P95 Latency"
          value={metricValue(displayedMetrics?.p95LatencyMs, 'ms')}
          tone="warning"
        />
        <MetricCard
          icon={Gauge}
          label="Active VUs"
          value={metricValue(displayedMetrics?.activeVus)}
          tone="neutral"
        />
        <MetricCard
          icon={Layers3}
          label="Total Completed"
          value={metricValue(displayedMetrics?.completedRequests)}
          tone="success"
        />
        <MetricCard
          icon={Radar}
          label="Total Failed"
          value={metricValue(displayedMetrics?.failedRequests)}
          tone="danger"
        />
         <MetricCard
          icon={BarChart3}
          label="Success Rate"
          value={displayedMetrics ? `${((displayedMetrics.completedRequests / Math.max(displayedMetrics.completedRequests + displayedMetrics.failedRequests, 1)) * 100).toFixed(1)}%` : '—'}
          tone="success"
        />
      </div>

      <div className="load-test-chart-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <ChartCard
          title="Throughput"
          subtitle="Requests per second (500ms snapshots)"
          points={displayedTimeline}
          accessor={(point) => point.rps}
          formatValue={(value) => `${(value ?? 0).toFixed(0)} rps`}
          stroke="var(--accent-primary)"
          fill="rgba(0, 112, 243, 0.14)"
        />
        <ChartCard
          title="Latency P-Metrics"
          subtitle="P95 response time (ms)"
          points={displayedTimeline}
          accessor={(point) => point.p95LatencyMs}
          formatValue={(value) => `${(value ?? 0).toFixed(0)} ms`}
          stroke="#f59e0b"
          fill="rgba(245, 158, 11, 0.14)"
        />
      </div>

      {/* Phase 2: Performance Validation & Insights */}
      {displayedReport && (
          <div className="load-test-summary-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '24px' }}>
              <div className="load-test-card">
                  <div className="load-test-card-header" style={{ marginBottom: '16px' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Shield size={16} className="text-accent" />
                          Performance Validation
                      </h3>
                  </div>
                  {displayedThresholds && displayedThresholds.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {displayedThresholds.map((t, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${t.passed ? '#10b981' : '#ef4444'}` }}>
                                  {t.passed ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                  <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                          Actual: {(t.actual ?? 0).toFixed(2)} | Expected: {t.name.includes('Rate') || t.name.includes('Latency') ? '<=' : '>='} {t.expected}
                                      </div>
                                  </div>
                                  <div style={{ fontSize: '11px', fontWeight: 800, color: t.passed ? '#10b981' : '#ef4444' }}>
                                      {t.passed ? 'PASS' : 'FAIL'}
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="load-test-placeholder">No thresholds configured for this run.</div>
                  )}
              </div>

              <div className="load-test-card">
                  <div className="load-test-card-header" style={{ marginBottom: '16px' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={16} className="text-accent" />
                          Soak Test Insights
                      </h3>
                  </div>
                  {soakInsights ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Peak Throughput</span>
                              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{(soakInsights.peakRps ?? 0).toFixed(0)} RPS</strong>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Lowest Throughput</span>
                              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{(soakInsights.lowestRps ?? 0).toFixed(0)} RPS</strong>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Peak Concurrent Reqs</span>
                              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{soakInsights.peakConcurrentRequests ?? 0}</strong>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Test Duration</span>
                              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{soakInsights.testDurationSeconds ?? 0}s</strong>
                          </div>
                      </div>
                  ) : (
                      <div className="load-test-placeholder">Insights unavailable for active runs.</div>
                  )}
              </div>
          </div>
      )}

      {/* Phase 2: Report Comparison Mode */}
      {!isLive && displayedReport && (
          <div className="load-test-card" style={{ marginTop: '24px' }}>
              <div className="load-test-card-header" style={{ marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowRightLeft size={16} className="text-accent" />
                      Report Comparison
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Compare with:</span>
                      <select 
                          className="text-input" 
                          style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)' }}
                          value={compareTargetId || ''}
                          onChange={(e) => setCompareTargetId(e.target.value || null)}
                      >
                          <option value="">Select a run...</option>
                          {reports.filter(r => r.runId !== displayedReport.runId).map(r => (
                              <option key={r.runId} value={r.runId}>
                                  {new Date(r.completedAtTimestamp).toLocaleString()} ({r.runId.slice(0,8)})
                              </option>
                          ))}
                      </select>
                  </div>
              </div>
              
              {compareTargetReport && comparisonResults ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          <div>METRIC</div>
                          <div>BASELINE (Run B)</div>
                          <div>CURRENT (Run A)</div>
                          <div>DELTA</div>
                      </div>
                      {comparisonResults.map((res, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px', alignItems: 'center' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{res.metric}</div>
                              <div style={{ color: 'var(--text-secondary)' }}>{res.runB.toFixed(1)}</div>
                              <div style={{ color: 'var(--text-secondary)' }}>{res.runA.toFixed(1)}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: res.isRegression ? '#ef4444' : (res.percentageDelta === 0 ? 'var(--text-tertiary)' : '#10b981'), fontWeight: 600 }}>
                                  {res.isRegression ? <TrendingUp size={14} /> : (res.percentageDelta !== 0 && <TrendingDown size={14} />)}
                                  {res.delta > 0 ? '+' : ''}{res.delta.toFixed(1)} ({res.percentageDelta.toFixed(1)}%)
                              </div>
                          </div>
                      ))}
                      {comparisonResults.some(r => r.isRegression) && (
                          <div style={{ padding: '12px', marginTop: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Shield size={14} />
                              <strong>Warning:</strong> Performance regressions detected compared to baseline.
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="load-test-placeholder">Select a historical run from the dropdown to compare performance.</div>
              )}
          </div>
      )}

      <div className="load-test-summary-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '24px' }}>
        <div className="load-test-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="load-test-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} className="text-accent" />
                Lifecycle Feed
              </h3>
              <p>Real-time event stream from the Tokio engine.</p>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '300px' }}>
            {displayedEvents.length === 0 ? (
                <div className="load-test-placeholder">No engine events recorded.</div>
            ) : (
                <div className="load-test-feed custom-scrollbar-mini" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {displayedEvents.map((event, idx) => (
                    <div key={`${event.runId}-${event.stage}-${idx}`} className="load-test-feed-item">
                        <div className={`load-test-status-pill mini ${statusTone(event.stage)}`}>
                            {formatLifecycleLabel(event.stage)}
                        </div>
                        <div className="load-test-feed-text">
                            <strong>Event Triggered</strong>
                            <span>{event.message || 'Lifecycle transition recorded.'}</span>
                        </div>
                        <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
                    </div>
                ))}
                </div>
            )}
          </div>
        </div>

        <div className="load-test-card">
          <div className="load-test-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radar size={16} className="text-accent" />
                Error & Status Breakdown
              </h3>
              <p>Distribution of responses and caught exceptions.</p>
            </div>
          </div>

          <div className="load-test-breakdown-grid">
            <BreakdownCard 
                title="HTTP Status Codes" 
                items={displayedReport?.statusCodes || {}} 
                emptyLabel="No status codes yet" 
            />
            <BreakdownCard 
                title="Engine Errors" 
                items={displayedReport?.errors || {}} 
                emptyLabel="No errors reported" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  return (
    <div className="load-test-card load-test-metric-card">
      <div className={`load-test-metric-icon ${tone}`}>
        <Icon size={16} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  points,
  accessor,
  formatValue,
  stroke,
  fill,
}: {
  title: string;
  subtitle: string;
  points: any[];
  accessor: (point: any) => number;
  formatValue: (value: number) => string;
  stroke: string;
  fill: string;
}) {
  const primarySeries = points.map(accessor);
  const maxValue = Math.max(...primarySeries, 1);
  const latestValue = primarySeries[primarySeries.length - 1] || 0;

  return (
    <div className="load-test-card">
      <div className="load-test-card-header" style={{ marginBottom: '12px' }}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <strong className="load-test-chart-value" style={{ color: stroke }}>{formatValue(latestValue)}</strong>
      </div>
      <div className="load-test-chart">
        {points.length < 2 ? (
          <div className="load-test-placeholder">Chart data appears after the first snapshots arrive.</div>
        ) : (
          <svg viewBox="0 0 320 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`fill-${title.replace(/\s+/g, '-')}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={fill.replace('0.14', '0.4').replace('0.12', '0.3')} />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            <path
              d={`${buildLinePath(primarySeries, maxValue)} L 320 160 L 0 160 Z`}
              fill={`url(#fill-${title.replace(/\s+/g, '-')})`}
              opacity={0.8}
            />
            <path d={buildLinePath(primarySeries, maxValue)} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: Record<string, number>;
  emptyLabel: string;
}) {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]);

  return (
    <div className="load-test-breakdown-card">
      <h4 style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px' }}>{title}</h4>
      {entries.length === 0 ? (
        <div className="load-test-placeholder compact">{emptyLabel}</div>
      ) : (
        <div className="load-test-breakdown-list">
          {entries.map(([label, count]) => (
            <div key={label} className="load-test-breakdown-row">
              <span className="text-mono" style={{ fontSize: '12px' }}>{label}</span>
              <strong>{count.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildLinePath(values: number[], maxValue: number) {
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 320;
      const y = 150 - (value / maxValue) * 130;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function metricValue(value?: number, suffix?: string) {
  if (value === undefined || value === null) return '—';
  const rounded = value >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value.toFixed(value % 1 === 0 ? 0 : 1);
  return suffix ? `${rounded}${suffix}` : rounded;
}

function statusTone(stage: string) {
  switch (stage) {
    case 'RUNNING':
    case 'STARTED': return 'info';
    case 'COMPLETED': return 'success';
    case 'CANCELLED': return 'warning';
    case 'FAILED': return 'danger';
    default: return 'neutral';
  }
}
