import React, { useState, useEffect, useRef } from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { ChevronDown, ChevronUp, Terminal, X, Trash2, Download } from 'lucide-react';

interface ExecutionLogsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface LogEntry {
  timestamp: number;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  nodeId?: string;
  nodeName?: string;
  data?: any;
}

export default function ExecutionLogsPanel({ isOpen, onToggle }: ExecutionLogsPanelProps) {
  const { executionState, flowState } = useFlowStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warn': return '#eab308';
      default: return '#94a3b8';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warn': return '⚠';
      default: return '›';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const clearLogs = () => setLogs([]);

  const exportLogs = () => {
    const content = logs.map(log => 
      `[${formatTime(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '240px',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Terminal size={16} style={{ color: '#94a3b8' }} />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: 600, 
            color: 'white',
          }}>
            Console
          </span>
          <span style={{ 
            fontSize: '11px', 
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: executionState === 'running' ? 'rgba(37, 99, 235, 0.2)' : 
                        executionState === 'done' ? 'rgba(34, 197, 94, 0.2)' :
                        executionState === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)',
            color: executionState === 'running' ? '#3b82f6' : 
                executionState === 'done' ? '#22c55e' :
                executionState === 'error' ? '#ef4444' : '#94a3b8',
          }}>
            {executionState.toUpperCase()}
          </span>
          {logs.length > 0 && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {logs.length} entries
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={exportLogs}
            title="Export logs"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#64748b', 
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <Download size={14} />
          </button>
          <button 
            onClick={clearLogs}
            title="Clear logs"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#64748b', 
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={onToggle}
            title="Collapse"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#64748b', 
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Logs Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '12px 16px',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
            No logs yet. Run the flow to see execution output.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                padding: '4px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span style={{ color: '#475569', flexShrink: 0, fontSize: '11px' }}>
                {formatTime(log.timestamp)}
              </span>
              <span style={{ color: getLevelColor(log.level), flexShrink: 0, fontWeight: 600 }}>
                {getLevelIcon(log.level)}
              </span>
              {log.nodeName && (
                <span style={{ color: '#3b82f6', flexShrink: 0 }}>
                  [{log.nodeName}]
                </span>
              )}
              <span style={{ color: '#e2e8f0', wordBreak: 'break-word' }}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Flow State Preview */}
      {Object.keys(flowState).length > 0 && (
        <div style={{ 
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}>
          <span style={{ fontSize: '11px', color: '#64748b', marginRight: '12px' }}>
            FLOW STATE:
          </span>
          {Object.keys(flowState).map(key => (
            <span 
              key={key}
              style={{ 
                fontSize: '11px', 
                marginRight: '12px',
                padding: '2px 6px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderRadius: '4px',
                color: '#93c5fd',
              }}
            >
              {key}: {JSON.stringify(flowState[key]).substring(0, 50)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}