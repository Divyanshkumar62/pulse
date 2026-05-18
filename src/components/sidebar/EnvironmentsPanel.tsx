import { useEnvStore } from '../../stores/useEnvStore';
import { useAppStore } from '../../stores/useAppStore';
import '../../styles/components/environments.css';

export default function EnvironmentsPanel() {
  const { environments, activeEnvId, setActiveEnvId, deleteEnvironment } = useEnvStore();
  const { setAddEnvironmentModalOpen, setSelectedEnvironmentId } = useAppStore();

  return (
    <div className="environments-panel">
      <div className="panel-header">
        <h2 className="panel-title">Environments</h2>
        <button onClick={() => setAddEnvironmentModalOpen(true)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
          + New
        </button>
      </div>

      <div className="env-list">
        {environments.map(env => (
          <div 
            key={env.id}
            className={`env-item ${activeEnvId === env.id ? 'active' : ''}`}
            onClick={() => {
              setActiveEnvId(env.id);
              setSelectedEnvironmentId(env.id);
            }}
          >
            <div className="env-indicator" style={{ 
              background: activeEnvId === env.id ? 'var(--accent-primary)' : 'transparent',
              border: activeEnvId === env.id ? 'none' : '1px solid var(--text-tertiary)'
            }} />
            <span className="env-name">{env.name}</span>
            {env.variables.length > 0 && (
              <span className="env-count">{env.variables.length}</span>
            )}
            
            <div className="env-actions">
              {environments.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteEnvironment(env.id); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
...

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
