import { useState, useEffect } from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { useEnvStore } from '../../stores/useEnvStore';
import { v4 as uuidv4 } from 'uuid';

interface CreateFlowModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CreateFlowModal({ isOpen, onClose }: CreateFlowModalProps) {
  const { addFlow, setActiveFlow } = useFlowStore();
  const { environments } = useEnvStore();
  
  const isModalOpen = isOpen;
  const closeModal = onClose || (() => {});
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environmentId, setEnvironmentId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isModalOpen) {
      setName('');
      setDescription('');
      setEnvironmentId('');
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    
    const newFlow = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim() || undefined,
      environmentId: environmentId || undefined,
      nodes: [],
      edges: [],
      workspaceId: 'default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    addFlow(newFlow);
    setActiveFlow(newFlow.id);
    
    setName('');
    setDescription('');
    setEnvironmentId('');
    setIsCreating(false);
    closeModal();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleCreate();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.7)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div 
        style={{ 
          backgroundColor: '#1e293b', 
          borderRadius: '12px', 
          padding: '24px',
          width: '420px',
          maxWidth: '90vw',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: 600,
          color: 'white',
        }}>
          Create New Flow
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
            Flow Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., User Provisioning Flow"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
            Description <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this flow does..."
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
            Target Environment <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
          </label>
          <select
            value={environmentId}
            onChange={(e) => setEnvironmentId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ color: '#64748b' }}>Select an environment...</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={closeModal}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            style={{
              padding: '10px 20px',
              backgroundColor: name.trim() && !isCreating ? '#2563eb' : '#334155',
              border: 'none',
              borderRadius: '8px',
              color: name.trim() && !isCreating ? 'white' : '#64748b',
              fontSize: '14px',
              fontWeight: 600,
              cursor: name.trim() && !isCreating ? 'pointer' : 'not-allowed',
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            {isCreating ? 'Creating...' : 'Create Flow'}
          </button>
        </div>
      </div>
    </div>
  );
}