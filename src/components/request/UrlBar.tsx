import { useTabStore } from '../../stores/useTabStore';
import { HttpMethod } from '../../types';

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
      <div className="url-bar">
        {!isWebSocket && (
          <select 
            className="method-select"
            value={request.method}
            onChange={(e) => updateActiveTabRequest({ method: e.target.value as HttpMethod })}
          >
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        
        {isWebSocket && (
          <div style={{ padding: '0 12px', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', borderRight: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
            WS
          </div>
        )}

        <input
          type="text"
          className="url-input"
          placeholder="wss://echo.websocket.org"
          value={request.url}
          onChange={(e) => updateActiveTabRequest({ url: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isWebSocket) onSend();
          }}
        />
        
        {!isWebSocket && (
          <button 
            onClick={onCode}
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0 12px', fontSize: '12px', cursor: 'pointer', marginRight: '8px' }}
            title="Generate Code Snippet"
          >
            &lt;/&gt; Code
          </button>
        )}

        {!isWebSocket && (
          <button 
            className="send-btn" 
            onClick={onSend}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        )}
      </div>
    </div>
  );
}
