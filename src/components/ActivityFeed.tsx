import { useHistoryStore } from '../stores/useHistoryStore';
import { useTabStore } from '../stores/useTabStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { useState, useMemo } from 'react';
import { Search, Filter, X, Calendar, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from './ui/ConfirmModal';

export default function ActivityFeed() {
  const { history, clearHistory } = useHistoryStore();
  const { openTab } = useTabStore();
  const { collections } = useCollectionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return '#22c55e';
    if (status >= 300 && status < 400) return '#3b82f6';
    if (status >= 400 && status < 500) return '#f59e0b';
    return '#ef4444';
  };

  // Helper to find a request name by its ID in the collections
  const findRequestName = (requestId: string | undefined, savedName: string | undefined) => {
    if (!requestId) return savedName;
    
    // Check if the saved name is just a URL. If so, we try to find a better name in collections.
    const isUrl = savedName && (savedName.startsWith('http://') || savedName.startsWith('https://'));
    
    if (savedName && !isUrl) return savedName;

    // Search collections for this request ID
    for (const col of collections) {
      const found = col.requests.find(r => r.id === requestId);
      if (found) return found.name;
      
      const findInFolders = (folders: any[]): any => {
        for (const f of folders) {
          const req = f.requests.find((r: any) => r.id === requestId);
          if (req) return req;
          if (f.folders) {
            const nested = findInFolders(f.folders);
            if (nested) return nested;
          }
        }
      };
      const inFolder = findInFolders(col.folders);
      if (inFolder) return inFolder.name;
    }

    return savedName;
  };

  const filteredHistory = useMemo(() => {
    return history.filter(entry => {
      const name = findRequestName(entry.requestId, entry.requestName) || '';
      const matchesSearch = entry.url.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           entry.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMethod = methodFilter ? entry.method === methodFilter : true;
      return matchesSearch && matchesMethod;
    });
  }, [history, searchQuery, methodFilter, collections]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, typeof history> = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(today - 86400000).getTime();

    filteredHistory.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
      
      let label = 'Older';
      if (entryDay === today) label = 'Today';
      else if (entryDay === yesterday) label = 'Yesterday';
      else {
        label = entryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(entry);
    });

    return groups;
  }, [filteredHistory]);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  const handleRestore = (entry: any) => {
    const name = findRequestName(entry.requestId, entry.requestName);
    const restoredRequest = {
        ...entry.request,
        id: entry.requestId || entry.id,
        name: name || `Restored: ${new URL(entry.url).pathname}`,
        url: entry.url,
        method: entry.method,
        headers: entry.request.headers || [],
        body: entry.request.body || { type: 'none', content: '' },
    };
    
    openTab(restoredRequest as any);
    toast.success('Request restored to builder');
  };

  return (
    <div className="activity-feed" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>History</h3>
        <button 
            onClick={() => setShowClearConfirm(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            title="Clear History"
        >
            <Trash2 size={14} />
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
                type="text" 
                placeholder="Search history..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                    width: '100%', 
                    padding: '8px 10px 8px 32px', 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '8px', 
                    fontSize: '12px', 
                    color: 'var(--text-primary)',
                    outline: 'none'
                }}
            />
            {searchQuery && (
                <button 
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                >
                    <X size={12} />
                </button>
            )}
        </div>
        
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }} className="custom-scrollbar-mini">
            <button 
                onClick={() => setMethodFilter(null)}
                style={{ 
                    padding: '4px 10px', 
                    borderRadius: '6px', 
                    fontSize: '11px', 
                    whiteSpace: 'nowrap',
                    background: methodFilter === null ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                    color: methodFilter === null ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                }}
            >
                All
            </button>
            {methods.map(m => (
                <button 
                    key={m}
                    onClick={() => setMethodFilter(m === methodFilter ? null : m)}
                    style={{ 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        whiteSpace: 'nowrap',
                        background: methodFilter === m ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                        color: methodFilter === m ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer'
                    }}
                >
                    {m}
                </button>
            ))}
        </div>
      </div>
      
      <div 
        style={{ flex: 1, overflowY: 'auto' }} 
        className="custom-scrollbar-mini"
      >
        {Object.keys(groupedHistory).length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                {history.length === 0 ? 'No requests yet' : 'No matches found'}
            </div>
        ) : (
            Object.entries(groupedHistory).map(([label, entries]) => (
                <div key={label} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '0 4px' }}>
                        <Calendar size={12} color="var(--text-tertiary)" />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{label.toUpperCase()}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {entries.map(entry => {
                            const name = findRequestName(entry.requestId, entry.requestName);
                            // Check if the name looks like a URL. If it does, we prefer showing just the path or URL once.
                            const nameIsUrl = name && (name.startsWith('http://') || name.startsWith('https://'));
                            const displayTitle = (name && !nameIsUrl) ? name : entry.url;
                            const displaySub = (name && !nameIsUrl) ? entry.url : '';

                            return (
                                <div 
                                    key={entry.id} 
                                    onClick={() => handleRestore(entry)}
                                    style={{ 
                                        display: 'flex', 
                                        gap: '12px', 
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        background: 'var(--bg-surface)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-subtle)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    className="history-item-hover"
                                >
                                    <span 
                                        style={{ 
                                            fontSize: '9px', 
                                            fontWeight: 800, 
                                            padding: '2px 5px', 
                                            borderRadius: '4px',
                                            background: 'rgba(255,255,255,0.05)',
                                            color: 'var(--text-secondary)',
                                            width: '42px',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {entry.method}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: 'var(--text-primary)', 
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis',
                                            fontWeight: (name && !nameIsUrl) ? 600 : 400
                                        }}>
                                            {displayTitle}
                                        </div>
                                        {displaySub && (
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.7 }}>
                                                {displaySub}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 600, color: getStatusColor(entry.status) }}>
                                                {entry.status}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                {entry.time_ms}ms
                                            </span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', opacity: 0.7 }}>
                                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))
        )}
      </div>

      <ConfirmModal 
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => clearHistory()}
        title="Clear Request History"
        message="Are you sure you want to delete all previous requests? This action cannot be undone."
        confirmLabel="Clear All"
        isDanger={true}
      />

      <style>{`
        .custom-scrollbar-mini::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar-mini::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-mini::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar-mini::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .history-item-hover:hover {
            border-color: var(--accent-subtle) !important;
            background: rgba(255,255,255,0.05) !important;
        }
      `}</style>
    </div>
  );
}
