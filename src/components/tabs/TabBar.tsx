import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import '../../styles/components/tabs.css';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useTabStore();
  const { collections, addRequest } = useCollectionStore();
  const [isNamingNew, setIsNamingNew] = useState(false);
  const [newRequestName, setNewRequestName] = useState('');

  const handleNewTab = () => {
    setIsNamingNew(true);
    setNewRequestName('');
  };

  const handleConfirmNewTab = () => {
    if (!newRequestName.trim()) return;
    
    const newRequest = {
      id: crypto.randomUUID(),
      name: newRequestName.trim(),
      method: 'GET' as const,
      url: '',
      headers: [],
      body: { type: 'none' as const, content: '' },
    };
    
    const defaultCollection = collections[0];
    if (defaultCollection) {
      addRequest(defaultCollection.id, null, newRequest);
      openTab(newRequest, defaultCollection.id);
    } else {
      openTab(newRequest);
    }
    
    setIsNamingNew(false);
    setNewRequestName('');
  };

  const cancelNewTab = () => {
    setIsNamingNew(false);
    setNewRequestName('');
  };

  return (
    <div className="tab-bar-premium">
      {isNamingNew && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', gap: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            type="text"
            value={newRequestName}
            onChange={(e) => setNewRequestName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmNewTab()}
            placeholder="Request name"
            autoFocus
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleConfirmNewTab}
            style={{
              padding: '4px 10px',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Add
          </button>
          <button
            onClick={cancelNewTab}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-tertiary)',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      )}
      <div className="tabs-container">
        {tabs.map(tab => {
          const methodColor = getMethodColor(tab.request.method);
          return (
            <div 
              key={tab.id} 
              className={`tab-premium ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={`method-pill method-${tab.request.method.toLowerCase()}`}>
                {tab.request.method}
              </span>
              <span className="tab-name">{tab.request.name || 'Untitled Request'}</span>
              {tab.isDirty && (
                <span 
                  className="tab-dirty-pulse" 
                  style={{ background: methodColor }}
                />
              )}
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
          );
        })}
        
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

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'var(--method-get)',
    POST: 'var(--method-post)',
    PUT: 'var(--method-put)',
    DELETE: 'var(--method-delete)',
    PATCH: 'var(--method-patch)',
    HEAD: 'var(--method-head)',
    OPTIONS: 'var(--method-options)',
  };
  return colors[method.toUpperCase()] || 'var(--accent-primary)';
}
