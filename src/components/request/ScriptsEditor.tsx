import CodeEditor from '../ui/CodeEditor';
import { useTabStore } from '../../stores/useTabStore';

export default function ScriptsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const script = activeTab.request.preRequestScript || '';

  return (
    <div className="scripts-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Pre-request Script
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
       <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
        Learn more about the <a href="#" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Pulse Scripting API</a>.
      </div>
    </div>
  );
}
