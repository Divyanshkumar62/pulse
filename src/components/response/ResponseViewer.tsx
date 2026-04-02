import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import ResponseBody from './ResponseBody';

export default function ResponseViewer() {
  const { activeTabId, tabs } = useTabStore();
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies' | 'tests' | 'console'>('body');

  const tabData = tabs.find(t => t.id === activeTabId);
  const response = tabData?.response;
  const scriptResults = tabData?.scriptResults;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-deep)' }}>
      <div className="request-config-tabs" style={{ marginTop: 0, padding: '0 var(--space-4)', backgroundColor: 'var(--bg-surface)' }}>
        <button 
          className={`config-tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body
        </button>
        <button 
          className={`config-tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
        </button>
        <button 
          className={`config-tab ${activeTab === 'cookies' ? 'active' : ''}`}
          onClick={() => setActiveTab('cookies')}
        >
          Cookies
        </button>
        <button 
          className={`config-tab ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          Test Results {scriptResults?.tests && scriptResults.tests.length > 0 && `(${scriptResults.tests.filter(t => t.passed).length}/${scriptResults.tests.length})`}
        </button>
        <button 
          className={`config-tab ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => setActiveTab('console')}
        >
          Console {scriptResults?.logs && scriptResults.logs.length > 0 && `(${scriptResults.logs.length})`}
        </button>
        
        <div style={{ flex: 1 }} />
        {response && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
            <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{response.status} {response.status_text}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{response.time_ms} ms</span>
            <span style={{ color: 'var(--text-secondary)' }}>{response.body.length} bytes</span>
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, padding: 'var(--space-4)', overflow: 'hidden' }}>
        {response ? (
          activeTab === 'body' ? (
            <ResponseBody 
              content={response.body} 
              contentType={response.headers.find(h => h.key.toLowerCase() === 'content-type')?.value || 'application/json'} 
            />
          ) : activeTab === 'tests' ? (
            <div className="test-results" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scriptResults?.tests && scriptResults.tests.length > 0 ? (
                scriptResults.tests.map((test: any, i: number) => (
                  <div key={i} className="glass-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `4px solid ${test.passed ? 'var(--status-success)' : 'var(--status-error)'}` }}>
                    <span style={{ fontSize: '18px' }}>{test.passed ? '✓' : '✗'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{test.name}</div>
                      {test.message && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{test.message}</div>}
                    </div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6 }}>{test.passed ? 'Passed' : 'Failed'}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px' }}>
                  No tests were executed. Add tests in the "Tests" tab.
                </div>
              )}
            </div>
          ) : activeTab === 'console' ? (
            <div className="console-output" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              {scriptResults?.logs && scriptResults.logs.length > 0 ? (
                scriptResults.logs.map((log: string, i: number) => (
                  <div key={i} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-primary)', marginRight: '8px', opacity: 0.5 }}>[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px' }}>
                  Console is empty.
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px' }}>
              {activeTab} viewer coming soon...
            </div>
          )
        ) : (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px' }}>
            Response will appear here
          </div>
        )}
      </div>
    </div>
  );
}
