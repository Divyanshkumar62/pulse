import { useTabStore } from '../../stores/useTabStore';
import GraphQLBuilder from './GraphQLBuilder';
import CustomSelect from '../ui/CustomSelect';
import CodeEditor from '../ui/CodeEditor';

const formatJson = (str: string): string => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
};

export default function BodyEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  
  const activeTab = tabs.find(t => t.id === activeTabId);
  const body = activeTab?.request.body || { type: 'none', content: '' };

  const handleTypeChange = (type: any) => {
    let updates: any = { type };
    let content = body.content;
    
    if (type === 'json' && content) {
      content = formatJson(content);
    }
    
    if (type === 'graphql') {
      if (!body.graphql) {
        updates.graphql = { query: '', variables: '{}' };
      }
      updateActiveTabRequest({ 
        method: 'POST',
        body: { ...body, ...updates, content } 
      });
    } else if (type === 'json' && content) {
      updateActiveTabRequest({ body: { ...body, ...updates, content } });
    } else {
      updateActiveTabRequest({ body: { ...body, ...updates } });
    }
  };

  const handleJsonFormat = () => {
    if (body.type === 'json' && body.content) {
      const formatted = formatJson(body.content);
      updateActiveTabRequest({ body: { ...body, content: formatted } });
    }
  };

  const handleContentChange = (val: string) => {
    updateActiveTabRequest({ body: { ...body, content: val } });
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <CustomSelect 
          value={body.type}
          onChange={handleTypeChange}
          options={[
            { value: 'none', label: 'None' },
            { value: 'raw', label: 'Raw' },
            { value: 'json', label: 'JSON' },
            { value: 'graphql', label: 'GraphQL' },
          ]}
        />
        {body.type === 'json' && (
          <button
            onClick={handleJsonFormat}
            style={{
              padding: '4px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Format JSON"
          >
            Format
          </button>
        )}
      </div>
      
      {body.type === 'graphql' ? (
        <div style={{ flex: 1, width: '100%' }}>
          <GraphQLBuilder />
        </div>
      ) : body.type !== 'none' ? (
        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
          <CodeEditor 
            value={body.content}
            onChange={handleContentChange}
            language={body.type === 'json' ? 'json' : 'javascript'}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-subtle)' }}>
            No body required for this request
        </div>
      )}
    </div>
  );
}
