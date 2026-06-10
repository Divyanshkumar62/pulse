import React, { useState, useEffect, useRef } from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { ChevronDown, ChevronUp, Terminal, Trash2, Download } from 'lucide-react';

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
  const { executionState, executionLogs, clearLogs } = useFlowStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return '#4ade80';
      case 'error': return '#f87171';
      case 'warn': return '#fbbf24';
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

  const exportLogs = () => {
    const content = executionLogs.map(log => 
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

  if (!isOpen) {
    return (
      <div 
        onClick={onToggle}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40px',
          backgroundColor: '#090a0f',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          cursor: 'pointer',
          zIndex: 50,
          transition: 'all 0.2s ease',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Terminal size={14} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'white', fontFamily: 'monospace' }}>Console</span>
          {executionState !== 'idle' && (
            <span style={{ 
              fontSize: '10px', 
              padding: '1px 6px',
              borderRadius: '3px',
              backgroundColor: executionState === 'running' ? 'rgba(37, 99, 235, 0.2)' : 
                          executionState === 'done' ? 'rgba(34, 197, 94, 0.2)' :
                          executionState === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)',
              color: executionState === 'running' ? '#3b82f6' : 
                  executionState === 'done' ? '#4ade80' :
                  executionState === 'error' ? '#f87171' : '#94a3b8',
              fontFamily: 'monospace'
            }}>
              {executionState.toUpperCase()}
            </span>
          )}
          {executionLogs.length > 0 && (
            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>({executionLogs.length} entries)</span>
          )}
        </div>
        <ChevronUp size={16} style={{ color: '#94a3b8' }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '240px',
      backgroundColor: '#090a0f',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Terminal size={15} style={{ color: '#94a3b8' }} />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: 700, 
            color: 'white',
            fontFamily: 'monospace'
          }}>
            CONSOLE
          </span>
          <span style={{ 
            fontSize: '10px', 
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: executionState === 'running' ? 'rgba(37, 99, 235, 0.2)' : 
                        executionState === 'done' ? 'rgba(34, 197, 94, 0.2)' :
                        executionState === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)',
            color: executionState === 'running' ? '#3b82f6' : 
                executionState === 'done' ? '#4ade80' :
                executionState === 'error' ? '#f87171' : '#94a3b8',
            fontWeight: 700,
            fontFamily: 'monospace'
          }}>
            {executionState.toUpperCase()}
          </span>
          {executionLogs.length > 0 && (
            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
              {executionLogs.length} entries
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={exportLogs}
            title="Export logs"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#64748b', 
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
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
              display: 'flex',
              alignItems: 'center'
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
              color: '#94a3b8', 
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
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
        fontFamily: 'Fira Code, Consolas, Courier New, monospace',
        fontSize: '12px',
        lineHeight: '1.5',
      }}>
        {executionLogs.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '32px 0' }}>
            No logs yet. Run the flow to see execution output.
          </div>
        ) : (
          executionLogs.map((log, idx) => (
            <div 
              key={log.id || idx} 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                padding: '4px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                color: log.level === 'error' ? '#f87171' : log.level === 'success' ? '#4ade80' : '#94a3b8'
              }}
            >
              <span style={{ color: '#334155', flexShrink: 0, fontSize: '11px', userSelect: 'none' }}>
                {formatTime(log.timestamp)}
              </span>
              <span style={{ color: getLevelColor(log.level), flexShrink: 0, fontWeight: 700, userSelect: 'none' }}>
                {`[${log.level}]`}
              </span>
              <span style={{ color: log.level === 'info' ? '#e2e8f0' : getLevelColor(log.level), wordBreak: 'break-word' }}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}