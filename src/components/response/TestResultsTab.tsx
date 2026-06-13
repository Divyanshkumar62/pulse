import { useMemo } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function TestResultsTab() {
  const { activeTabId, tabs } = useTabStore();
  
  const tabData = tabs.find(t => t.id === activeTabId);
  const testResults = tabData?.testResults || [];

  const stats = useMemo(() => {
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    return { total, passed, failed: total - passed };
  }, [testResults]);

  if (testResults.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', padding: '24px', textAlign: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧪</div>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>No tests were run for this request</h3>
        <p style={{ margin: 0, maxWidth: '300px' }}>Add tests in the 'Scripts' tab using pulse.test()</p>
      </div>
    );
  }

  return (
    <div className="test-results-container">
      <div className="results-summary-bar">
        <div className="summary-badge">
          <span className="badge-label">Tests Passed</span>
          <span className={`badge-value ${stats.failed === 0 ? 'all-passed' : 'some-failed'}`}>
            {stats.passed} / {stats.total}
          </span>
        </div>
        
        <div className="summary-pills">
          <div className="stat-pill passed">
            <span className="pill-dot"></span>
            {stats.passed} Passed
          </div>
          {stats.failed > 0 && (
            <div className="stat-pill failed">
              <span className="pill-dot"></span>
              {stats.failed} Failed
            </div>
          )}
        </div>
      </div>

      <div className="results-list">
        {testResults.map((result, index) => (
          <div key={index} className={`test-result-item ${result.passed ? 'passed' : 'failed'}`}>
            <div className="result-status-icon">
              {result.passed ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <XCircle size={16} className="text-error" />
              )}
            </div>
            <div className="result-details">
              <div className="result-name">{result.name}</div>
              {!result.passed && result.error && (
                <div className="result-error-msg">{result.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .test-results-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 16px;
          overflow-y: auto;
          gap: 20px;
        }

        .results-summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-default);
        }

        .summary-badge {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .badge-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }

        .badge-value {
          font-size: 20px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .badge-value.all-passed {
          color: #10b981;
        }

        .badge-value.some-failed {
          color: #ef4444;
        }

        .summary-pills {
          display: flex;
          gap: 8px;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.05);
        }

        .stat-pill .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .stat-pill.passed .pill-dot { background-color: #10b981; }
        .stat-pill.failed .pill-dot { background-color: #ef4444; }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .test-result-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid transparent;
        }

        .test-result-item.passed {
          border-left: 3px solid #10b981;
        }

        .test-result-item.failed {
          border-left: 3px solid #ef4444;
          background: rgba(239, 68, 68, 0.02);
        }

        .result-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .result-error-msg {
          font-size: 12px;
          color: #ef4444;
          margin-top: 4px;
          font-family: var(--font-mono);
          opacity: 0.9;
        }

        .text-success { color: #10b981; }
        .text-error { color: #ef4444; }

        .empty-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: var(--text-tertiary);
          gap: 12px;
          text-align: center;
        }

        .empty-icon {
          font-size: 32px;
          opacity: 0.5;
        }

        .hint-text {
          font-size: 12px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
