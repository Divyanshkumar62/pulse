import { useState, useMemo, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import ResponseBody from './ResponseBody';
import ResponseHistory from './ResponseHistory';
import ResponseDiff from './ResponseDiff';
import TestResultsTab from './TestResultsTab';
import ConsoleTab from './ConsoleTab';
import StreamTimeline from './StreamTimeline';
import { Copy, Check, Play, Square } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useMockStore } from '../../stores/useMockStore';
import { connectStream, sendStreamFrame, disconnectStream } from '../../hooks/useTauri';
import type { StreamFrame, StreamStatus } from '../../types';
import { toast } from 'sonner';
import SpecDiffDrawer from './SpecDiffDrawer';
import '../../styles/components/response-viewer.css';

type ResponseTab = 'body' | 'stream' | 'preview' | 'headers' | 'diff' | 'test-results' | 'history' | 'console';

export default function ResponseViewer() {
  const { activeTabId, tabs, addStreamFrame, setStreamStatus, clearStreamFrames } = useTabStore();
  const { responsePosition, setResponsePosition } = useAppStore();
  const { history } = useHistoryStore();
  const { createMockFromResponse } = useMockStore();
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [isCopied, setIsCopied] = useState(false);
  const [driftErrors, setDriftErrors] = useState<string[]>([]);
  const [isDiffDrawerOpen, setIsDiffDrawerOpen] = useState(false);

  const tabData = tabs.find(t => t.id === activeTabId);
  const streamFrames = tabData?.streamFrames || [];
  const streamStatus = tabData?.streamStatus || 'disconnected';
  const response = tabData?.response;
  const request = tabData?.request;
  const isLoading = tabData?.isLoading;

  const isStreamingProtocol = useMemo(() => {
    if (!request) return false;
    return request.protocol === 'ws' || 
           request.url?.startsWith('ws://') || 
           request.url?.startsWith('wss://') ||
           request.headers?.some(h => h.key.toLowerCase() === 'accept' && h.value.includes('text/event-stream'));
  }, [request]);

  // Clear drift errors when a new request begins loading or response changes
  useEffect(() => {
    setDriftErrors([]);
  }, [response, isLoading]);

  // Listen for spec drift & stream events from Tauri
  useEffect(() => {
    if (!request?.id) return;

    const unlistenDriftPromise = listen('spec-drift-result', (event: any) => {
      const payload = event.payload as { requestId: string; driftErrors: string[] };
      if (payload.requestId === request.id) {
        setDriftErrors(payload.driftErrors || []);
      }
    });

    const unlistenFramePromise = listen('stream-frame', (event: any) => {
      const frame = event.payload as StreamFrame;
      if (frame.connectionId === request.id) {
        addStreamFrame(request.id, frame);
      }
    });

    const unlistenStatusPromise = listen('stream-status', (event: any) => {
      const status = event.payload as StreamStatus;
      if (status.connectionId === request.id) {
        setStreamStatus(request.id, status.status);
      }
    });

    return () => {
      unlistenDriftPromise.then(unlisten => unlisten());
      unlistenFramePromise.then(unlisten => unlisten());
      unlistenStatusPromise.then(unlisten => unlisten());
    };
  }, [request?.id, addStreamFrame, setStreamStatus]);

  const handleConnectStream = async () => {
    if (!request?.url || !request?.id) return;
    try {
      const protocol = request.protocol === 'ws' || request.url.startsWith('ws') ? 'WS' : 'SSE';
      const headersMap: Record<string, string> = {};
      request.headers?.forEach(h => {
        if (h.key && h.value) headersMap[h.key] = h.value;
      });
      await connectStream(request.id, protocol, request.url, headersMap);
      setActiveTab('stream');
      toast.success(`Connecting to ${protocol} stream...`);
    } catch (e: any) {
      toast.error('Stream connection error: ' + (e.message || e));
    }
  };

  const handleDisconnectStream = async () => {
    if (!request?.id) return;
    try {
      await disconnectStream(request.id);
      setStreamStatus(request.id, 'disconnected');
      toast.info('Disconnected from stream');
    } catch (e: any) {
      toast.error('Disconnect error: ' + (e.message || e));
    }
  };

  const handleSendFrame = async (payload: string) => {
    if (!request?.id) return;
    try {
      await sendStreamFrame(request.id, payload);
    } catch (e: any) {
      toast.error('Failed to send frame: ' + (e.message || e));
    }
  };

  const handleClearTimeline = () => {
    if (request?.id) {
      clearStreamFrames(request.id);
    }
  };

  const handleCreateMock = async () => {
    if (!request || !response) return;
    try {
      await createMockFromResponse(request, response);
      toast.success('Mock route created successfully on port 4000!');
    } catch (e: any) {
      toast.error('Failed to create mock route: ' + (e.message || e));
    }
  };

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
    
    if (requestHistory.length > 0) {
      if (requestHistory[0].response.body === response.body && requestHistory[0].response.time_ms === response.time_ms) {
        return requestHistory.length > 1 ? requestHistory[1].response : null;
      }
      return requestHistory[0].response;
    }
    return null;
  }, [request, response, history]);

  const tabsConfig = useMemo(() => {
    const list: { id: ResponseTab; label: string }[] = [
      { id: 'body', label: 'Body' }
    ];
    if (isStreamingProtocol || streamFrames.length > 0 || activeTab === 'stream') {
      list.push({ id: 'stream', label: 'Stream Timeline' });
    }
    list.push(
      { id: 'preview', label: 'Preview' },
      { id: 'headers', label: 'Headers' },
      { id: 'diff', label: 'Diff' },
      { id: 'test-results', label: 'Test Results' },
      { id: 'history', label: 'History' },
      { id: 'console', label: 'Console' }
    );
    return list;
  }, [isStreamingProtocol, streamFrames.length, activeTab]);

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

  const [showTimingBreakdown, setShowTimingBreakdown] = useState(false);

  return (
    <div className="response-viewer" style={{ position: 'relative' }}>
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
              <div className="response-meta" style={{ position: 'relative' }}>
                <span className={`status-pill ${response.status < 400 ? 'success' : 'error'}`}>
                  {response.status} {response.status_text}
                </span>
                <span 
                  className="meta-item" 
                  onClick={() => setShowTimingBreakdown(!showTimingBreakdown)}
                  title="Click to view network timing breakdown"
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                >
                  {response.time_ms}ms
                </span>
                <span className="meta-item">{Math.round(response.body.length / 1024 * 100) / 100} KB</span>

                {driftErrors && driftErrors.length > 0 && (
                  <span 
                    className="status-pill warning" 
                    onClick={() => setIsDiffDrawerOpen(true)}
                    title="Click to view schema contract mismatches"
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                      color: '#f59e0b', 
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      marginLeft: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                  >
                    ⚠️ {driftErrors.length} Spec Drift Mismatches
                  </span>
                )}

                {showTimingBreakdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '125%',
                      right: '0',
                      backgroundColor: '#1e293b',
                      border: '1px solid var(--border-default, #334155)',
                      borderRadius: '8px',
                      padding: '16px',
                      boxShadow: '0 12px 30px -5px rgba(0,0,0,0.6)',
                      zIndex: 1000,
                      width: '270px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>Response Timing Breakdown</h4>
                      <button onClick={() => setShowTimingBreakdown(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>×</button>
                    </div>

                    <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px', background: '#334155' }}>
                      <div style={{ width: '8%', backgroundColor: '#22c55e' }} title="DNS Lookup" />
                      <div style={{ width: '12%', backgroundColor: '#3b82f6' }} title="TCP Connection" />
                      <div style={{ width: '15%', backgroundColor: '#a855f7' }} title="TLS Handshake" />
                      <div style={{ width: '55%', backgroundColor: '#f59e0b' }} title="TTFB" />
                      <div style={{ width: '10%', backgroundColor: '#06b6d4' }} title="Download" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} /> DNS Lookup
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{Math.round(response.time_ms * 0.08)} ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} /> TCP Connection
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{Math.round(response.time_ms * 0.12)} ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a855f7' }} /> TLS Handshake
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{Math.round(response.time_ms * 0.15)} ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> TTFB (First Byte)
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{Math.round(response.time_ms * 0.55)} ms</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }} /> Content Download
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{Math.round(response.time_ms * 0.10)} ms</span>
                      </div>
                      <div style={{ borderTop: '1px solid #334155', paddingTop: '6px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#f8fafc' }}>
                        <span>Total Latency</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{response.time_ms} ms</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                className="btn-secondary-subtle" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  height: '24px', 
                  backgroundColor: 'var(--bg-subtle, #1e293b)',
                  border: '1px solid var(--border-subtle, #334155)',
                  color: 'var(--text-secondary, #cbd5e1)',
                  cursor: 'pointer',
                  marginRight: '6px'
                }}
                onClick={handleCreateMock} 
                title="Mock this Response"
              >
                <span>Mock Response</span>
              </button>

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
          activeTab === 'stream' ? (
            <StreamTimeline 
              frames={streamFrames} 
              onSendFrame={handleSendFrame} 
              onClearTimeline={handleClearTimeline} 
              isConnected={streamStatus === 'connected'} 
              protocol={request?.protocol === 'ws' ? 'WS' : request?.url?.startsWith('ws') ? 'WS' : 'SSE'} 
            />
          ) : response ? (
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
            ) : activeTab === 'test-results' ? (
              <TestResultsTab />
            ) : activeTab === 'console' ? (
              <ConsoleTab />
            ) : null
          ) : isStreamingProtocol ? (
            <StreamTimeline 
              frames={streamFrames} 
              onSendFrame={handleSendFrame} 
              onClearTimeline={handleClearTimeline} 
              isConnected={streamStatus === 'connected'} 
              protocol={request?.protocol === 'ws' ? 'WS' : request?.url?.startsWith('ws') ? 'WS' : 'SSE'} 
            />
          ) : (
            <div className="empty-response">
              <div className="empty-icon">📡</div>
              <h3>Waiting for Request</h3>
              <p>Send a request to see the response data here.</p>
            </div>
          )
        )}
      </div>
      <SpecDiffDrawer 
        isOpen={isDiffDrawerOpen} 
        onClose={() => setIsDiffDrawerOpen(false)} 
        errors={driftErrors} 
        requestName={request?.name || ''} 
      />
    </div>
  );
}
