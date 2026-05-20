import CodeEditor from '../ui/CodeEditor';
import { useTabStore } from '../../stores/useTabStore';

export default function TestsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const script = activeTab?.request.testScript || '';

  return (
    <div className="tests-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Test Script
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Executes after the response is received
          </div>
       </div>
       <div style={{ flex: 1, minHeight: 0 }}>
          <CodeEditor 
            value={script} 
            onChange={(val) => updateActiveTabRequest({ testScript: val })} 
          />
       </div>
       <div style={{ marginTop: '12px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
            Use `pm.test()` to register test results. Example: `pm.test("Status is 200", () =&gt; pm.response.code === 200);`
          </p>
       </div>
    </div>
  );
}
