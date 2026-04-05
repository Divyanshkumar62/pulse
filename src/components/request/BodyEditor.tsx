import { useTabStore } from '../../stores/useTabStore';
import GraphQLBuilder from './GraphQLBuilder';
import CustomSelect from '../ui/CustomSelect';
import CodeEditor from '../ui/CodeEditor';

export default function BodyEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  
  const activeTab = tabs.find(t => t.id === activeTabId);
  const body = activeTab?.request.body || { type: 'none', content: '' };

  const handleTypeChange = (type: any) => {
    let updates: any = { type };
    if (type === 'graphql') {
      if (!body.graphql) {
        updates.graphql = { query: '', variables: '{}' };
      }
      updateActiveTabRequest({ 
        method: 'POST',
        body: { ...body, ...updates } 
      });
    } else {
      updateActiveTabRequest({ body: { ...body, ...updates } });
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
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
      </div>
      
      {body.type === 'graphql' ? (
        <div style={{ flex: 1, width: '100%' }}>
          <GraphQLBuilder />
        </div>
      ) : body.type !== 'none' ? (
        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
          <CodeEditor 
            value={body.content}
            onChange={(val) => updateActiveTabRequest({ body: { ...body, content: val } })}
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
