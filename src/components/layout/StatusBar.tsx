import { useTabStore } from '../../stores/useTabStore';
import '../../styles/components/status-bar.css';

export default function StatusBar() {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const response = activeTab?.response;
  
  return (
    <footer className="status-bar-premium">
      <div className="status-left">
        <div className="status-indicator">
          <span className="dot pulse"></span>
          Pulse IDE Ready
        </div>
        {activeTab && (
          <div className="status-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Last synced: Just now
          </div>
        )}
      </div>

      <div className="status-right">
        {response && (
          <div className="status-response-summary">
            <span className="summary-pill">HTTP</span>
            <span className="summary-status">{response.status} {response.status_text}</span>
            <span className="summary-item">{response.time_ms}ms</span>
          </div>
        )}
        
        <div className="status-actions">
          <button className="status-btn" title="Global Variables">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </button>
          <button className="status-btn" title="System Status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
