import { useState, useEffect, useRef } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { HttpMethod } from '../../types';
import { toast } from 'sonner';
import { FileText, Server } from 'lucide-react';
import { useMockStore } from '../../stores/useMockStore';
import MethodSelector, { DEFAULT_METHOD_COLORS } from '../ui/MethodSelector';

interface UrlBarProps {
  onSend: () => void;
  onCode: () => void;
  onSave: () => void;
  isLoading: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'WS'];

export default function UrlBar({ onSend, onCode, onSave, isLoading }: UrlBarProps) {
  const { updateActiveTabRequest, tabs, activeTabId } = useTabStore();
  const { createMockFromRequest } = useMockStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const request = activeTab?.request;

  if (!request) return null;

  const isStreaming = 
    request.method === 'WS' || 
    request.url?.startsWith('ws://') || 
    request.url?.startsWith('wss://') || 
    request.url?.startsWith('sse://') ||
    request.headers?.some(h => h.key.toLowerCase() === 'accept' && h.value.includes('text/event-stream'));

  const streamStatus = activeTab?.streamStatus || 'disconnected';

  return (
    <div className="url-bar-container">
      <div className="url-bar-glass">
        <MethodSelector
          method={request.method}
          methods={METHODS}
          onChange={(m) => updateActiveTabRequest({ method: m })}
          disabled={isLoading}
        />

        <div className="url-input-wrapper">
          <input
            type="text"
            className="url-input-field"
            placeholder="Enter request URL or paste cURL"
            value={request.url}
            onChange={(e) => updateActiveTabRequest({ url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isStreaming) onSend();
            }}
          />
        </div>
        
        <div className="url-bar-actions">
          {!isStreaming ? (
            <>
              <button 
                className={`icon-action-btn ${request.showDocs ? 'active' : ''}`}
                onClick={() => updateActiveTabRequest({ showDocs: !request.showDocs })}
                title="Toggle Live Documentation"
                style={{ color: request.showDocs ? 'var(--accent-primary)' : 'inherit' }}
              >
                <FileText size={16} strokeWidth={2.5} />
              </button>

              <button 
                className="icon-action-btn"
                onClick={onCode}
                title="Generate Code Snippet"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </button>

              <button 
                className="icon-action-btn"
                onClick={onSave}
                title="Save Request (Ctrl+S)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
              </button>

              <button 
                className="icon-action-btn"
                onClick={() => {
                  createMockFromRequest(request);
                  toast.success('Mock created from request!');
                }}
                title="Create Mock from Request"
              >
                <Server size={16} strokeWidth={2.5} />
              </button>

              <button 
                className="send-btn-premium" 
                onClick={onSend}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loader-mini"></div>
                ) : (
                  <>
                    Send
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </>
                )}
              </button>
            </>
          ) : (
            <button 
              className="send-btn-premium" 
              onClick={async () => {
                if (streamStatus === 'connected' || streamStatus === 'connecting') {
                  try {
                    const { disconnectStream } = await import('../../hooks/useTauri');
                    await disconnectStream(activeTab.id);
                    useTabStore.getState().setStreamStatus(activeTab.id, 'disconnected');
                    toast.info('Disconnected from stream');
                  } catch (e: any) {
                    toast.error('Failed to disconnect: ' + (e.message || e));
                  }
                } else {
                  try {
                    const { connectStream } = await import('../../hooks/useTauri');
                    const protocol = request.protocol === 'ws' || request.url.startsWith('ws') ? 'WS' : 'SSE';
                    const headersMap: Record<string, string> = {};
                    request.headers?.forEach(h => {
                      if (h.key && h.value) headersMap[h.key] = h.value;
                    });
                    useTabStore.getState().setStreamStatus(activeTab.id, 'connecting');
                    await connectStream(activeTab.id, protocol, request.url, headersMap);
                    toast.success(`Connecting to ${protocol} stream...`);
                  } catch (e: any) {
                    useTabStore.getState().setStreamStatus(activeTab.id, 'error');
                    toast.error('Failed to connect: ' + (e.message || e));
                  }
                }
              }}
              style={{
                backgroundColor: (streamStatus === 'connected' || streamStatus === 'connecting') 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'rgba(34, 197, 94, 0.2)',
                color: (streamStatus === 'connected' || streamStatus === 'connecting')
                  ? '#ef4444'
                  : '#22c55e',
                border: (streamStatus === 'connected' || streamStatus === 'connecting')
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid rgba(34, 197, 94, 0.4)'
              }}
            >
              {(streamStatus === 'connected' || streamStatus === 'connecting') ? 'Disconnect' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
