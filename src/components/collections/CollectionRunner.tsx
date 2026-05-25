import React, { useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection, Environment } from '../../types';
import { useEnvStore } from '../../stores/useEnvStore';
import { Play, CheckCircle, AlertCircle, Clock, Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface RunResult {
  request_name: string;
  status: number;
  time_ms: number;
  tests: { name: string; passed: boolean; message?: string }[];
  logs: string[];
}

interface CollectionRunnerProps {
  collection: Collection;
  onClose: () => void;
}

export default function CollectionRunner({ collection, onClose }: CollectionRunnerProps) {
  const { environments, activeEnvId } = useEnvStore();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  const activeEnv = environments.find(e => e.id === activeEnvId);

  const stats = useMemo(() => {
    if (results.length === 0) return { total: 0, passed: 0, failed: 0, avgTime: 0 };
    
    const total = results.length;
    let passedTests = 0;
    let failedTests = 0;
    let totalTime = 0;

    results.forEach(r => {
      totalTime += r.time_ms;
      const allPassed = r.tests.every(t => t.passed);
      if (allPassed && r.status >= 200 && r.status < 400) passedTests++;
      else failedTests++;
    });

    return {
      total,
      passed: passedTests,
      failed: failedTests,
      avgTime: Math.round(totalTime / total)
    };
  }, [results]);

  const handleRun = async () => {
    setIsRunning(true);
    setResults([]);
    try {
      const runResults = await invoke<RunResult[]>('run_collection', { 
        collection, 
        environment: activeEnv 
      });
      setResults(runResults);
      toast.success(`Run completed: ${runResults.length} requests executed`);
    } catch (e) {
      toast.error('Collection run failed: ' + String(e));
    } finally {
      setIsRunning(false);
    }
  };

  const filteredResults = results.filter(r => {
    if (filter === 'all') return true;
    const allPassed = r.tests.every(t => t.passed) && r.status < 400;
    return filter === 'passed' ? allPassed : !allPassed;
  });

  return (
    <div className="collection-runner-overlay" style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12000
    }}>
      <div className="collection-runner-container" style={{
        width: '900px', height: '85vh', backgroundColor: 'var(--bg-deep)', borderRadius: '16px',
        border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Collection Runner</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-tertiary)' }}>{collection.name} • {collection.requests.length} Requests</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* Dashboard Stats */}
        <div style={{ padding: '24px', display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Requests</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.total}</div>
          </div>
          <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Passed</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{stats.passed}</div>
          </div>
          <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Failed</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stats.failed > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{stats.failed}</div>
          </div>
          <div style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Avg. Latency</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.avgTime}ms</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
                className={`btn-secondary ${filter === 'all' ? 'active' : ''}`} 
                onClick={() => setFilter('all')}
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', background: filter === 'all' ? 'var(--accent-subtle)' : undefined }}
            >
                All
            </button>
            <button 
                className={`btn-secondary ${filter === 'passed' ? 'active' : ''}`} 
                onClick={() => setFilter('passed')}
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', background: filter === 'passed' ? 'var(--accent-subtle)' : undefined }}
            >
                Passed
            </button>
            <button 
                className={`btn-secondary ${filter === 'failed' ? 'active' : ''}`} 
                onClick={() => setFilter('failed')}
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', background: filter === 'failed' ? 'var(--accent-subtle)' : undefined }}
            >
                Failed
            </button>
          </div>

          <button 
            onClick={handleRun} 
            disabled={isRunning}
            className="btn-primary" 
            style={{ padding: '10px 32px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
          >
            {isRunning ? <div className="spinning">⏳</div> : <Play size={16} fill="currentColor" />}
            {isRunning ? 'Executing...' : 'Run Collection'}
          </button>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }} className="custom-scrollbar-mini">
          {results.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: '12px' }}>
                <Clock size={48} opacity={0.2} />
                <p>Click "Run Collection" to begin testing {collection.requests.length} endpoints.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredResults.map((result, idx) => {
                const allPassed = result.tests.every(t => t.passed) && result.status < 400;
                return (
                  <div key={idx} style={{ 
                    padding: '16px', borderRadius: '12px', background: 'var(--bg-surface)', 
                    border: `1px solid ${allPassed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    display: 'flex', flexDirection: 'column', gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {allPassed ? <CheckCircle size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
                            <span style={{ fontWeight: 600 }}>{result.request_name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                            <span style={{ color: allPassed ? '#10b981' : '#ef4444', fontWeight: 700 }}>{result.status}</span>
                            <span style={{ color: 'var(--text-tertiary)' }}>{result.time_ms}ms</span>
                        </div>
                    </div>
                    
                    {result.tests.length > 0 && (
                        <div style={{ paddingLeft: '30px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {result.tests.map((test, tidx) => (
                                <div key={tidx} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: test.passed ? '#10b981' : '#ef4444' }} />
                                    <span style={{ color: test.passed ? 'var(--text-secondary)' : '#ef4444' }}>{test.name}</span>
                                    {!test.passed && test.message && <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>— {test.message}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
