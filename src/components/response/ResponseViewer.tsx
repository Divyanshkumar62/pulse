import { useState, useMemo } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import ResponseBody from './ResponseBody';
import ResponseHistory from './ResponseHistory';
import ResponseDiff from './ResponseDiff';
import { Copy, Check } from 'lucide-react';
import '../../styles/components/response-viewer.css';

type ResponseTab = 'body' | 'preview' | 'headers' | 'diff' | 'test-results' | 'history' | 'console';

export default function ResponseViewer() {
  const { activeTabId, tabs } = useTabStore();
  const { responsePosition, setResponsePosition } = useAppStore();
  const { history } = useHistoryStore();
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [isCopied, setIsCopied] = useState(false);

  const tabData = tabs.find(t => t.id === activeTabId);
  const response = tabData?.response;
  const request = tabData?.request;
  const isLoading = tabData?.isLoading;

  const renderSkeleton = () => (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '12px' }} />
      </div>
      <div className="skeleton skeleton-rect" style={{ flex: 1, borderRadius: '8px' }} />
    </div>
  );

  const previousResponse = useMemo(() => {
    if (!request || !response) return null;
    const requestHistory = history.filter(h => h.requestId === request.id);
    
    // The current response is likely the first item in history if it was just saved.
    // We want the most recent response that is NOT the exact same timestamp/id as the current one.
    // If the current response is not yet in history, history[0] is the previous one.
    // If the current response IS in history[0], then history[1] is the previous one.
    
    // We can just find the first history entry that doesn't strictly match the current response object
    // Or we just take the second entry if the first matches.
    // Actually, comparing timestamps or just taking index 1 if we know index 0 is current.
    if (requestHistory.length > 0) {
      if (requestHistory[0].response.body === response.body && requestHistory[0].response.time_ms === response.time_ms) {
        return requestHistory.length > 1 ? requestHistory[1].response : null;
      }
      return requestHistory[0].response;
    }
    return null;
  }, [request, response, history]);

  const tabsConfig: { id: ResponseTab; label: string }[] = [
    { id: 'body', label: 'Json' },
    { id: 'preview', label: 'Preview' },
    { id: 'headers', label: 'Headers' },
    { id: 'diff', label: 'Diff' },
    { id: 'test-results', label: 'Test Results' },
    { id: 'history', label: 'History' },
    { id: 'console', label: 'Console' },
  ];

  const handleCopyResponse = () => {
    if (!response) return;
    let textToCopy = response.body;
    try {
      const parsed = JSON.parse(response.body);
      textToCopy = JSON.stringify(parsed, null, 2);
    } catch (err) {
      // Not valid JSON, copy as is
    }
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderPreview = (body: string, contentType: string) => {
    const lowerType = contentType.toLowerCase();
    
    if (lowerType.includes('text/html')) {
      return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
          <iframe 
            srcDoc={body} 
            sandbox="" 
            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff' }}
            title="HTML Response Preview"
          />
        </div>
      );
    }
    
    if (lowerType.includes('image/svg+xml')) {
      const svgDoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background-color: #ffffff;
              }
              svg {
                max-width: 100%;
                max-height: 100vh;
                height: auto;
              }
            </style>
          </head>
          <body>
            ${body}
          </body>
        </html>
      `;
      return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
          <iframe 
            srcDoc={svgDoc} 
            sandbox="" 
            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff' }}
            title="SVG Response Preview"
          />
        </div>
      );
    }

    const isImage = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].some(type => lowerType.includes(type));
    if (isImage) {
      let src = body;
      if (!body.startsWith('data:') && !body.startsWith('http://') && !body.startsWith('https://')) {
        try {
          let binary = '';
          const len = body.length;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(body.charCodeAt(i) & 0xff);
          }
          const base64 = window.btoa(binary);
          const mime = lowerType.split(';')[0] || 'image/png';
          src = `data:${mime};base64,${base64}`;
        } catch (e) {
          src = body;
        }
      }
      
      return (
        <div style={{ 
          height: '100%', 
          width: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'auto', 
          padding: '16px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
          border: '1px solid var(--border-default)'
        }}>
          <img 
            src={src} 
            alt="Response Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              borderRadius: '2px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }} 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const errorLabel = document.createElement('div');
                errorLabel.innerText = 'Failed to load preview image';
                errorLabel.style.color = 'var(--text-tertiary)';
                errorLabel.style.fontSize = '12px';
                parent.appendChild(errorLabel);
              }
            }}
          />
        </div>
      );
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        color: 'var(--text-tertiary)',
        fontSize: '13px'
      }}>
        No visual preview available for this content type
      </div>
    );
  };

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
            <>
              <div className="response-meta">
                <span className={`status-pill ${response.status < 400 ? 'success' : 'error'}`}>
                  {response.status} {response.status_text}
                </span>
                <span className="meta-item">{response.time_ms}ms</span>
                <span className="meta-item">{Math.round(response.body.length / 1024 * 100) / 100} KB</span>
              </div>
              
              <button className="copy-response-btn" onClick={handleCopyResponse} title="Copy formatted response">
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            </>
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
        {isLoading ? renderSkeleton() : (
          response ? (
            activeTab === 'body' ? (
              <ResponseBody 
                content={response.body} 
                contentType={response.headers.find((h: any) => h.key.toLowerCase() === 'content-type')?.value || 'application/json'} 
              />
            ) : activeTab === 'preview' ? (
              renderPreview(
                response.body, 
                response.headers.find((h: any) => h.key.toLowerCase() === 'content-type')?.value || ''
              )
            ) : activeTab === 'diff' ? (
              <ResponseDiff currentResponse={response} previousResponse={previousResponse} />
            ) : activeTab === 'headers' ? (
              <div className="headers-view">
                {response.headers.map((h: any, i: number) => (
                  <div key={i} className="header-row">
                    <span className="header-key">{h.key}:</span>
                    <span className="header-value">{h.value}</span>
                  </div>
                ))}
              </div>
            ) : activeTab === 'history' ? (
              <ResponseHistory />
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
          )
        )}
      </div>
    </div>
  );
}
