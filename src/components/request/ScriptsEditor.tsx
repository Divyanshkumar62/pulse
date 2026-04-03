import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTabStore } from '../../stores/useTabStore';

export default function ScriptsEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const script = activeTab?.request.preRequestScript || '';

  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: script,
      extensions: [
        lineNumbers(),
        keymap.of(defaultKeymap),
        javascript(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            updateActiveTabRequest({ preRequestScript: update.state.doc.toString() });
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px", fontFamily: "var(--font-mono)" },
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current
    });
    
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // Sync external changes
  useEffect(() => {
    if (viewRef.current) {
        const currentDoc = viewRef.current.state.doc.toString();
        if (currentDoc !== script) {
            viewRef.current.dispatch({
                changes: { from: 0, to: currentDoc.length, insert: script }
            });
        }
    }
  }, [script]);

  return (
    <div className="scripts-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
        PRE-REQUEST SCRIPT
      </div>
      <div style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ height: '100%' }} />
      </div>
      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
        Learn more about the <a href="#" style={{ color: 'var(--accent-primary)' }}>Pulse Scripting API</a>.
      </div>
    </div>
  );
}
