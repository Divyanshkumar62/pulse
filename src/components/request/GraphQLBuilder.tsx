import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { graphql } from 'cm6-graphql';
import { buildClientSchema, GraphQLSchema } from 'graphql';
import { useTabStore } from '../../stores/useTabStore';
import { fetchIntrospectionSchema } from '../../services/graphql';
import { toast } from 'sonner';

export default function GraphQLBuilder() {
  const queryRef = useRef<HTMLDivElement>(null);
  const varsRef = useRef<HTMLDivElement>(null);
  const queryViewRef = useRef<EditorView | null>(null);
  const varsViewRef = useRef<EditorView | null>(null);
  const [isFetchingSchema, setIsFetchingSchema] = useState(false);
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  const body = activeTab?.request.body;
  const gqlConfig = body?.graphql || { query: '', variables: '{}' };

  // Sync internal changes to the store
  const syncToStore = (query: string, variables: string) => {
    try {
      const parsedVars = JSON.parse(variables || '{}');
      const serializedContent = JSON.stringify({
        query,
        variables: parsedVars,
      }, null, 2);

      updateActiveTabRequest({
        body: {
          ...body!,
          content: serializedContent,
          graphql: { query, variables }
        }
      });
    } catch (e) {
      // If variables are invalid JSON, still sync the raw strings but don't update content yet
      updateActiveTabRequest({
        body: {
          ...body!,
          graphql: { query, variables }
        }
      });
    }
  };

  const handleFetchSchema = async () => {
    if (!activeTab?.request.url) {
        toast.error('Please enter a URL first');
        return;
    }

    setIsFetchingSchema(true);
    try {
        const introspectionResult = await fetchIntrospectionSchema(activeTab.request.url, activeTab.request.headers);
        const builtSchema = buildClientSchema(introspectionResult);
        setSchema(builtSchema);
        toast.success('Schema fetched successfully. Autocomplete enabled.');
    } catch (error: any) {
        console.error(error);
        toast.error(`Schema fetch failed: ${error.message}`);
    } finally {
        setIsFetchingSchema(false);
    }
  };

  // Initialize Query Editor
  useEffect(() => {
    if (!queryRef.current) return;

    const state = EditorState.create({
      doc: gqlConfig.query,
      extensions: [
        lineNumbers(),
        keymap.of(defaultKeymap),
        schema ? graphql(schema) : graphql(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newQuery = update.state.doc.toString();
            syncToStore(newQuery, gqlConfig.variables);
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px", fontFamily: "var(--font-mono)" },
        })
      ]
    });

    const view = new EditorView({ state, parent: queryRef.current });
    queryViewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, schema]); 

  // Initialize Variables Editor
  useEffect(() => {
    if (!varsRef.current) return;

    const state = EditorState.create({
      doc: gqlConfig.variables,
      extensions: [
        lineNumbers(),
        keymap.of(defaultKeymap),
        json(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newVars = update.state.doc.toString();
            syncToStore(gqlConfig.query, newVars);
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px", fontFamily: "var(--font-mono)" },
        })
      ]
    });

    const view = new EditorView({ state, parent: varsRef.current });
    varsViewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
        <div className="text-label" style={{ marginBottom: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>Query</div>
        <div ref={queryRef} style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: '4px', overflow: 'hidden' }} />
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="text-label" style={{ marginBottom: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>Variables (JSON)</div>
        <div ref={varsRef} style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: '4px', overflow: 'hidden' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="add-btn" 
          disabled={isFetchingSchema}
          style={{ fontSize: '11px', padding: '4px 12px' }}
          onClick={handleFetchSchema}
        >
          {isFetchingSchema ? 'Fetching...' : 'Fetch Schema (Introspection)'}
        </button>
      </div>
    </div>
  );
}
