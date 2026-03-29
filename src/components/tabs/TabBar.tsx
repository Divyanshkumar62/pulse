import { useTabStore } from '../../stores/useTabStore';
import '../../styles/components/tabs.css';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useTabStore();

  const handleNewTab = () => {
    openTab({
      id: crypto.randomUUID(),
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: [],
      body: { type: 'none', content: '' }
    });
  };

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <div 
          key={tab.id} 
          className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className={`method-badge method-${tab.request.method.toLowerCase()}`}>
            {tab.request.method}
          </span>
          <span className="tab-title">{tab.request.name || 'Untitled Request'}</span>
          {tab.isDirty && <span className="tab-dirty-dot" />}
          <button 
            className="tab-close" 
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
      <div className="tab-actions">
        <button className="new-tab-btn" onClick={handleNewTab} title="New Tab (Ctrl+T)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
