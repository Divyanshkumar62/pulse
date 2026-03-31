import { useState, useEffect } from 'react';
import { Collection, Variable } from '../../types';
import { useCollectionStore } from '../../stores/useCollectionStore';
import KeyValueTable from '../request/KeyValueTable';

interface VariablesModalProps {
  collection: Collection;
  onClose: () => void;
}

export default function VariablesModal({ collection, onClose }: VariablesModalProps) {
  const { updateCollection } = useCollectionStore();
  const [variables, setVariables] = useState<Variable[]>(collection.variables || []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    // Only save variables that have at least a key
    const filtered = variables.filter(v => v.key.trim().length > 0);
    updateCollection(collection.id, { variables: filtered }, 'pulse.json');
    onClose();
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        backdropFilter: 'blur(8px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 10000 
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          width: '700px',
          height: '500px',
          backgroundColor: 'var(--bg-deep)', 
          borderRadius: '16px', 
          border: '1px solid var(--border-subtle)', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
          <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-primary)' }}>🔧</span> 
            {collection.name} Variables
          </h2>
          <p className="text-body" style={{ margin: '8px 0 0', opacity: 0.7, fontSize: '13px' }}>
            These variables will override Global and Environment variables for requests in this collection. Use {'{{variable_name}}'} syntax.
          </p>
        </div>
        
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
           <KeyValueTable 
             items={variables}
             onChange={(newVars) => setVariables(newVars as Variable[])}
             keyPlaceholder="Variable Name (e.g., base_url)"
             valuePlaceholder="Value (e.g., https://api.mycorp.com)"
           />
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
             className="btn-secondary" 
             onClick={onClose} 
             style={{ padding: '8px 24px', borderRadius: '8px' }}
          >
            Cancel
          </button>
          <button 
             className="btn-primary" 
             onClick={handleSave} 
             style={{ padding: '8px 24px', borderRadius: '8px' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
