import { useState, useEffect } from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { useEnvStore } from '../../stores/useEnvStore';
import { v4 as uuidv4 } from 'uuid';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface CreateFlowModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CreateFlowModal({ isOpen, onClose }: CreateFlowModalProps) {
  const { addFlow, setActiveFlowId } = useFlowStore();
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
      setIsCreating(false);
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const handleCreate = async () => {
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
    
    try {
        await addFlow(newFlow);
        setActiveFlowId(newFlow.id);
        closeModal();
    } catch (e) {
        console.error("Failed to create flow:", e);
    } finally {
        setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleCreate();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  return createPortal(
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.7)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)'
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
          borderRadius: '16px', 
          width: '450px',
          maxWidth: '90vw',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'white' }}>Create New Flow</h2>
            <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Flow Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
                type="text"
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., User Onboarding Workflow"
                autoFocus
                style={{ width: '100%' }}
            />
            </div>
            
            <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Description <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
                className="text-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this flow does..."
                rows={2}
                style={{ width: '100%', resize: 'none' }}
            />
            </div>
            
            <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Target Environment <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
            </label>
            <select
                className="text-input"
                value={environmentId}
                onChange={(e) => setEnvironmentId(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
            >
                <option value="">Select an environment...</option>
                {environments.map((env) => (
                <option key={env.id} value={env.id}>
                    {env.name}
                </option>
                ))}
            </select>
            </div>
        </div>
        
        <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={closeModal} className="btn-secondary">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="btn-primary"
            style={{ padding: '10px 24px' }}
          >
            {isCreating ? 'Creating...' : 'Create Flow'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
