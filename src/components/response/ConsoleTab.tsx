import { useTabStore } from '../../stores/useTabStore';

export default function ConsoleTab() {
  const { activeTabId, tabs } = useTabStore();
  
  const tabData = tabs.find(t => t.id === activeTabId);
  const consoleLogs = tabData?.consoleLogs || [];

  if (consoleLogs.length === 0) {
    return (
      <div className="empty-console">
        <div className="empty-icon">⌨️</div>
        <p>Console is empty.</p>
        <span className="hint-text">Use console.log() in your scripts to see output here.</span>
      </div>
    );
  }

  return (
    <div className="console-container">
      <div className="console-header">
        <span className="console-title">Execution Logs</span>
        <span className="log-count">{consoleLogs.length} entries</span>
      </div>

      <div className="console-output">
        {consoleLogs.map((log, index) => (
          <div key={index} className={`log-entry ${log.type}`}>
            <span className="log-timestamp">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
            </span>
            <span className={`log-badge ${log.type}`}>{log.type.toUpperCase()}</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>

      <style>{`
        .console-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #0f1115;
          color: #e5e7eb;
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);
        }

        .console-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: #1a1d23;
          border-bottom: 1px solid #2d3139;
        }

        .console-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9ca3af;
          font-weight: 600;
        }

        .log-count {
          font-size: 10px;
          color: #6b7280;
        }

        .console-output {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .log-entry {
          display: flex;
          gap: 12px;
          padding: 4px 16px;
          font-size: 12px;
          line-height: 1.5;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          white-space: pre-wrap;
          word-break: break-all;
        }

        .log-entry:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .log-timestamp {
          color: #4b5563;
          flex-shrink: 0;
          user-select: none;
        }

        .log-badge {
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 700;
          flex-shrink: 0;
          height: fit-content;
          margin-top: 2px;
          user-select: none;
        }

        .log-badge.log { background: #374151; color: #d1d5db; }
        .log-badge.info { background: #2563eb; color: #ffffff; }
        .log-badge.warn { background: #d97706; color: #ffffff; }
        .log-badge.error { background: #dc2626; color: #ffffff; }

        .log-message {
          color: #d1d5db;
        }

        .log-entry.error .log-message { color: #fca5a5; }
        .log-entry.warn .log-message { color: #fde68a; }
        .log-entry.info .log-message { color: #93c5fd; }

        .empty-console {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #4b5563;
          gap: 12px;
          background: #0f1115;
        }

        .empty-icon {
          font-size: 32px;
          opacity: 0.3;
        }

        .hint-text {
          font-size: 12px;
          font-style: italic;
          color: #374151;
        }
      `}</style>
    </div>
  );
}
