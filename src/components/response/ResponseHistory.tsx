import { useHistoryStore } from '../../stores/useHistoryStore';
import { useTabStore } from '../../stores/useTabStore';
import EmptyState from '../ui/EmptyState';
import { Clock, Trash2 } from 'lucide-react';

export default function ResponseHistory() {
  const { history, clearHistory, deleteEntry } = useHistoryStore();
  const { tabs, activeTabId, setTabResponse } = useTabStore();
  
  const tabData = tabs.find(t => t.id === activeTabId);

  if (!tabData || !tabData.request) {
    return (
        <EmptyState 
            icon={Clock}
            title="No request selected"
            description="Select a request from the sidebar to view its execution history."
            compact
        />
    );
  }

  const requestId = tabData.request.id;
  const filteredHistory = history
    .filter(entry => entry.requestId === requestId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Request History</h3>
        {filteredHistory.length > 0 && (
          <button 
            onClick={clearHistory}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }} className="custom-scrollbar-mini">
        {filteredHistory.length === 0 ? (
          <EmptyState 
            icon={Clock}
            title="No history"
            description="Send this request to see its history logs here."
            compact
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredHistory.map((entry) => (
              <div 
                key={entry.id}
                onClick={() => setTabResponse(tabData.id, entry.response)}
                style={{ 
                  padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s'
                }}
                className="history-item-hover"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ 
                    fontSize: '10px', fontWeight: 700, 
                    color: entry.status < 400 ? '#10b981' : '#ef4444' 
                  }}>
                    {entry.status} {entry.response.status_text}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{entry.time_ms}ms</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
