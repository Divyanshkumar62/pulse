import { useState } from 'react';
import CodeEditor from '../ui/CodeEditor';
import { useTabStore } from '../../stores/useTabStore';

type ScriptType = 'pre-request' | 'post-request';

export default function ScriptsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const [activeType, setActiveType] = useState<ScriptType>('pre-request');
  
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const preScript = activeTab.request.preRequestScript || '';
  const postScript = activeTab.request.testScript || '';

  return (
    <div className="scripts-editor" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button 
                onClick={() => setActiveType('pre-request')}
                style={{ 
                    padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    background: activeType === 'pre-request' ? 'var(--bg-elevated)' : 'transparent',
                    color: activeType === 'pre-request' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    border: 'none'
                }}
            >
                Pre-request
            </button>
            <button 
                onClick={() => setActiveType('post-request')}
                style={{ 
                    padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    background: activeType === 'post-request' ? 'var(--bg-elevated)' : 'transparent',
                    color: activeType === 'post-request' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    border: 'none'
                }}
            >
                Tests / Post-request
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {activeType === 'pre-request' ? 'Executes before the request is sent' : 'Executes after the response is received'}
          </div>
       </div>

       <div style={{ flex: 1, minHeight: 0 }}>
          {activeType === 'pre-request' ? (
            <CodeEditor 
              value={preScript} 
              onChange={(val) => updateActiveTabRequest({ preRequestScript: val })} 
            />
          ) : (
            <CodeEditor 
              value={postScript} 
              onChange={(val) => updateActiveTabRequest({ testScript: val })} 
            />
          )}
       </div>

       <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
        Learn more about the <a href="#" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Pulse Scripting API</a>.
      </div>
    </div>
  );
}
