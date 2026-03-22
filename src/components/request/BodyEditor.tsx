import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTabStore } from '../../stores/useTabStore';
import GraphQLBuilder from './GraphQLBuilder';

export default function BodyEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  
  const activeTab = tabs.find(t => t.id === activeTabId);
  const body = activeTab?.request.body || { type: 'none', content: '' };

  const handleTypeChange = (type: any) => {
    let updates: any = { type };
    if (type === 'graphql') {
      if (!body.graphql) {
        updates.graphql = { query: '', variables: '{}' };
      }
      // GraphQL is typically POST
      updateActiveTabRequest({ 
        method: 'POST',
        body: { ...body, ...updates } 
      });
    } else {
      updateActiveTabRequest({ body: { ...body, ...updates } });
    }
  };

  useEffect(() => {
    if (!editorRef.current || body.type === 'none' || body.type === 'graphql') return;

    const startState = EditorState.create({
      doc: body.content,
      extensions: [
        lineNumbers(),
        keymap.of(defaultKeymap),
        json(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            updateActiveTabRequest({ 
                body: { ...body, content: update.state.doc.toString() } 
            });
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px", fontFamily: "var(--font-mono)" },
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });
    
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body.type, activeTabId]);

  useEffect(() => {
    if (viewRef.current && body.type !== 'graphql') {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== body.content) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: body.content }
        });
      }
    }
  }, [body.content, body.type]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
        <select 
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
          value={body.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <option value="none">None</option>
          <option value="raw">Raw</option>
          <option value="json">JSON</option>
          <option value="graphql">GraphQL</option>
        </select>
      </div>
      
      {body.type === 'graphql' ? (
        <div style={{ flex: 1 }}>
          <GraphQLBuilder />
        </div>
      ) : body.type !== 'none' ? (
        <div ref={editorRef} style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: '4px', overflow: 'hidden' }} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', background: 'var(--bg-deep)' }}>
            No body required for this request
        </div>
      )}
    </div>
  );
}
