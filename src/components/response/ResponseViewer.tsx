import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';
import ResponseBody from './ResponseBody';
import '../../styles/components/response-viewer.css';

type ResponseTab = 'body' | 'preview' | 'headers' | 'test-results' | 'console';

export default function ResponseViewer() {
  const { activeTabId, tabs } = useTabStore();
  const { responsePosition, setResponsePosition } = useAppStore();
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');

  const tabData = tabs.find(t => t.id === activeTabId);
  const response = tabData?.response;

  const tabsConfig: { id: ResponseTab; label: string }[] = [
    { id: 'body', label: 'Json' },
    { id: 'preview', label: 'Preview' },
    { id: 'headers', label: 'Headers' },
    { id: 'test-results', label: 'Test Results' },
    { id: 'console', label: 'Console' },
  ];

  return (
    <div className="response-viewer">
      <div className="response-toolbar">
        <div className="response-tabs">
          {tabsConfig.map(tab => (
            <button 
              key={tab.id}
              className={`response-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="response-actions">
          {response && (
            <div className="response-meta">
              <span className={`status-pill ${response.status < 400 ? 'success' : 'error'}`}>
                {response.status} {response.status_text}
              </span>
              <span className="meta-item">{response.time_ms}ms</span>
              <span className="meta-item">{Math.round(response.body.length / 1024 * 100) / 100} KB</span>
            </div>
          )}
          
          <div className="layout-toggles">
            <button 
              className={`layout-btn ${responsePosition === 'bottom' ? 'active' : ''}`}
              onClick={() => setResponsePosition('bottom')}
              title="Dock to bottom"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
            </button>
            <button 
              className={`layout-btn ${responsePosition === 'right' ? 'active' : ''}`}
              onClick={() => setResponsePosition('right')}
              title="Dock to right"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="response-content">
        {response ? (
          activeTab === 'body' ? (
            <ResponseBody 
              content={response.body} 
              contentType={response.headers.find(h => h.key.toLowerCase() === 'content-type')?.value || 'application/json'} 
            />
          ) : activeTab === 'headers' ? (
            <div className="headers-view">
              {response.headers.map((h, i) => (
                <div key={i} className="header-row">
                  <span className="header-key">{h.key}:</span>
                  <span className="header-value">{h.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="placeholder-view">
              <div className="placeholder-icon">🛠️</div>
              <p>{activeTab.replace('-', ' ')} view is under development</p>
            </div>
          )
        ) : (
          <div className="empty-response">
            <div className="empty-icon">📡</div>
            <h3>Waiting for Request</h3>
            <p>Send a request to see the response data here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
