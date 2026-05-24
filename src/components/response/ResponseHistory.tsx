import React from 'react';
import { useHistoryStore } from '../../stores/useHistoryStore';
import { useTabStore } from '../../stores/useTabStore';
import { Clock, ArrowRight, CornerDownRight } from 'lucide-react';

export default function ResponseHistory() {
  const { history } = useHistoryStore();
  const { activeTabId, tabs, setTabResponse } = useTabStore();
  
  const tabData = tabs.find(t => t.id === activeTabId);
  const requestId = tabData?.request.id;

  const requestHistory = history
    .filter(entry => entry.requestId === requestId)
    .slice(0, 5);

  if (requestHistory.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', gap: '12px' }}>
        <Clock size={32} opacity={0.5} />
        <p style={{ fontSize: '13px' }}>No previous responses for this request</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.05em' }}>RECENT RESPONSES</h3>
      
      {requestHistory.map((entry) => (
        <div 
          key={entry.id}
          onClick={() => setTabResponse(activeTabId!, entry.response)}
          style={{ 
            padding: '12px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          className="history-item-hover"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: entry.response.status < 400 ? '#10b981' : '#ef4444',
                background: entry.response.status < 400 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {entry.response.status}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{entry.response.time_ms}ms</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <CornerDownRight size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.url}</span>
          </div>
        </div>
      ))}

      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', textAlign: 'center' }}>
        Click a past response to restore it to the viewer
      </p>
    </div>
  );
}
