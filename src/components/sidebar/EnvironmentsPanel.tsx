import { useState } from 'react';
import { useEnvStore } from '../../stores/useEnvStore';
import { Variable } from '../../types';
import KeyValueTable from '../request/KeyValueTable';
import { v4 as uuidv4 } from 'uuid';

export default function EnvironmentsPanel() {
  const { environments, activeEnvId, setActiveEnvId, addEnvironment, updateEnvironment, deleteEnvironment } = useEnvStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeEnv = environments.find(e => e.id === activeEnvId);

  const handleCreate = () => {
    addEnvironment({ id: uuidv4(), name: 'New Environment', variables: [] });
  };

  const selectedEnv = editingId ? environments.find(e => e.id === editingId) : null;

  if (selectedEnv) {
    return (
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <button 
             onClick={() => setEditingId(null)}
             style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
           >
             ← Back
           </button>
           <input 
             value={selectedEnv.name}
             onChange={(e) => updateEnvironment(selectedEnv.id, { name: e.target.value })}
             style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, outline: 'none' }}
           />
         </div>
         <p className="text-body" style={{ margin: 0, opacity: 0.7, fontSize: '13px' }}>
            Environment variables override Global variables. Use {'{{variable_name}}'} syntax.
         </p>
         <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
           <KeyValueTable 
             items={selectedEnv.variables}
             onChange={(newVars) => updateEnvironment(selectedEnv.id, { variables: newVars as Variable[] })}
             keyPlaceholder="Variable Name"
             valuePlaceholder="Value"
           />
         </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-h2" style={{ margin: 0, fontSize: '14px' }}>Environments</h2>
        <button onClick={handleCreate} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
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
                {env.name}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingId(env.id); }}
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
      </div>
    </div>
  );
}
