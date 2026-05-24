import { useState, useEffect } from 'react';
import { useEnvStore } from '../../stores/useEnvStore';
import { useAppStore } from '../../stores/useAppStore';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import ConfirmModal from '../ui/ConfirmModal';
import { MoreVertical, Pin, Plus, Globe } from 'lucide-react';
import '../../styles/components/environments.css';

export default function EnvironmentsPanel() {
  const { environments, activeEnvId, setActiveEnvId, deleteEnvironment, duplicateEnvironment, renameEnvironment, togglePinEnvironment } = useEnvStore();
  const { setAddEnvironmentModalOpen, setSelectedEnvironmentId, setGlobalVariablesModalOpen } = useAppStore();
  
  const [menuPos, setMenuPos] = useState<{ x: number, y: number, envId: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditName] = useState('');
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY, envId: id });
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const submitRename = (id: string) => {
    if (editValue.trim()) {
      renameEnvironment(id, editValue.trim());
    }
    setEditingId(null);
  };

  const getMenuItems = (id: string, name: string, isPinned: boolean): ContextMenuItem[] => [
    { 
      label: 'Rename', 
      onClick: () => startRename(id, name) 
    },
    { 
      label: 'Duplicate', 
      onClick: () => duplicateEnvironment(id) 
    },
    { 
      label: isPinned ? 'Unpin' : 'Pin', 
      onClick: () => togglePinEnvironment(id) 
    },
    { 
      label: 'Delete', 
      onClick: () => setConfirmDeleteId(id),
      danger: true 
    }
  ];

  const envToDelete = environments.find(e => e.id === confirmDeleteId);

  return (
    <div className="environments-panel" style={{ paddingTop: '0px' }}>
      <div className="panel-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', gap: '12px', marginTop: '-4px' }}>
        <h2 className="panel-title" style={{ margin: 0, whiteSpace: 'nowrap' }}>
          Environments
        </h2>
        <button 
          onClick={() => setAddEnvironmentModalOpen(true)} 
          className="btn-secondary rounded-md" 
          style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
        >
          <Plus size={14} />
          New
        </button>
      </div>

      <div className="env-list">
        <div 
            className="env-item rounded-md"
            style={{ borderLeft: '3px solid var(--accent-primary)', background: 'rgba(37, 99, 235, 0.05)', marginBottom: '12px' }}
            onClick={() => setGlobalVariablesModalOpen(true)}
        >
            <div style={{ color: 'var(--accent-primary)', marginRight: '10px' }}>
                <Globe size={14} />
            </div>
            <span className="env-name" style={{ fontWeight: 600 }}>Globals</span>
            <div className="env-actions">
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px' }}>Global</span>
            </div>
        </div>

        {environments.map(env => (
          <div 
            key={env.id}
            className={`env-item rounded-md ${activeEnvId === env.id ? 'active' : ''}`}
            onClick={() => {
              setActiveEnvId(env.id);
              setSelectedEnvironmentId(env.id);
            }}
            onContextMenu={(e) => handleContextMenu(e, env.id)}
          >
            <div className="env-indicator" style={{ 
              background: env.pinned ? '#f59e0b' : (activeEnvId === env.id ? 'var(--accent-primary)' : 'transparent'),
              border: env.pinned ? 'none' : (activeEnvId === env.id ? 'none' : '1px solid var(--text-tertiary)')
            }} />
            
            {editingId === env.id ? (
              <input 
                autoFocus
                className="env-rename-input"
                value={editValue}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => submitRename(env.id)}
                onKeyDown={(e) => e.key === 'Enter' && submitRename(env.id)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="env-name">
                {env.name}
                {env.pinned && <Pin size={10} style={{ marginLeft: '6px', opacity: 0.6 }} />}
              </span>
            )}

            <div className="env-actions">
              <button 
                onClick={(e) => { e.stopPropagation(); setMenuPos({ x: e.clientX, y: e.clientY, envId: env.id }); }}
                className="env-action-btn"
                title="Options"
              >
                <MoreVertical size={14} />
              </button>
            </div>
          </div>
        ))}

        {environments.length === 0 && (
          <div style={{ marginTop: '20px', padding: '20px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>No environments found</p>
            <button onClick={() => setAddEnvironmentModalOpen(true)} className="btn-primary rounded-md" style={{ fontSize: '12px', padding: '8px 16px' }}>
              Add Environment
            </button>
          </div>
        )}
      </div>

      {menuPos && (
        <ContextMenu 
          x={menuPos.x}
          y={menuPos.y}
          items={getMenuItems(
            menuPos.envId, 
            environments.find(e => e.id === menuPos.envId)?.name || '',
            environments.find(e => e.id === menuPos.envId)?.pinned || false
          )}
          onClose={() => setMenuPos(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteEnvironment(confirmDeleteId)}
        title="Delete Environment"
        message={`Are you sure you want to delete "${envToDelete?.name}"? All variables in this environment will be permanently removed.`}
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
}
