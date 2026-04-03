import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import ResponseBody from './ResponseBody';

export default function ResponseViewer() {
  const { activeTabId, tabs } = useTabStore();
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies'>('body');

  const tabData = tabs.find(t => t.id === activeTabId);
  const response = tabData?.response;

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
