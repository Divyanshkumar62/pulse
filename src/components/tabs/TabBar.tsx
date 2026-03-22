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
          +
        </button>
      </div>
    </div>
  );
}
