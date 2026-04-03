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
      body: { type: 'none', content: '' },
      variables: []
    });
  };

  return (
    <div className="tab-bar-premium">
      <div className="tabs-container">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`tab-premium ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={`method-pill method-${tab.request.method.toLowerCase()}`}>
              {tab.request.method}
            </span>
            <span className="tab-name">{tab.request.name || 'Untitled Request'}</span>
            {tab.isDirty && <span className="tab-dirty-pulse" />}
            <button 
              className="tab-close-btn" 
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
        
        <button className="add-tab-btn" onClick={handleNewTab} title="New Tab (Ctrl+T)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
