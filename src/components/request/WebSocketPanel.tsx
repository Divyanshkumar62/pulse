import { useState, useEffect, useRef } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { wsManager } from '../../services/websocket';
import { WebSocketMessage } from '../../types';

export default function WebSocketPanel() {
  const { tabs, activeTabId, setWsStatus, clearWsMessages } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = activeTab?.wsMessages || [];
  const status = activeTab?.wsStatus || 'none';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeTab) return null;

  const handleConnect = () => {
    if (activeTab.request.url) {
      wsManager.connect(activeTab.id, activeTab.request.url);
    }
  };

  const handleDisconnect = () => {
    wsManager.disconnect(activeTab.id);
  };

  const handleSend = () => {
    if (messageContent.trim()) {
      wsManager.send(activeTab.id, messageContent);
      setMessageContent('');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'var(--accent-primary)';
      case 'connecting': return 'var(--text-warning)';
      case 'error': return 'var(--text-error)';
      case 'disconnected': return 'var(--text-tertiary)';
      default: return 'var(--text-tertiary)';
    }
  };

  return (
    <div className="websocket-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Connection Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(), boxShadow: status === 'connected' ? '0 0 8px var(--accent-primary)' : 'none' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{status}</span>
        </div>
        
        <div style={{ flex: 1 }} />
        
        {status === 'connected' || status === 'connecting' ? (
          <button className="delete-btn" style={{ padding: '4px 16px', fontSize: '11px' }} onClick={handleDisconnect}>Disconnect</button>
        ) : (
          <button className="add-btn" style={{ padding: '4px 16px', fontSize: '11px' }} onClick={handleConnect}>Connect</button>
        )}
        <button className="secondary-btn" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => clearWsMessages(activeTab.id)}>Clear Logs</button>
      </div>

      {/* Message Stream */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        {messages.length === 0 && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            Waiting for messages...
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '8px', borderLeft: `2px solid ${msg.type === 'send' ? 'var(--accent-primary)' : msg.type === 'receive' ? '#10b981' : 'var(--border-subtle)'}`, paddingLeft: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '2px', opacity: 0.6, fontSize: '10px' }}>
              <span style={{ color: msg.type === 'send' ? 'var(--accent-primary)' : msg.type === 'receive' ? '#10b981' : 'var(--text-secondary)' }}>
                {msg.type.toUpperCase()}
              </span>
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style={{ color: msg.type === 'error' ? 'var(--text-error)' : 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)', padding: '12px', fontSize: '13px', minHeight: '80px', outline: 'none', resize: 'vertical' }}
          placeholder="Type a message to send..."
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
          }}
        />
        <button 
          className="add-btn" 
          disabled={status !== 'connected' || !messageContent.trim()}
          style={{ padding: '10px 20px', height: 'fit-content' }}
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
