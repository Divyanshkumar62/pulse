import { useState, useRef, useEffect } from 'react';
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
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!request) return null;

  const isWebSocket = request.url?.startsWith('ws://') || request.url?.startsWith('wss://');

  return (
    <div className="url-bar-container">
      <input 
        className="request-name-input"
        value={request.name}
        onChange={(e) => updateActiveTabRequest({ name: e.target.value })}
        placeholder="New Request"
      />
      <div className="url-bar" style={{ padding: '4px', gap: '8px' }}>
        {!isWebSocket && (
          <div className="method-select-container" ref={dropdownRef}>
            <div 
              className="method-display"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ minWidth: '100px', height: '38px', borderRadius: 'var(--radius-lg)' }}
            >
              {request.method}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.6, transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            
            {isDropdownOpen && (
              <div className="glass-dropdown-menu">
                {METHODS.map(m => (
                  <div 
                    key={m} 
                    className="glass-dropdown-item"
                    onClick={() => {
                      updateActiveTabRequest({ method: m });
                      setIsDropdownOpen(false);
                    }}
                    style={{ color: m === request.method ? 'var(--accent-primary)' : 'inherit' }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {isWebSocket && (
          <div style={{ padding: '0 16px', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', height: '38px', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-subtle)' }}>
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
          style={{ padding: '0 8px', fontSize: '14px', height: '38px' }}
        />
        
        {!isWebSocket && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button 
              className="btn-secondary"
              onClick={onCode}
              title="Generate Code Snippet"
              style={{ height: '38px', padding: '0 14px', fontSize: '12px', borderRadius: '10px' }}
            >
              &lt;/&gt; Code
            </button>

            <button 
              className="btn-secondary"
              onClick={() => toast.success('Request saved!')}
              style={{ width: '38px', height: '38px', padding: '0', borderRadius: '10px' }}
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
              style={{ height: '38px', borderRadius: '10px' }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
