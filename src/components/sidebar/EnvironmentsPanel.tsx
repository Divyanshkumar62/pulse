import { useEnvStore } from '../../stores/useEnvStore';
import { useAppStore } from '../../stores/useAppStore';

export default function EnvironmentsPanel() {
  const { environments, activeEnvId, setActiveEnvId, deleteEnvironment } = useEnvStore();
  const { setAddEnvironmentModalOpen, setSelectedEnvironmentId } = useAppStore();

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Environments</h2>
        <button onClick={() => setAddEnvironmentModalOpen(true)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
          + New
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {environments.map(env => (
          <div 
            key={env.id}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '10px 12px', 
              background: activeEnvId === env.id ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              border: `1px solid ${activeEnvId === env.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveEnvId(env.id)}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '12px', height: '12px', borderRadius: '50%', 
                background: activeEnvId === env.id ? 'var(--accent-primary)' : 'transparent',
                border: activeEnvId === env.id ? 'none' : '2px solid var(--border-subtle)'
              }} />
              <span style={{ fontSize: '13px', fontWeight: activeEnvId === env.id ? 600 : 500 }}>
                {env.name} {env.variables.length > 0 && `(${env.variables.length})`}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedEnvironmentId(env.id); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                title="Edit Variables"
              >
                🔧
              </button>
              {environments.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteEnvironment(env.id); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '4px' }}
                  title="Delete"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}

        {environments.length === 0 && (
          <div style={{ marginTop: '20px', padding: '20px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>No environments found</p>
            <button onClick={() => setAddEnvironmentModalOpen(true)} className="btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>
              Add Environment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
