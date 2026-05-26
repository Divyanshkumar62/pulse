import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { Play, FileText, Plus, X } from 'lucide-react';
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
    if (!newRequestName.trim()) {
        setIsNamingNew(false);
        return;
    }
    
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
    <div className="tab-bar-premium" style={{ display: 'flex', alignItems: 'center' }}>
      {/* Fixed New Tab Button at the start */}
      <button 
        className="add-tab-btn-fixed" 
        onClick={handleNewTab} 
        title="New Tab (Ctrl+T)"
        style={{ 
            flexShrink: 0, 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>

      <div style={{ flex: 1, display: 'flex', overflowX: 'hidden', height: '100%' }}>
        {isNamingNew && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--bg-deep)', borderRight: '1px solid var(--border-subtle)', minWidth: '200px' }}>
            <input
                type="text"
                value={newRequestName}
                onChange={(e) => setNewRequestName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmNewTab();
                    if (e.key === 'Escape') cancelNewTab();
                }}
                onBlur={handleConfirmNewTab}
                placeholder="Request name..."
                autoFocus
                style={{
                width: '100%',
                padding: '6px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
                }}
            />
            </div>
        )}

        <div className="tabs-container" style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
            {tabs.map(tab => {
            if (tab.type === 'request' && tab.request) {
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
                    style={{ padding: '6px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                    }}
                    >
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>
                );
            } else if (tab.type === 'runner') {
                return (
                    <div 
                    key={tab.id} 
                    className={`tab-premium ${activeTabId === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    >
                    <Play size={12} style={{ marginRight: '6px', color: '#10b981' }} />
                    <span className="tab-name">Runner: {tab.collection?.name}</span>
                    <button 
                        className="tab-close-btn" 
                        style={{ padding: '6px' }}
                        onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                        }}
                    >
                        <X size={16} strokeWidth={3} />
                    </button>
                    </div>
                );
            } else if (tab.type === 'docs') {
                return (
                <div 
                    key={tab.id} 
                    className={`tab-premium ${activeTabId === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    <FileText size={12} style={{ marginRight: '6px', color: 'var(--accent-primary)' }} />
                    <span className="tab-name">Docs: {tab.collection?.name}</span>
                    <button 
                    className="tab-close-btn" 
                    style={{ padding: '6px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                    }}
                    >
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>
                );
            }
            return null;
            })}
        </div>
      </div>
      
      <style>{`
        .add-tab-btn-fixed:hover {
            background: var(--bg-surface) !important;
            color: var(--accent-primary) !important;
        }
        .tab-close-btn {
            opacity: 0.6;
            transition: all 0.2s;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .tab-close-btn:hover {
            opacity: 1;
            background: rgba(255,255,255,0.1);
            color: #ef4444;
        }
      `}</style>
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
