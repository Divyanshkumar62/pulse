import { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useMonitorStore, MonitorCheck } from '../../stores/useMonitorStore';
import EmptyState from '../ui/EmptyState';
import { Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function MonitorSidebar() {
  const { selectedMonitorId, setSelectedMonitorId } = useAppStore();
  const { monitors, addMonitor } = useMonitorStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newCheck, setNewCheck] = useState<Omit<MonitorCheck, 'id' | 'status' | 'responseTime' | 'statusCode' | 'lastCheck' | 'interval' | 'isActive'>>({
    name: '',
    url: '',
    method: 'GET'
  });

  const handleAdd = () => {
    if (!newCheck.name || !newCheck.url) {
      toast.error('Name and URL are required');
      return;
    }
    addMonitor({ ...newCheck, interval: 5, isActive: true } as any);
    setIsAdding(false);
    setNewCheck({ name: '', url: '', method: 'GET' });
    toast.success('Monitor created');
  };

  if (isAdding) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setIsAdding(false)} className="btn-icon">←</button>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>New Monitor</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>NAME</label>
            <input 
              className="text-input"
              style={{ width: '100%' }}
              value={newCheck.name}
              onChange={e => setNewCheck({ ...newCheck, name: e.target.value })}
              placeholder="API Health Check"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>URL</label>
            <input 
              className="text-input"
              style={{ width: '100%' }}
              value={newCheck.url}
              onChange={e => setNewCheck({ ...newCheck, url: e.target.value })}
              placeholder="https://api.example.com/health"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>METHOD</label>
            <select 
              className="text-input"
              style={{ width: '100%' }}
              value={newCheck.method}
              onChange={e => setNewCheck({ ...newCheck, method: e.target.value as any })}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
        
        <button onClick={handleAdd} className="btn-primary" style={{ marginTop: 'auto', width: '100%' }}>Create Monitor</button>
      </div>
    );
  }

  const healthyCount = monitors.filter(m => m.status === 'healthy').length;
  const failingCount = monitors.filter(m => m.status === 'failing').length;

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Monitoring</h2>
        <button onClick={() => setIsAdding(true)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '8px' }}>
          + New
        </button>
      </div>

      {monitors.length > 0 && (
        <div style={{ 
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
          background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{healthyCount}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Healthy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: failingCount > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{failingCount}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Failing</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {monitors.length === 0 ? (
          <EmptyState 
            icon={Activity}
            title="No monitors"
            description="Automatic health checks help you ensure your production APIs are always up and running."
            actionLabel="New Monitor"
            onAction={() => setIsAdding(true)}
            compact
          />
        ) : (
          monitors.map(m => (
            <div 
              key={m.id}
              className={`monitor-card ${selectedMonitorId === m.id ? 'active' : ''}`}
              style={{
                padding: '12px',
                background: selectedMonitorId === m.id ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-surface)',
                border: `1px solid ${selectedMonitorId === m.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedMonitorId(m.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</span>
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%', 
                  background: m.status === 'healthy' ? 'var(--status-success)' : 
                             m.status === 'degraded' ? 'var(--status-warning)' : 
                             m.status === 'failing' ? 'var(--status-error)' : 'var(--text-tertiary)'
                }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                {m.url}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  {m.method}
                </span>
                {m.responseTime && (
                  <span style={{ fontSize: '11px' }}>{m.responseTime}ms</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
