import CodeEditor from '../ui/CodeEditor';
import { useTabStore } from '../../stores/useTabStore';

export default function ScriptsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const script = activeTab?.request.preRequestScript || '';

  return (
    <div className="scripts-editor" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
        PRE-REQUEST SCRIPT
      </div>
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <CodeEditor 
          value={script} 
          onChange={(val) => updateActiveTabRequest({ preRequestScript: val })} 
          language="javascript"
        />
      </div>
      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
        Learn more about the <a href="#" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Pulse Scripting API</a>.
      </div>
    </div>
  );
}
