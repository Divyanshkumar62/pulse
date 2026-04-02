import CodeEditor from '../ui/CodeEditor';
import { useTabStore } from '../../stores/useTabStore';

export default function ScriptsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const script = activeTab?.request.preRequestScript || '';

  return (
    <div className="scripts-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            PRE-REQUEST SCRIPT
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Executes before the request is sent
          </div>
       </div>
       <div style={{ flex: 1, minHeight: 0 }}>
          <CodeEditor 
            value={script} 
            onChange={(val) => updateActiveTabRequest({ preRequestScript: val })} 
          />
       </div>
       <div style={{ marginTop: '12px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
            Use `pm.environment.set()` or `pm.collectionVariables.set()` to dynamically update values.
          </p>
       </div>
    </div>
  );
}
