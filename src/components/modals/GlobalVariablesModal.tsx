import { useState, useEffect } from 'react';
import { Variable } from '../../types';
import { useGlobalStore } from '../../stores/useGlobalStore';
import KeyValueTable from '../request/KeyValueTable';
import { X, Globe } from 'lucide-react';
import { createPortal } from 'react-dom';

interface GlobalVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalVariablesModal({ isOpen, onClose }: GlobalVariablesModalProps) {
  const { globalVariables, setGlobalVariables } = useGlobalStore();
  const [variables, setVariables] = useState<Variable[]>(globalVariables || []);

  useEffect(() => {
    if (isOpen) {
      setVariables(globalVariables || []);
    }
  }, [isOpen, globalVariables]);

  const handleSave = () => {
    // Filter out rows that are empty (only key/value matters)
    const filtered = variables.filter(v => v.key.trim().length > 0 || v.value.trim().length > 0);
    setGlobalVariables(filtered);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
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
      onClick={onClose}
    >
      <div 
        style={{ 
          width: '700px',
          height: '550px',
          backgroundColor: 'var(--bg-deep)', 
          borderRadius: '16px', 
          border: '1px solid var(--border-subtle)', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Globe size={20} color="var(--accent-primary)" />
              Global Variables
            </h2>
            <p style={{ margin: '8px 0 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              These variables are accessible from <b>every workspace</b>. Use {'{{variable_name}}'} syntax in URLs, headers, or bodies.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
           <KeyValueTable 
             items={variables}
             onChange={(newVars) => setVariables(newVars as Variable[])}
             keyPlaceholder="Variable Name"
             valuePlaceholder="Value"
           />
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Globals</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
