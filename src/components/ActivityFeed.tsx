import { useHistoryStore } from '../stores/useHistoryStore';

export default function ActivityFeed() {
  const { history } = useHistoryStore();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return '#22c55e';
    if (status >= 300 && status < 400) return '#3b82f6';
    if (status >= 400 && status < 500) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="activity-feed" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <h3 style={{ 
        color: 'var(--accent-primary)', 
        fontSize: '13px', 
        fontWeight: 700,
        margin: 0
      }}>Request History</h3>
      
      {history.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          No requests yet. Send a request to see it here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {history.map(entry => (
            <div key={entry.id} style={{ 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'all var(--transition-base)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.borderColor = 'var(--accent-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
            >
              <span 
                style={{ 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  padding: '3px 6px', 
                  borderRadius: '4px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase'
                }}
              >
                {entry.method}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-primary)', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  marginBottom: '2px'
                }}>
                  {entry.url}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600,
                    color: getStatusColor(entry.status)
                  }}>
                    {entry.status}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {entry.time_ms}ms
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {formatTime(entry.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
