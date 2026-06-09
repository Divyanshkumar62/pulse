import { useState } from 'react';
import CodeEditor from '../ui/CodeEditor';
import { useTabStore } from '../../stores/useTabStore';
import { fetchIntrospectionSchema } from '../../services/graphql';
import { toast } from 'sonner';

export default function GraphQLBuilder() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const request = activeTab.request;
  const body = request.body;
  const gql = body?.graphql || { query: '', variables: '{}' };

  const updateGql = (updates: any) => {
    updateActiveTabRequest({
      body: {
        ...body,
        type: 'graphql',
        content: updates.query || gql.query, // Content for legacy runners
        graphql: { ...gql, ...updates }
      }
    });
  };

  const handleIntrospect = async () => {
    if (!request.url) {
      toast.error('Enter a URL first');
      return;
    }
    setIsRefreshing(true);
    try {
      await fetchIntrospectionSchema(request.url, request.headers || []);
      toast.success('Schema updated');
    } catch (e) {
      toast.error('Failed to fetch schema');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="graphql-builder" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>QUERY</span>
          <button onClick={handleIntrospect} disabled={isRefreshing} style={{ fontSize: '10px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>
            {isRefreshing ? 'Refreshing...' : 'Refresh Schema'}
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CodeEditor
            value={gql.query}
            onChange={(query) => updateGql({ query })}
          />
        </div>
      </div>

      <div style={{ height: '150px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px' }}>VARIABLES</div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CodeEditor
            value={gql.variables}
            onChange={(variables) => updateGql({ variables })}
            language="json"
          />
        </div>
      </div>
    </div>
  );
}
