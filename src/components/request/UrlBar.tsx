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
          <div style={{ padding: '0 16px', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-subtle)' }}>
            WS
          </div>
        )}

        <input
          type="text"
          className="url-input"
          placeholder="https://api.example.com/v1"
          value={request.url}
          onChange={(e) => updateActiveTabRequest({ url: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isWebSocket) onSend();
          }}
        />
        
        {!isWebSocket && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button 
              className="btn-secondary"
              onClick={onCode}
              title="Generate Code Snippet"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              &lt;/&gt; Code
            </button>

            <button 
              className="btn-secondary"
              onClick={() => toast.success('Request saved!')}
              style={{ width: '40px', padding: '0' }}
              title="Save Request (Ctrl+S)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
            </button>

            <button 
              className="send-btn" 
              onClick={onSend}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
