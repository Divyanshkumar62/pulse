import React, { useState, useMemo, useRef } from 'react';
import { Play, Layers, Zap, AlertTriangle, CheckCircle2, Copy, ArrowRightLeft } from 'lucide-react';
import { runRegressionTest, RegressionResult } from '../../hooks/useTauri';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';

export default function RegressionMatrix() {
  const [envAName, setEnvAName] = useState('Staging');
  const [baseUrlA, setBaseUrlA] = useState('https://api-staging.example.com');
  const [envBName, setEnvBName] = useState('Production');
  const [baseUrlB, setBaseUrlB] = useState('https://api.example.com');

  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/v1/users');
  const [requestBody, setRequestBody] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RegressionResult | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const handleRunRegression = async () => {
    if (!baseUrlA.trim() || !baseUrlB.trim()) {
      toast.error('Please enter valid base URLs for both environments');
      return;
    }

    setIsRunning(true);
    try {
      const config = {
        method,
        path: path.startsWith('/') ? path : `/${path}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Pulse-Regression-Runner/1.0'
        },
        body: requestBody || undefined
      };

      const res = await runRegressionTest(config, envAName, baseUrlA, envBName, baseUrlB);
      setResult(res);
      toast.success('Regression diff matrix updated!');
    } catch (e: any) {
      toast.error('Regression test failed: ' + (e.message || e));
    } finally {
      setIsRunning(false);
    }
  };

  const formatPayload = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  // Perform highly memoized side-by-side line alignment and matching
  const diffData = useMemo(() => {
    if (!result) return { alignedA: [], alignedB: [], diffStatus: [] as ('match' | 'mismatch')[] };

    const formattedA = formatPayload(result.responseA.body).split('\n');
    const formattedB = formatPayload(result.responseB.body).split('\n');
    const length = Math.max(formattedA.length, formattedB.length);

    const alignedA: string[] = [];
    const alignedB: string[] = [];
    const diffStatus: ('match' | 'mismatch')[] = [];

    for (let i = 0; i < length; i++) {
      const lineA = formattedA[i] !== undefined ? formattedA[i] : '';
      const lineB = formattedB[i] !== undefined ? formattedB[i] : '';

      alignedA.push(lineA);
      alignedB.push(lineB);

      if (lineA.trim() === lineB.trim()) {
        diffStatus.push('match');
      } else {
        diffStatus.push('mismatch');
      }
    }

    return { alignedA, alignedB, diffStatus };
  }, [result]);

  // Set up headless virtualizer for dynamic height JSON rows
  const rowVirtualizer = useVirtualizer({
    count: diffData.diffStatus.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 20, // typical line height
    overscan: 25,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0b0f17', color: '#f8fafc', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Top Configuration & Control Bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} style={{ color: '#38bdf8' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#f8fafc' }}>Environment Regression Matrix</h2>
          </div>

          <button 
            onClick={handleRunRegression}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.7 : 1
            }}
          >
            <Play size={14} fill="currentColor" />
            <span>{isRunning ? 'Executing Concurrent Requests...' : 'Run Regression Diff'}</span>
          </button>
        </div>

        {/* Environments & Target Path Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 1fr', gap: '12px', alignItems: 'center' }}>
          {/* Env A */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Environment A</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                value={envAName} 
                onChange={e => setEnvAName(e.target.value)} 
                placeholder="Env A Name" 
                style={{ width: '80px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '4px 8px', fontSize: '11px', outline: 'none' }}
              />
              <input 
                type="text" 
                value={baseUrlA} 
                onChange={e => setBaseUrlA(e.target.value)} 
                placeholder="Base URL A" 
                style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', padding: '4px 8px', fontSize: '11px', outline: 'none', fontFamily: 'var(--font-mono, monospace)' }}
              />
            </div>
          </div>

          {/* Env B */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Environment B</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                value={envBName} 
                onChange={e => setEnvBName(e.target.value)} 
                placeholder="Env B Name" 
                style={{ width: '80px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '4px 8px', fontSize: '11px', outline: 'none' }}
              />
              <input 
                type="text" 
                value={baseUrlB} 
                onChange={e => setBaseUrlB(e.target.value)} 
                placeholder="Base URL B" 
                style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#38bdf8', padding: '4px 8px', fontSize: '11px', outline: 'none', fontFamily: 'var(--font-mono, monospace)' }}
              />
            </div>
          </div>

          {/* Method Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Method</span>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '5px 8px', fontSize: '11px', outline: 'none', fontWeight: 600 }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          {/* Target Endpoint Path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Endpoint Path</span>
            <input 
              type="text" 
              value={path} 
              onChange={e => setPath(e.target.value)} 
              placeholder="/api/v1/resource" 
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', padding: '4px 8px', fontSize: '11px', outline: 'none', fontFamily: 'var(--font-mono, monospace)' }}
            />
          </div>
        </div>
      </div>

      {/* Latency & Structural Metrics Summary Banner */}
      {result && (
        <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Status Match Badge */}
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '3px 8px', 
              borderRadius: '4px', 
              fontWeight: 600,
              backgroundColor: result.isStatusMatch ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: result.isStatusMatch ? '#22c55e' : '#ef4444',
              border: result.isStatusMatch ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {result.isStatusMatch ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {result.isStatusMatch ? 'Status Match' : 'Status Mismatch'}
            </span>

            {/* Body Match Badge */}
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '3px 8px', 
              borderRadius: '4px', 
              fontWeight: 600,
              backgroundColor: result.isBodyMatch ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: result.isBodyMatch ? '#22c55e' : '#f59e0b',
              border: result.isBodyMatch ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              {result.isBodyMatch ? <CheckCircle2 size={13} /> : <Layers size={13} />}
              {result.isBodyMatch ? 'Identical Payloads' : 'Payload Diff Detected'}
            </span>
          </div>

          {/* Latency Comparison Metric */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontWeight: 500 }}>
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span>
              {result.fasterEnv === 'Equal' 
                ? 'Both environments responded with identical latency' 
                : `${result.fasterEnv} is ${Math.abs(result.latencyDiffMs)}ms faster`
              }
            </span>
          </div>
        </div>
      )}

      {/* Main Side-by-Side Comparison Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a' }}>
        <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRight: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc' }}>{envAName}</span>
            {result && (
              <>
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: result.responseA.status < 400 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: result.responseA.status < 400 ? '#22c55e' : '#ef4444' }}>
                  {result.responseA.status} {result.responseA.statusText}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>
                  {result.responseA.timeMs}ms
                </span>
              </>
            )}
          </div>
          {result && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(result.responseA.body);
                toast.success(`Copied ${envAName} response`);
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <Copy size={13} />
            </button>
          )}
        </div>

        <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc' }}>{envBName}</span>
            {result && (
              <>
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: result.responseB.status < 400 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: result.responseB.status < 400 ? '#22c55e' : '#ef4444' }}>
                  {result.responseB.status} {result.responseB.statusText}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>
                  {result.responseB.timeMs}ms
                </span>
              </>
            )}
          </div>
          {result && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(result.responseB.body);
                toast.success(`Copied ${envBName} response`);
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <Copy size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Headless Virtualized Side-by-Side Scrolling Body */}
      <div 
        ref={parentRef} 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          backgroundColor: '#0b0f17', 
          position: 'relative' 
        }}
      >
        {!result ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
            Run regression test to compare payloads
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const isMismatch = diffData.diffStatus[virtualRow.index] === 'mismatch';
              return (
                <div
                  key={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                    lineHeight: '1.6',
                  }}
                >
                  {/* Column A line block */}
                  <div style={{ 
                    display: 'flex', 
                    width: '50%', 
                    borderRight: '1px solid #1e293b', 
                    backgroundColor: isMismatch ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: '45px', 
                      minWidth: '45px', 
                      textAlign: 'right', 
                      paddingRight: '8px', 
                      color: '#475569', 
                      userSelect: 'none', 
                      borderRight: '1px solid #1e293b', 
                      backgroundColor: '#0f172a',
                      fontSize: '10px'
                    }}>
                      {virtualRow.index + 1}
                    </div>
                    <pre style={{ 
                      margin: 0, 
                      padding: '0 8px', 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-all', 
                      color: isMismatch ? '#fca5a5' : '#38bdf8', 
                      flex: 1,
                      fontFamily: 'inherit'
                    }}>
                      {diffData.alignedA[virtualRow.index]}
                    </pre>
                  </div>

                  {/* Column B line block */}
                  <div style={{ 
                    display: 'flex', 
                    width: '50%', 
                    backgroundColor: isMismatch ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: '45px', 
                      minWidth: '45px', 
                      textAlign: 'right', 
                      paddingRight: '8px', 
                      color: '#475569', 
                      userSelect: 'none', 
                      borderRight: '1px solid #1e293b', 
                      backgroundColor: '#0f172a',
                      fontSize: '10px'
                    }}>
                      {virtualRow.index + 1}
                    </div>
                    <pre style={{ 
                      margin: 0, 
                      padding: '0 8px', 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-all', 
                      color: isMismatch ? '#86efac' : '#cbd5e1', 
                      flex: 1,
                      fontFamily: 'inherit'
                    }}>
                      {diffData.alignedB[virtualRow.index]}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
