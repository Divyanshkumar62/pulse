import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, Send, Search, Trash2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import type { StreamFrame } from '../../types';

interface StreamTimelineProps {
  frames: StreamFrame[];
  onSendFrame?: (payload: string) => void;
  onClearTimeline?: () => void;
  isConnected: boolean;
  protocol: string;
}

export default function StreamTimeline({
  frames,
  onSendFrame,
  onClearTimeline,
  isConnected,
  protocol
}: StreamTimelineProps) {
  const [filterText, setFilterText] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [expandedFrameId, setExpandedFrameId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new frames arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [frames.length]);

  const filteredFrames = frames.filter(f => 
    !filterText || 
    f.payloadData.toLowerCase().includes(filterText.toLowerCase()) || 
    f.protocol.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSend = () => {
    if (!inputMessage.trim() || !onSendFrame) return;
    onSendFrame(inputMessage);
    setInputMessage('');
  };

  const handleCopyPayload = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatPayload = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0b0f17', color: '#f1f5f9', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155' }}>
          <Search size={14} style={{ color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Filter frames by payload content..." 
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#f8fafc', fontSize: '12px', width: '100%', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '4px', 
            fontSize: '11px', 
            fontWeight: 600,
            padding: '2px 8px', 
            borderRadius: '4px',
            textTransform: 'uppercase',
            backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isConnected ? '#22c55e' : '#ef4444',
            border: isConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            ● {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>

          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>
            {filteredFrames.length} {filteredFrames.length === 1 ? 'frame' : 'frames'}
          </span>
          {onClearTimeline && (
            <button 
              onClick={onClearTimeline}
              title="Clear timeline log"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Frame List Container */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredFrames.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>No stream frames logged</span>
            <span style={{ fontSize: '11px' }}>Connect or send data to see real-time streaming activity</span>
          </div>
        ) : (
          filteredFrames.map(frame => {
            const isExpanded = expandedFrameId === frame.id;
            const isIncoming = frame.direction === 'IN';
            const badgeBg = isIncoming ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)';
            const badgeColor = isIncoming ? '#22c55e' : '#3b82f6';
            const badgeBorder = isIncoming ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';

            return (
              <div 
                key={frame.id}
                onClick={() => setExpandedFrameId(isExpanded ? null : frame.id)}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  border: isExpanded ? `1px solid ${badgeColor}` : '1px solid #334155',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {/* Header Summary Row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '10px', fontSize: '12px' }}>
                  {isExpanded ? <ChevronDown size={14} style={{ color: '#94a3b8' }} /> : <ChevronRight size={14} style={{ color: '#94a3b8' }} />}
                  
                  {/* Direction Badge */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: badgeBg, color: badgeColor, border: badgeBorder, padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                    {isIncoming ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                    {frame.direction}
                  </span>

                  {/* Protocol Badge */}
                  <span style={{ backgroundColor: '#0f172a', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>
                    {frame.protocol}
                  </span>

                  {/* Single Line Preview */}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
                    {frame.payloadData}
                  </span>

                  {/* Timestamp & Size */}
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>
                    {new Date(frame.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                    {frame.sizeBytes} B
                  </span>
                </div>

                {/* Expanded Payload Viewer */}
                {isExpanded && (
                  <div style={{ padding: '10px 12px', borderTop: '1px solid #334155', backgroundColor: '#0f172a', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Payload Data</span>
                      <button 
                        onClick={(e) => handleCopyPayload(frame.id, frame.payloadData, e)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                      >
                        {copiedId === frame.id ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
                        <span>{copiedId === frame.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre style={{ margin: 0, padding: '10px', backgroundColor: '#0b0f17', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: '#38bdf8', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {formatPayload(frame.payloadData)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Frame Sender Input Bar (for WS/gRPC) */}
      {protocol.toUpperCase() !== 'SSE' && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid #1e293b', backgroundColor: '#0f172a', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder={isConnected ? "Send message frame..." : "Connect stream to send frames"} 
            disabled={!isConnected}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            style={{ 
              flex: 1, 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155', 
              color: isConnected ? '#f8fafc' : '#64748b', 
              borderRadius: '6px', 
              padding: '8px 12px', 
              fontSize: '12px', 
              outline: 'none',
              cursor: isConnected ? 'text' : 'not-allowed'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!isConnected || !inputMessage.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isConnected && inputMessage.trim() ? '#3b82f6' : '#334155',
              color: isConnected && inputMessage.trim() ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: isConnected && inputMessage.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        </div>
      )}
    </div>
  );
}
