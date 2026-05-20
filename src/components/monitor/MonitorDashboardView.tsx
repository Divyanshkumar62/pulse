import { useAppStore } from '../../stores/useAppStore';
import { useMonitorStore, MonitorCheck, CheckRun } from '../../stores/useMonitorStore';
import { useMemo } from 'react';
import { toast } from 'sonner';

export default function MonitorDashboard() {
  const { selectedMonitorId, setSelectedMonitorId } = useAppStore();
  const { monitors, checkRuns, isChecking, setChecking, addRun, updateMonitor, deleteMonitor } = useMonitorStore();

  const selectedCheck = useMemo(() => 
    monitors.find(m => m.id === selectedMonitorId), 
    [monitors, selectedMonitorId]
  );

  const runs = useMemo(() => 
    selectedMonitorId ? checkRuns[selectedMonitorId] || [] : [],
    [checkRuns, selectedMonitorId]
  );

  const stats = useMemo(() => {
    if (runs.length === 0) {
      return { uptime: 100, avgResponseTime: 0, lastChecked: 'Never' };
    }
    const successfulRuns = runs.filter(r => r.statusCode && r.statusCode >= 200 && r.statusCode < 300).length;
    const uptime = Math.round((successfulRuns / runs.length) * 100);
    const avgResponseTime = runs.reduce((acc, r) => acc + (r.responseTime || 0), 0) / runs.length;
    const lastChecked = runs[0]?.timestamp || 'Never';
    return { uptime, avgResponseTime: Math.round(avgResponseTime), lastChecked };
  }, [runs]);

  const handleRunCheck = async () => {
    if (!selectedCheck) return;
    setChecking(true);
    const startTime = Date.now();
    try {
      const response = await fetch(selectedCheck.url, {
        method: selectedCheck.method,
        headers: { 'Accept': 'application/json' }
      });
      const responseTime = Date.now() - startTime;
      const statusCode = response.status;
      const status = statusCode >= 200 && statusCode < 300 ? 'healthy' :
                    statusCode >= 300 && statusCode < 400 ? 'degraded' : 'failing';
      
      const newRun: CheckRun = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        statusCode,
        responseTime
      };

      updateMonitor(selectedCheck.id, {
        status,
        responseTime,
        statusCode,
        lastCheck: newRun.timestamp
      });
      addRun(selectedCheck.id, newRun);
      toast.success(`${selectedCheck.name}: ${statusCode} (${responseTime}ms)`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const newRun: CheckRun = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        statusCode: 0,
        responseTime
      };
      updateMonitor(selectedCheck.id, {
        status: 'failing',
        responseTime,
        statusCode: 0,
        lastCheck: newRun.timestamp
      });
      addRun(selectedCheck.id, newRun);
      toast.error(`${selectedCheck.name} failed to respond`);
    }
    setChecking(false);
  };

  const handleDelete = () => {
    if (selectedMonitorId) {
      deleteMonitor(selectedMonitorId);
      setSelectedMonitorId(null);
    }
  };

  if (!selectedCheck) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <p>No monitor selected. Click on a monitor in the sidebar to see details.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', gap: '24px', overflowY: 'auto', background: 'var(--bg-surface)' }}>
      {/* Header Section */}
      <div style={{ 
        background: 'rgba(22, 27, 34, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {isChecking && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.3), transparent)',
            animation: 'shimmer 1.5s infinite',
          }} />
        )}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {selectedCheck.name}
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
              <span style={{ fontWeight: 800, color: 'var(--accent-primary)', marginRight: '8px' }}>{selectedCheck.method}</span>
              {selectedCheck.url}
            </p>
          </div>
          <div style={{
            padding: '8px 16px',
            borderRadius: '24px',
            background: selectedCheck.status === 'healthy' ? 'rgba(34, 197, 94, 0.15)' :
                       selectedCheck.status === 'degraded' ? 'rgba(234, 179, 8, 0.15)' :
                       selectedCheck.status === 'failing' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128, 0.15)',
            border: `1px solid ${selectedCheck.status === 'healthy' ? 'rgba(34, 197, 94, 0.4)' :
                               selectedCheck.status === 'degraded' ? 'rgba(234, 179, 8, 0.4)' :
                               selectedCheck.status === 'failing' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(107, 114, 128, 0.4)'}`,
          }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: selectedCheck.status === 'healthy' ? '#22c55e' :
                     selectedCheck.status === 'degraded' ? '#eab308' :
                     selectedCheck.status === 'failing' ? '#ef4444' : '#6b7280',
              textTransform: 'uppercase',
            }}>
              {selectedCheck.status}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleRunCheck}
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600 }}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Run Check Now'}
          </button>
          <button 
            onClick={handleDelete}
            style={{ padding: '10px 16px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '16px' 
      }}>
        <div style={{ 
          background: 'rgba(22, 27, 34, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          transition: 'transform 0.2s',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Uptime</div>
          <div style={{ fontSize: '42px', fontWeight: 800, color: stats.uptime >= 99 ? '#22c55e' : stats.uptime >= 95 ? '#eab308' : '#ef4444' }}>
            {stats.uptime}%
          </div>
        </div>
        <div style={{ 
          background: 'rgba(22, 27, 34, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Avg Latency</div>
          <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats.avgResponseTime}<span style={{ fontSize: '18px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '4px' }}>ms</span>
          </div>
        </div>
        <div style={{ 
          background: 'rgba(22, 27, 34, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Last Healthy Check</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>
            {selectedCheck.lastCheck || 'Never'}
          </div>
        </div>
      </div>

      {/* History Table Container */}
      <div style={{ 
        flex: 1,
        background: 'rgba(22, 27, 34, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '300px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Run History</h4>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Showing last 20 runs</span>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', marginRight: '-8px', paddingRight: '8px' }}>
          {runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              No check history found. Automated checks will appear here every 5 minutes.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Time of Run</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Response Time</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>{run.timestamp}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: run.statusCode && run.statusCode >= 200 && run.statusCode < 300 ? 'rgba(34, 197, 94, 0.2)' :
                                   run.statusCode && run.statusCode >= 300 && run.statusCode < 400 ? 'rgba(234, 179, 8, 0.2)' :
                                   'rgba(239, 68, 68, 0.2)',
                        color: run.statusCode && run.statusCode >= 200 && run.statusCode < 300 ? '#22c55e' :
                               run.statusCode && run.statusCode >= 300 && run.statusCode < 400 ? '#eab308' :
                               '#ef4444',
                        border: `1px solid ${run.statusCode && run.statusCode >= 200 && run.statusCode < 300 ? 'rgba(34, 197, 94, 0.4)' :
                                           run.statusCode && run.statusCode >= 300 && run.statusCode < 400 ? 'rgba(234, 179, 8, 0.4)' :
                                           'rgba(239, 68, 68, 0.4)'}`
                      }}>
                        {run.statusCode || 'ERROR'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {run.responseTime ? `${run.responseTime}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
