import { useTabStore } from '../../stores/useTabStore';
import { HttpMethod } from '../../types';
import { toast } from 'sonner';

interface UrlBarProps {
  onSend: () => void;
  onCode: () => void;
  isLoading: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function UrlBar({ onSend, onCode, isLoading }: UrlBarProps) {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const request = activeTab?.request;

  if (!request) return null;

  const isWebSocket = request.url?.startsWith('ws://') || request.url?.startsWith('wss://');

  return (
    <div className="url-bar-container">
      <div className="url-bar-glass">
        {!isWebSocket && (
          <div className="method-selector">
            <select 
              className="method-select-premium"
              value={request.method}
              onChange={(e) => updateActiveTabRequest({ method: e.target.value as HttpMethod })}
            >
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="method-chevron">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        )}
        
        {isWebSocket && (
          <div className="ws-indicator">
            <span className="ws-dot"></span>
            WS
          </div>
        )}

        <div className="url-input-wrapper">
          <input
            type="text"
            className="url-input-field"
            placeholder="Enter request URL or paste cURL"
            value={request.url}
            onChange={(e) => updateActiveTabRequest({ url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isWebSocket) onSend();
            }}
          />
        </div>
        
        <div className="url-bar-actions">
          {!isWebSocket && (
            <>
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
                onClick={() => toast.success('Request saved!')}
                title="Save Request (Ctrl+S)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
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
                    SEND
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
