import { useEnvStore } from '../../stores/useEnvStore';
import { useAppStore } from '../../stores/useAppStore';
import KeyValueTable from '../request/KeyValueTable';
import '../../styles/components/environments.css';

export default function EnvironmentVariableEditor() {
  const { environments, updateEnvironment } = useEnvStore();
  const { selectedEnvironmentId, setSelectedEnvironmentId } = useAppStore();

  const selectedEnv = environments.find(e => e.id === selectedEnvironmentId);

  if (!selectedEnv) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <p>No environment selected</p>
        <p style={{ fontSize: '13px', marginTop: '8px' }}>Select an environment from the sidebar to edit its variables</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <button 
          onClick={() => setSelectedEnvironmentId(null)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <input
          value={selectedEnv.name}
          onChange={(e) => updateEnvironment(selectedEnv.id, { name: e.target.value })}
          className="mono"
          style={{ 
            background: 'transparent', 
            border: 'none', 
            fontSize: '18px', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            outline: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            width: '100%'
          }}
          placeholder="Environment Name"
        />
      </div>

      <div className="editor-card">
        <p className="editor-help">
          Environment variables override Global variables. Use {'{{variable_name}}'} syntax in your requests.
        </p>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <KeyValueTable 
            items={selectedEnv.variables}
            onChange={(newVars) => updateEnvironment(selectedEnv.id, { variables: newVars as any[] })}
            keyPlaceholder="Variable Name"
            valuePlaceholder="Value"
          />
        </div>
      </div>
    </div>
  );
}
