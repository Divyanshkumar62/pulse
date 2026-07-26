import { useTabStore } from '../../stores/useTabStore';
import CodeEditor from '../ui/CodeEditor';
import GraphQLBuilder from './GraphQLBuilder';
import KeyValueTable from './KeyValueTable';
import { toast } from 'sonner';

export default function BodyEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const body = activeTab.request.body || { type: 'none', content: '' };

  const handleTypeChange = (type: any) => {
    updateActiveTabRequest({ body: { ...body, type } });
  };

  const handleContentChange = (content: string) => {
    updateActiveTabRequest({ body: { ...body, content } });
  };

  const handleFormat = () => {
    if (body.type === 'json' || body.type === 'raw') {
      try {
        const parsed = JSON.parse(body.content || '');
        const formatted = JSON.stringify(parsed, null, 2);
        handleContentChange(formatted);
        toast.success('Formatted body successfully');
      } catch (e) {
        toast.error('Invalid JSON. Cannot format.');
      }
    } else if (body.type === 'graphql') {
      const gql = body.graphql || { query: '', variables: '{}' };
      if (gql.variables && gql.variables.trim()) {
        try {
          const parsed = JSON.parse(gql.variables);
          const formatted = JSON.stringify(parsed, null, 2);
          updateActiveTabRequest({
            body: {
              ...body,
              graphql: { ...gql, variables: formatted }
            }
          });
          toast.success('Formatted GraphQL variables successfully');
        } catch (e) {
          toast.error('Invalid variables JSON. Cannot format.');
        }
      } else {
        toast.info('No GraphQL variables to format.');
      }
    }
  };

  return (
    <div className="body-editor" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['none', 'json', 'raw', 'form-data', 'x-www-form-urlencoded', 'graphql'].map((type) => {
            const bodyTypeLabels: Record<string, string> = {
              'none': 'None',
              'json': 'JSON',
              'raw': 'Raw',
              'form-data': 'Form-Data',
              'x-www-form-urlencoded': 'URL-Encoded',
              'graphql': 'GraphQL'
            };
            return (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: body.type === type ? '#FFFFFF' : '#D1D5DB', fontWeight: body.type === type ? 700 : 500 }}>
              <input
                type="radio"
                name="bodyType"
                checked={body.type === type}
                onChange={() => handleTypeChange(type)}
                style={{ display: 'none' }}
              />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px solid var(--border-default)', background: body.type === type ? 'var(--accent-primary)' : 'transparent' }} />
              {bodyTypeLabels[type]}
            </label>
          )})}
        </div>

        {['json', 'raw', 'graphql'].includes(body.type) && (
          <button
            onClick={handleFormat}
            style={{
              fontSize: '11px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '2px 8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            className="beautify-btn"
          >
            Beautify
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {body.type === 'none' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '12px' }}>
            This request does not have a body.
          </div>
        )}
        
        {(body.type === 'json' || body.type === 'raw') && (
          <CodeEditor
            value={body.content || ''}
            onChange={handleContentChange}
            language={body.type === 'json' ? 'json' : undefined}
          />
        )}

        {body.type === 'graphql' && <GraphQLBuilder />}

        {(body.type === 'form-data' || body.type === 'x-www-form-urlencoded') && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
                <KeyValueTable 
                    items={[]} // TODO: Implement form data parsing
                    onChange={() => {}} 
                    keyPlaceholder="Field Name"
                    valuePlaceholder="Value"
                />
            </div>
        )}
      </div>
    </div>
  );
}
