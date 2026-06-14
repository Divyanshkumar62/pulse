import { RotateCcw, Zap, History, Layout, BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '../ui/EmptyState';
import { DEFAULT_LOAD_TEST_CONFIG, formatLifecycleLabel } from '../../services/loadTesting';
import { useLoadTestStore } from '../../stores/useLoadTestStore';
import '../../styles/components/load-testing.css';

export default function LoadTestingSidebar() {
  const {
    updateDraftConfig,
    resetDraftConfig,
    reports,
    selectedReportRunId,
    selectReport,
    currentStage,
    isStarting,
    isStopping,
    clearLiveState,
  } = useLoadTestStore();

  const isRunning = currentStage === 'STARTED' || currentStage === 'RUNNING';
  const isBusy = isRunning || isStarting || isStopping;

  const getPathname = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.pathname === '/' ? url.hostname : url.pathname;
    } catch {
      return urlString || 'unknown';
    }
  };

  return (
    <div className="load-test-sidebar">
      <div className="load-test-sidebar-header">
        <div>
          <h3>Load Testing</h3>
          <p>Navigation & History</p>
        </div>
        <button
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          onClick={() => {
            resetDraftConfig();
            clearLiveState();
            toast.success('Load test context reset');
          }}
          disabled={isBusy}
          title="Reset to Builder"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div className="load-test-sidebar-scroll custom-scrollbar-mini">
        <section className="load-test-section">
          <div className="load-test-section-header">
            <BookOpen size={14} style={{ marginRight: '8px', opacity: 0.6 }} />
            <span>Recommended Presets</span>
          </div>
          <div className="load-test-presets-sidebar">
            <PresetNavItem
              title="Smoke Test"
              subtitle="25 VUs · 30s"
              onClick={() =>
                updateDraftConfig({
                  ...DEFAULT_LOAD_TEST_CONFIG,
                  virtualUsers: 25,
                  durationSeconds: 30,
                  rampUpSeconds: 5,
                })
              }
              disabled={isBusy}
            />
            <PresetNavItem
              title="Stress Test"
              subtitle="150 VUs · 5m"
              onClick={() =>
                updateDraftConfig({
                  ...DEFAULT_LOAD_TEST_CONFIG,
                  virtualUsers: 150,
                  durationSeconds: 300,
                  rampUpSeconds: 30,
                })
              }
              disabled={isBusy}
            />
             <PresetNavItem
              title="Soak Test"
              subtitle="50 VUs · 1h"
              onClick={() =>
                updateDraftConfig({
                  ...DEFAULT_LOAD_TEST_CONFIG,
                  virtualUsers: 50,
                  durationSeconds: 3600,
                  rampUpSeconds: 60,
                })
              }
              disabled={isBusy}
            />
          </div>
        </section>

        <section className="load-test-section">
          <div className="load-test-section-header">
            <History size={14} style={{ marginRight: '8px', opacity: 0.6 }} />
            <span>Recent Runs</span>
          </div>

          {reports.length === 0 && !isRunning && !isStarting ? (
            <div style={{ minHeight: 180 }}>
              <EmptyState
                icon={Zap}
                title="No Runs Yet"
                description="Completed load tests will show up here for quick comparison."
                compact
              />
            </div>
          ) : (
            <div className="load-test-report-list">
                {(isRunning || isStarting) && (
                    <button 
                    className={`load-test-report-item ${!selectedReportRunId ? 'selected' : ''}`}
                    onClick={() => selectReport(null)}
                    style={{ marginBottom: '8px', borderLeft: '3px solid var(--accent-primary)' }}
                    >
                        <div className="load-test-report-topline">
                            <strong>{isStarting ? 'Starting Test...' : 'Live Run'}</strong>
                            <span className={`load-test-status-pill mini ${statusTone(currentStage)}`}>
                                {formatLifecycleLabel(currentStage)}
                            </span>
                        </div>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>
                            {isStarting ? 'Allocating Tokio workers...' : 'Streaming telemetry'}
                        </span>
                    </button>
                )}

              {reports.map((report) => {
                const isSelected = selectedReportRunId === report.runId;

                return (
                  <button
                    key={report.runId}
                    className={`load-test-report-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectReport(report.runId)}
                    style={{ padding: '12px' }}
                  >
                    <div className="load-test-report-topline">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span className="text-accent" style={{ fontWeight: 800, fontSize: '10px', minWidth: '24px' }}>{report.config.method}</span>
                        <strong className="truncate" style={{ fontSize: '12px' }}>{getPathname(report.config.url)}</strong>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {report.outcome === 'COMPLETED' ? (
                          <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                        ) : (
                          <XCircle size={14} style={{ color: '#ef4444' }} />
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '10px', opacity: 0.6 }}>
                        <span>{new Date(report.completedAtTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{report.metrics.completedRequests.toLocaleString()} reqs</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="load-test-sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <Layout size={12} />
            <span>Dual-State Canvas</span>
        </div>
      </div>
    </div>
  );
}

function PresetNavItem({ title, subtitle, onClick, disabled }: { title: string, subtitle: string, onClick: () => void, disabled: boolean }) {
    return (
        <button 
            className="load-test-preset-nav-item" 
            onClick={onClick} 
            disabled={disabled}
        >
            <div className="preset-dot" />
            <div className="preset-info">
                <span className="preset-title">{title}</span>
                <span className="preset-subtitle">{subtitle}</span>
            </div>
        </button>
    );
}

function statusTone(stage: string) {
  switch (stage) {
    case 'RUNNING':
    case 'STARTED':
      return 'info';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'warning';
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}
