import { useEnvStore } from '../../stores/useEnvStore';
import { useAppStore } from '../../stores/useAppStore';
import KeyValueTable from '../request/KeyValueTable';

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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      padding: '20px',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => setSelectedEnvironmentId(null)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{selectedEnv.name}</h2>
      </div>

      <div style={{ 
        background: 'rgba(22, 27, 34, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Environment variables override Global variables. Use {'{{variable_name}}'} syntax in your requests.
        </p>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <KeyValueTable 
            items={selectedEnv.variables}
            onChange={(newVars) => updateEnvironment(selectedEnv.id, { variables: newVars as { key: string; value: string; enabled: boolean }[] })}
            keyPlaceholder="Variable Name"
            valuePlaceholder="Value"
          />
        </div>
      </div>
    </div>
  );
}
