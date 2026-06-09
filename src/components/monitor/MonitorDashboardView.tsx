import { useAppStore } from '../../stores/useAppStore';
import { useMonitorStore, MonitorCheck, CheckRun } from '../../stores/useMonitorStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { sendRequest } from '../../hooks/useTauri';
import { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Clock, Activity, AlertTriangle, CheckCircle, Trash2, Play } from 'lucide-react';

export default function MonitorDashboard() {
  const { selectedMonitorId, setSelectedMonitorId } = useAppStore();
  const { monitors, checkRuns, isChecking, setChecking, addRun, updateMonitor, deleteMonitor } = useMonitorStore();
  const { settings } = useSettingsStore();
  
  const [isIntervalOpen, setIsIntervalOpen] = useState(false);
  const intervalRef = useRef<HTMLDivElement>(null);

  const INTERVAL_OPTIONS = [
    { label: '1 min', value: 1 },
    { label: '5 mins', value: 5 },
    { label: '15 mins', value: 15 },
    { label: '30 mins', value: 30 },
    { label: '1 hour', value: 60 },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (intervalRef.current && !intervalRef.current.contains(e.target as Node)) {
        setIsIntervalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      return { uptime: 0, avgResponseTime: 0, lastChecked: 'Never' };
    }
    const successfulRuns = runs.filter(r => r.statusCode && r.statusCode >= 200 && r.statusCode < 300).length;
    const uptime = Math.round((successfulRuns / runs.length) * 100);
    const avgResponseTime = runs.reduce((acc, r) => acc + (r.responseTime || 0), 0) / runs.length;
    const lastChecked = runs[0]?.timestamp || 'Never';
    return { uptime, avgResponseTime: Math.round(avgResponseTime), lastChecked };
  }, [runs]);

  const handleRunCheck = async () => {
    if (!selectedCheck || !settings) return;
    setChecking(true);
    const startTime = Date.now();
    try {
      const response = await sendRequest(
        selectedCheck.method, 
        selectedCheck.url, 
        {}, 
        { type: 'none', content: '' }, 
        settings
      );
      
      const responseTime = Date.now() - startTime;
      const statusCode = response.status;
      const status = statusCode >= 200 && statusCode < 300 ? 'healthy' :
                    statusCode >= 300 && statusCode < 400 ? 'degraded' : 'failing';
      
      const newRun: CheckRun = {
        id: Math.random().toString(36).substring(2, 9),
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
      
      const msg = `${selectedCheck.name}: ${statusCode} (${responseTime}ms)`;
      if (status === 'healthy') {
        toast.success(msg);
      } else if (status === 'degraded') {
        toast.warning(msg);
      } else {
        toast.error(msg);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const newRun: CheckRun = {
        id: Math.random().toString(36).substring(2, 9),
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
        overflow: 'visible',
        zIndex: 10
      }}>
        {isChecking && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.3), transparent)',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '16px',
            pointerEvents: 'none'
          }} />
        )}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .interval-dropdown-glass {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            z-index: 500;
            min-width: 120px;
            background: rgba(22, 27, 34, 0.72);
            backdrop-filter: blur(40px) saturate(180%);
            -webkit-backdrop-filter: blur(40px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 4px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            animation: dropdown-fade 150ms ease-out;
            display: flex;
            flex-direction: column;
          }
          @keyframes dropdown-fade {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .interval-item {
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            background: none;
            border: none;
            width: 100%;
          }
          .interval-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
          }
          .interval-item.active {
            background: rgba(37, 99, 235, 0.2);
            color: var(--accent-primary);
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
            }}>
              {selectedCheck.status}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => updateMonitor(selectedCheck.id, { isActive: !selectedCheck.isActive })}
            style={{ 
              padding: '10px 16px', 
              borderRadius: '6px', 
              background: selectedCheck.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
              border: `1px solid ${selectedCheck.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: selectedCheck.isActive ? '#10b981' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedCheck.isActive ? '#10b981' : 'var(--text-tertiary)' }} />
            {selectedCheck.isActive ? 'Polling Active' : 'Polling Paused'}
          </button>

          <div style={{ position: 'relative' }} ref={intervalRef}>
            <button 
              onClick={() => setIsIntervalOpen(!isIntervalOpen)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'rgba(255, 255, 255, 0.05)', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span>Interval: {INTERVAL_OPTIONS.find(opt => opt.value === (selectedCheck.interval || 5))?.label}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', marginLeft: '4px', transform: isIntervalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isIntervalOpen && (
              <div className="interval-dropdown-glass">
                {INTERVAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`interval-item ${selectedCheck.interval === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      updateMonitor(selectedCheck.id, { interval: opt.value });
                      setIsIntervalOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleRunCheck}
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, marginLeft: 'auto' }}
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
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', letterSpacing: '0.05em', fontWeight: 600 }}>Uptime</div>
          <div style={{ fontSize: '42px', fontWeight: 800, color: runs.length > 0 ? (stats.uptime >= 99 ? '#22c55e' : stats.uptime >= 95 ? '#eab308' : '#ef4444') : 'var(--text-tertiary)' }}>
            {runs.length > 0 ? `${stats.uptime}%` : '---'}
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
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', letterSpacing: '0.05em', fontWeight: 600 }}>Avg Latency</div>
          <div style={{ fontSize: '42px', fontWeight: 800, color: runs.length > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {runs.length > 0 ? (
              <>
                {stats.avgResponseTime}<span style={{ fontSize: '18px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '4px' }}>ms</span>
              </>
            ) : '---'}
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
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', letterSpacing: '0.05em', fontWeight: 600 }}>Last Healthy Check</div>
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
              No check history found. Automated checks will appear here every {selectedCheck.interval || 5} minutes.
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

