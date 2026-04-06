import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useEnvStore } from '../../stores/useEnvStore';
import { v4 as uuidv4 } from 'uuid';

export default function AddEnvironmentModal() {
  const { isAddEnvironmentModalOpen, setAddEnvironmentModalOpen, setSelectedEnvironmentId } = useAppStore();
  const { addEnvironment } = useEnvStore();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAddEnvironmentModalOpen) {
      setName('');
    }
  }, [isAddEnvironmentModalOpen]);

  if (!isAddEnvironmentModalOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    const newEnv = {
      id: uuidv4(),
      name: name.trim(),
      variables: []
    };
    
    await addEnvironment(newEnv);
    setSelectedEnvironmentId(newEnv.id);
    setName('');
    setIsCreating(false);
    setAddEnvironmentModalOpen(false);
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 10000 
      }} 
      onClick={() => setAddEnvironmentModalOpen(false)}
    >
      <div 
        style={{ 
          width: '420px', 
          backgroundColor: 'var(--bg-deep)', 
          borderRadius: '16px', 
          border: '1px solid var(--border-default)', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-h2" style={{ margin: 0, fontSize: '16px' }}>Create New Environment</h2>
          <button 
            onClick={() => setAddEnvironmentModalOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
          >
            ×
          </button>
        </div>
        
        <div style={{ padding: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
            ENVIRONMENT NAME
          </label>
          <input
            type="text"
            className="text-input"
            style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="e.g., Production, Staging, Development"
            autoFocus
          />
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={() => setAddEnvironmentModalOpen(false)}
            className="btn-secondary"
            style={{ padding: '10px 20px' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            className="btn-primary"
            style={{ padding: '10px 24px' }}
            disabled={!name.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Environment'}
          </button>
        </div>
      </div>
    </div>
  );
}
