import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';
import { CurlParser } from '../../services/curl';
import { Request } from '../../types';
import { 
  Search, Globe, Layout, Command, Settings as SettingsIcon, 
  Plus, User, Terminal, GitCommit, ArrowRightLeft,
  FileText, Activity, Server, Zap, Shield
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  action: () => void;
  icon: React.ReactNode;
  shortcut?: string;
}

export default function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setSettingsOpen, sidebarTab, setSidebarTab, toggleSidebar } = useAppStore();
  const [mode, setMode] = useState<'search' | 'import-curl'>('search');
  const [search, setSearch] = useState('');
  const [curlInput, setCurlInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { openTab } = useTabStore();
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [filtered, setFiltered] = useState<PaletteItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isCommandPaletteOpen && mode === 'import-curl' && textAreaRef.current) {
        textAreaRef.current.focus();
    }
  }, [isCommandPaletteOpen, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen && inputRef.current && mode === 'search') {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen, mode]);

  useEffect(() => {
    if (mode === 'search' && isCommandPaletteOpen) {
        const selectedEl = itemRefs.current.get(selectedIndex);
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
  }, [selectedIndex, mode, isCommandPaletteOpen]);

  useEffect(() => {
    const newItems: PaletteItem[] = [];
    
    // 1. GLOBAL ACTIONS
    newItems.push({
      id: 'cmd-new-tab', title: 'New Request', subtitle: 'Open a blank request tab', 
      category: 'Actions', icon: <Plus size={16} />, shortcut: 'Ctrl+T',
      action: () => openTab({ id: crypto.randomUUID(), name: 'New Request', method: 'GET', url: '', headers: [], body: { type: 'none', content: '' } })
    });

    newItems.push({
      id: 'cmd-import-curl', title: 'Import from cURL', subtitle: 'Create request from raw curl string', 
      category: 'Actions', icon: <Terminal size={16} />,
      action: () => setMode('import-curl')
    });

    newItems.push({
      id: 'cmd-settings', title: 'Settings', subtitle: 'Manage Pulse configuration', 
      category: 'Actions', icon: <SettingsIcon size={16} />, shortcut: 'Ctrl+,',
      action: () => setSettingsOpen(true)
    });

    // 2. NAVIGATION
    newItems.push({
      id: 'nav-collections', title: 'Switch to Collections', category: 'Navigation', 
      icon: <Layout size={16} />, action: () => setSidebarTab('collections')
    });
    newItems.push({
      id: 'nav-env', title: 'Switch to Environments', category: 'Navigation', 
      icon: <Globe size={16} />, action: () => setSidebarTab('environments')
    });
    newItems.push({
      id: 'nav-teams', title: 'Switch to Team activity', category: 'Navigation', 
      icon: <User size={16} />, action: () => setSidebarTab('teams')
    });
    newItems.push({
      id: 'nav-history', title: 'Switch to History', category: 'Navigation', 
      icon: <Activity size={16} />, action: () => setSidebarTab('history')
    });
    newItems.push({
      id: 'nav-mocks', title: 'Switch to Mock Servers', category: 'Navigation', 
      icon: <Server size={16} />, action: () => setSidebarTab('mock-servers')
    });

    // 3. WORKSPACES
    workspaces.forEach(w => {
      newItems.push({
        id: `ws-${w.id}`, title: `Switch to Workspace: ${w.name}`, 
        subtitle: w.id === activeWorkspaceId ? 'Currently Active' : 'Change workspace',
        category: 'Workspaces', icon: <ArrowRightLeft size={16} />,
        action: () => setActiveWorkspace(w.id)
      });

      // 4. CROSS-WORKSPACE REQUESTS
      w.collections.forEach(c => {
        const addRequests = (requests: Request[], path: string) => {
          requests.forEach(r => {
            newItems.push({
              id: `req-${w.id}-${r.id}`, title: r.name,
              subtitle: `${w.name} • ${path} • ${r.method} ${r.url}`,
              category: 'Requests', icon: <Zap size={16} color="var(--accent-primary)" />,
              action: () => {
                if (w.id !== activeWorkspaceId) setActiveWorkspace(w.id);
                openTab(r, c.id);
              }
            });
          });
        };

        addRequests(c.requests, c.name);
        
        const processFolders = (folders: any[], currentPath: string) => {
          folders.forEach(f => {
            const newPath = `${currentPath} / ${f.name}`;
            addRequests(f.requests || [], newPath);
            if (f.folders) processFolders(f.folders, newPath);
          });
        };
        if (c.folders) processFolders(c.folders, c.name);
      });
    });

    setItems(newItems);
  }, [workspaces, activeWorkspaceId, openTab, setSettingsOpen, setSidebarTab, setActiveWorkspace]);

  useEffect(() => {
    if (mode !== 'search') return;
    
    const triggerSearch = async () => {
        if (!search.trim()) {
            setFiltered(items);
            return;
        }

        setIsSearching(true);
        try {
            // Map items to simple searchable format for Rust
            const searchItems = items.map(item => ({
                id: item.id,
                title: item.title,
                subtitle: item.subtitle,
                category: item.category
            }));

            const results = await invoke<any[]>('fuzzy_search', { 
                query: search, 
                items: searchItems 
            });

            // Map back to original items to preserve actions and icons
            const matchedItems = results.map(res => 
                items.find(i => i.id === res.item.id)
            ).filter(Boolean) as PaletteItem[];

            setFiltered(matchedItems);
        } catch (e) {
            console.error('Fuzzy search failed:', e);
            // Fallback to simple filtering if Rust fails
            const simpleFiltered = items.filter(item => 
                item.title.toLowerCase().includes(search.toLowerCase()) || 
                (item.subtitle && item.subtitle.toLowerCase().includes(search.toLowerCase()))
            );
            setFiltered(simpleFiltered);
        } finally {
            setIsSearching(false);
        }
    };

    const timer = setTimeout(triggerSearch, 50);
    return () => clearTimeout(timer);
  }, [search, items, mode]);

  const handleImportCurl = () => {
    if (!curlInput.trim()) return;
    try {
      const parsedRequest = CurlParser.parse(curlInput);
      openTab({
        ...parsedRequest,
        id: crypto.randomUUID()
      });
      setCommandPaletteOpen(false);
      setCurlInput('');
      setMode('search');
    } catch (error: any) {
      console.error('Failed to parse cURL:', error);
      alert('Failed to parse cURL: ' + error.message);
    }
  };

  if (!isCommandPaletteOpen) return null;

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
        if (filtered[selectedIndex].id !== 'cmd-import-curl') {
            setCommandPaletteOpen(false);
        }
      }
    }
  };

  // Group by category
  const categories = Array.from(new Set(filtered.map(i => i.category)));

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', paddingTop: '12vh', zIndex: 11000, backdropFilter: 'blur(8px)' }} onClick={() => setCommandPaletteOpen(false)}>
      <div 
        style={{ 
          width: '640px', backgroundColor: 'var(--bg-elevated)', borderRadius: '14px', overflow: 'hidden', 
          display: 'flex', flexDirection: 'column', maxHeight: '70vh', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', 
          border: '1px solid var(--border-default)', animation: 'palette-in 0.2s ease-out' 
        }}
        onClick={e => e.stopPropagation()}
      >
        {mode === 'search' ? (
            <>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                    <Search size={18} color="var(--text-tertiary)" />
                    <input 
                        ref={inputRef}
                        type="text"
                        placeholder="Search anything or run commands..."
                        style={{ flex: 1, padding: '20px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', fontWeight: 500 }}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <kbd style={{ padding: '2px 6px', background: 'var(--bg-deep)', borderRadius: '4px', fontSize: '10px', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>ESC</kbd>
                    </div>
                </div>

                <div ref={scrollContainerRef} className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, padding: '12px 0' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <div style={{ marginBottom: '12px', opacity: 0.5 }}><Search size={32} style={{ margin: '0 auto' }} /></div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>No results for "{search}"</div>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Try searching for a different keyword</div>
                        </div>
                    ) : (
                        categories.map(category => (
                            <div key={category}>
                                <div style={{ padding: '8px 20px', fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>{category}</div>
                                {filtered.filter(i => i.category === category).map((item) => {
                                    const globalIdx = filtered.indexOf(item);
                                    const isActive = globalIdx === selectedIndex;
                                    return (
                                        <div 
                                            key={item.id}
                                            ref={el => { if (el) itemRefs.current.set(globalIdx, el); else itemRefs.current.delete(globalIdx); }}
                                            onClick={() => { item.action(); if(item.id !== 'cmd-import-curl') setCommandPaletteOpen(false); }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 20px', cursor: 'pointer',
                                                backgroundColor: isActive ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                                                transition: 'all 0.1s'
                                            }}
                                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                                        >
                                            <div style={{ 
                                                width: '32px', height: '32px', borderRadius: '8px', background: isActive ? 'var(--accent-primary)' : 'var(--bg-deep)', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'white' : 'var(--text-tertiary)',
                                                transition: 'all 0.2s', border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`
                                            }}>
                                                {item.icon}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                                                {item.subtitle && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</span>}
                                            </div>
                                            {item.shortcut && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, background: 'var(--bg-deep)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>{item.shortcut}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={20} color="var(--accent-primary)" />
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Import from cURL</h2>
                    </div>
                    <button onClick={() => setMode('search')} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>BACK</button>
                </div>
                <textarea 
                    ref={textAreaRef}
                    placeholder="Paste your cURL command here (e.g. curl -X GET https://api.example.com)..."
                    style={{ 
                        width: '100%', height: '180px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', 
                        borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', padding: '16px', 
                        fontFamily: 'var(--font-mono)', outline: 'none', resize: 'none', lineHeight: 1.6
                    }}
                    value={curlInput}
                    onChange={e => setCurlInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Tip: Press <strong>Ctrl + Enter</strong> to quickly import</span>
                    <button 
                        onClick={handleImportCurl}
                        style={{ 
                            padding: '12px 24px', backgroundColor: 'var(--accent-primary)', border: 'none', 
                            borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                        }}
                    >
                        Import Request
                    </button>
                </div>
            </div>
        )}
      </div>
      <style>{`
        @keyframes palette-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
