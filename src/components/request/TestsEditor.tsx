import { useState } from 'react';
import CodeEditor from '../ui/CodeEditor';
import { useTabStore } from '../../stores/useTabStore';

type ViewMode = 'script' | 'schema';

export default function TestsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const [mode, setMode] = useState<ViewMode>('script');
  
  const activeTab = tabs.find(t => t.id === activeTabId);
  const script = activeTab?.request.testScript || '';
  const schema = activeTab?.request.responseSchema || '';

  return (
    <div className="tests-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button 
                onClick={() => setMode('script')}
                style={{ 
                    padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    background: mode === 'script' ? 'var(--bg-elevated)' : 'transparent',
                    color: mode === 'script' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    border: 'none'
                }}
            >
                Test Script
            </button>
            <button 
                onClick={() => setMode('schema')}
                style={{ 
                    padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    background: mode === 'schema' ? 'var(--bg-elevated)' : 'transparent',
                    color: mode === 'schema' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    border: 'none'
                }}
            >
                JSON Schema
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {mode === 'script' ? 'Executes after response' : 'Auto-validates response structure'}
          </div>
       </div>

       <div style={{ flex: 1, minHeight: 0 }}>
          {mode === 'script' ? (
              <CodeEditor 
                value={script} 
                onChange={(val) => updateActiveTabRequest({ testScript: val })} 
                language="javascript"
              />
          ) : (
              <CodeEditor 
                value={schema} 
                onChange={(val) => updateActiveTabRequest({ responseSchema: val })} 
                language="json"
                placeholder='{ "type": "object", "properties": { ... } }'
              />
          )}
       </div>

       <div style={{ marginTop: '12px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
            {mode === 'script' 
                ? 'Use `pm.test()` to register results. Example: `pm.test("Status is 200", () => pm.response.code === 200);`'
                : 'Define a JSON Schema to automatically validate the response body structure.'}
          </p>
       </div>
    </div>
  );
}
