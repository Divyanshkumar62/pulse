import { useEffect, useRef, useState, useMemo } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { foldGutter, codeFolding, foldKeymap } from '@codemirror/language';
import { search, highlightSelectionMatches, setSearchQuery, SearchQuery, findNext, findPrevious } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { WrapText, Search, ChevronUp, ChevronDown, X, Filter, Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

function filterJsonObject(obj: any, query: string): any {
  if (!query.trim()) return obj;
  const q = query.toLowerCase();

  if (Array.isArray(obj)) {
    const filtered = obj
      .map(item => filterJsonObject(item, q))
      .filter(item => item !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }

  if (typeof obj === 'object' && obj !== null) {
    const res: any = {};
    let hasMatch = false;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const keyMatches = key.toLowerCase().includes(q);
      if (keyMatches) {
        res[key] = val;
        hasMatch = true;
      } else {
        const filteredVal = filterJsonObject(val, q);
        if (filteredVal !== undefined) {
          res[key] = filteredVal;
          hasMatch = true;
        }
      }
    }
    return hasMatch ? res : undefined;
  }

  if (String(obj).toLowerCase().includes(q)) {
    return obj;
  }

  return undefined;
}

export default function ResponseBody({ content, contentType }: { content: string, contentType: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isLineWrapped, setIsLineWrapped] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQueryText, setSearchQueryText] = useState('');
  const [filterQueryText, setFilterQueryText] = useState('');
  const [formatMode, setFormatMode] = useState<'pretty' | 'raw' | 'minify'>('pretty');
  const [copied, setCopied] = useState(false);

  // Compute displayed content based on formatMode and filterQueryText
  const displayContent = useMemo(() => {
    if (formatMode === 'raw') {
      return content;
    }

    const isJson = contentType.includes('json');
    if (isJson) {
      try {
        let parsed = JSON.parse(content);
        if (filterQueryText.trim()) {
          const filtered = filterJsonObject(parsed, filterQueryText.trim());
          parsed = filtered !== undefined ? filtered : {};
        }
        if (formatMode === 'minify') {
          return JSON.stringify(parsed);
        }
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return content;
      }
    }

    return content;
  }, [content, contentType, formatMode, filterQueryText]);

  const matchCount = useMemo(() => {
    if (!searchQueryText.trim()) return 0;
    try {
      const escaped = searchQueryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const matches = displayContent.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [searchQueryText, displayContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const editorContainer = editorRef.current?.parentElement;
        if (editorContainer && editorContainer.contains(document.activeElement)) {
          e.preventDefault();
          setIsSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: searchQueryText, caseSensitive: false }))
      });
    }
  }, [searchQueryText]);

  useEffect(() => {
    if (!editorRef.current) return;

    let lang = json();
    if (contentType.includes('xml') || contentType.includes('html')) {
      lang = xml();
    }

    const extensions = [
      lineNumbers(),
      foldGutter(),
      codeFolding(),
      keymap.of(foldKeymap),
      search({ top: false }),
      highlightSelectionMatches(),
      lang,
      oneDark,
      EditorState.readOnly.of(true),
      EditorView.theme({
        "&": { height: "100%", fontSize: "12px", fontFamily: "var(--font-mono)", backgroundColor: "#0b0f16 !important" },
        ".cm-gutters": { backgroundColor: "#0b0f16 !important", border: "none", color: "var(--text-tertiary)" },
        ".cm-activeLineGutter": { backgroundColor: "#0b0f16" },
        ".cm-activeLine": { backgroundColor: "#0b0f16" },
        ".cm-foldGutter .cm-gutterElement": { cursor: "pointer", color: "var(--text-tertiary)" },
        ".cm-foldGutter .cm-gutterElement:hover": { color: "var(--accent-primary)" },
        ".cm-searchMatch": { backgroundColor: "rgba(234, 179, 8, 0.3) !important", outline: "1px solid rgba(234, 179, 8, 0.6)" },
        ".cm-searchMatch-selected": { backgroundColor: "rgba(249, 115, 22, 0.5) !important" }
      })
    ];

    if (isLineWrapped) {
      extensions.push(EditorView.lineWrapping);
    }

    const startState = EditorState.create({
      doc: displayContent,
      extensions
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });
    
    viewRef.current = view;

    if (searchQueryText) {
      view.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: searchQueryText, caseSensitive: false }))
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [displayContent, contentType, isLineWrapped]);

  const handleNextMatch = () => {
    if (viewRef.current) {
      findNext(viewRef.current);
    }
  };

  const handlePrevMatch = () => {
    if (viewRef.current) {
      findPrevious(viewRef.current);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isJson = contentType.includes('json');
    const ext = isJson ? 'json' : 'txt';
    const blob = new Blob([displayContent], { type: isJson ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `response-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded response file');
  };

  const isJson = contentType.includes('json');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div 
        className="response-body-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        {/* Left Section: Format Mode Switcher & Filter input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {isJson && (
            <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-subtle)', padding: '2px' }}>
              {(['pretty', 'raw', 'minify'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFormatMode(mode)}
                  style={{
                    background: formatMode === mode ? 'var(--accent-primary)' : 'transparent',
                    color: formatMode === mode ? '#FFFFFF' : 'var(--text-tertiary)',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}

          {isJson && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px 6px', width: '180px' }}>
              <Filter size={12} color="var(--text-tertiary)" />
              <input
                type="text"
                value={filterQueryText}
                onChange={(e) => setFilterQueryText(e.target.value)}
                placeholder="Filter JSON keys..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  width: '100%'
                }}
              />
              {filterQueryText && (
                <button onClick={() => setFilterQueryText('')} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0', display: 'flex' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Search, Line Wrap, Copy & Download Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isSearchOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '2px 6px' }}>
              <Search size={12} color="var(--text-tertiary)" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQueryText}
                onChange={(e) => setSearchQueryText(e.target.value)}
                placeholder="Search..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  width: '130px'
                }}
              />
              {searchQueryText && (
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', paddingRight: '4px' }}>
                  {matchCount}
                </span>
              )}
              <button onClick={handlePrevMatch} title="Previous match" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                <ChevronUp size={12} />
              </button>
              <button onClick={handleNextMatch} title="Next match" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                <ChevronDown size={12} />
              </button>
              <button onClick={() => { setIsSearchOpen(false); setSearchQueryText(''); }} title="Close search" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              title="Search in response (Ctrl+F)"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-tertiary)',
                borderRadius: '4px',
                padding: '3px 6px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Search size={13} />
              <span>Search</span>
            </button>
          )}

          <button
            onClick={() => setIsLineWrapped(!isLineWrapped)}
            title={isLineWrapped ? "Disable line wrapping" : "Enable line wrapping"}
            style={{
              background: isLineWrapped ? 'var(--accent-subtle)' : 'transparent',
              border: '1px solid ' + (isLineWrapped ? 'var(--accent-primary)' : 'var(--border-subtle)'),
              color: isLineWrapped ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <WrapText size={13} />
            <span>Wrap</span>
          </button>

          <button
            onClick={handleCopy}
            title="Copy response body"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: copied ? '#22c55e' : 'var(--text-tertiary)',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            title="Download response file"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Download size={13} />
            <span>Save</span>
          </button>
        </div>
      </div>
      <div ref={editorRef} style={{ flex: 1, overflow: 'hidden', borderRadius: '0 0 4px 4px', backgroundColor: '#0b0f16' }} />
    </div>
  );
}
