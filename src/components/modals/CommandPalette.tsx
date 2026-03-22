import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';
import { CurlParser } from '../../services/curl';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'search' | 'import-curl'>('search');
  const [search, setSearch] = useState('');
  const [curlInput, setCurlInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { openTab } = useTabStore();
  const { setSidebarTab, setSettingsOpen } = useAppStore();
  const [items, setItems] = useState<Array<{ id: string; title: string; subtitle?: string; action: () => void; icon: string }>>([]);

  useEffect(() => {
    if (isOpen && mode === 'import-curl' && textAreaRef.current) {
        textAreaRef.current.focus();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMode('search');
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current && mode === 'search') {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const newItems: typeof items = [];
    
    // App Commands
    newItems.push({
      id: 'cmd-new-tab', title: 'New Request Tab', subtitle: 'Ctrl+T', icon: '📝', action: () => {
        openTab({ id: crypto.randomUUID(), name: 'New Request', method: 'GET', url: '', headers: [], body: { type: 'none', content: '' } });
      }
    });

    newItems.push({
        id: 'cmd-import-curl', title: 'Import from cURL', subtitle: 'Paste a cURL command', icon: '⚡', action: () => {
          setMode('import-curl');
        }
    });

    newItems.push({
      id: 'cmd-settings', title: 'Open Settings', icon: '⚙️', action: () => setSettingsOpen(true)
    });

    // Workspace Collections
    if (activeWorkspace) {
      activeWorkspace.collections.forEach(c => {
        c.requests.forEach(r => {
          newItems.push({
            id: `req-${r.id}`,
            title: r.name,
            subtitle: `${r.method} ${r.url}`,
            icon: '⚡',
            action: () => openTab(r)
          });
        });
        c.folders.forEach(f => {
          f.requests.forEach(r => {
            newItems.push({
              id: `req-${f.id}-${r.id}`,
              title: r.name,
              subtitle: `${c.name} / ${f.name} / ${r.method} ${r.url}`,
              icon: '⚡',
              action: () => openTab(r)
            });
          });
        });
      });
    }
    setItems(newItems);
  }, [workspaces, activeWorkspaceId, openTab, setSettingsOpen]);

  if (!isOpen) return null;

  const handleImportCurl = () => {
    if (!curlInput.trim()) return;
    try {
      const request = CurlParser.parse(curlInput);
      openTab(request);
      setIsOpen(false);
      setCurlInput('');
      setMode('search');
    } catch (e) {
      console.error('Failed to parse cURL', e);
    }
  };

  // Filter
  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    (item.subtitle && item.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'import-curl') {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleImportCurl();
        }
        return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        // Don't close if switching to import mode
        if (filtered[selectedIndex].id !== 'cmd-import-curl') {
            setIsOpen(false);
        }
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', paddingTop: '10vh', zIndex: 9999 }} onClick={() => setIsOpen(false)}>
      <div 
        style={{ width: '600px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '60vh', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}
      >
        {mode === 'search' ? (
            <>
                <input 
                    ref={inputRef}
                    type="text"
                    placeholder="Search requests, actions... (↑↓ to navigate, Enter to select)"
                    style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                    onKeyDown={handleKeyDown}
                />
                <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No results found</div>
                    ) : (
                        filtered.map((item, idx) => (
                        <div 
                            key={item.id}
                            onClick={() => { item.action(); if(item.id !== 'cmd-import-curl') setIsOpen(false); }}
                            style={{ 
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer',
                            backgroundColor: idx === selectedIndex ? 'var(--bg-overlay)' : 'transparent',
                            borderLeft: `3px solid ${idx === selectedIndex ? 'var(--accent-primary)' : 'transparent'}`
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                        >
                            <div style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{item.icon}</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</span>
                            {item.subtitle && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.subtitle}</span>}
                            </div>
                        </div>
                        ))
                    )}
                </div>
            </>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Import from cURL</span>
                    <button onClick={() => setMode('search')} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '12px' }}>Back (Esc)</button>
                </div>
                <textarea 
                    ref={textAreaRef}
                    placeholder="Paste your curl command here..."
                    style={{ 
                        width: '100%', height: '150px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', 
                        borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px', padding: '12px', 
                        fontFamily: 'var(--font-mono)', outline: 'none', resize: 'none' 
                    }}
                    value={curlInput}
                    onChange={e => setCurlInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Press Ctrl + Enter to import</span>
                    <button 
                        onClick={handleImportCurl}
                        style={{ 
                            padding: '8px 16px', backgroundColor: 'var(--accent-primary)', border: 'none', 
                            borderRadius: '4px', color: 'white', fontWeight: 500, cursor: 'pointer' 
                        }}
                    >
                        Import Request
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
