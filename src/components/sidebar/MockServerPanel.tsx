import { useState } from 'react';
import { useMockStore } from '../../stores/useMockStore';
import EmptyState from '../ui/EmptyState';
import ConfirmModal from '../ui/ConfirmModal';
import { Play, Square, Trash2, Server } from 'lucide-react';
import { toast } from 'sonner';

export default function MockServerPanel() {
  const { 
    mockServers, 
    activeMockServerId, 
    addMockServer, 
    setActiveMockServerId, 
    deleteMockServer,
    startMockServer,
    stopMockServer
  } = useMockStore();

  const [newMockName, setNewMockName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);

  const handleCreateMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMockName.trim()) return;

    // Find next available port starting from 3000
    const takenPorts = mockServers.map(s => s.port);
    let nextPort = 3000;
    while (takenPorts.includes(nextPort)) {
      nextPort++;
    }

    await addMockServer(newMockName.trim(), nextPort);
    setNewMockName('');
    setShowAddForm(false);
  };

  const handleToggleServer = async (id: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (currentStatus === 'active') {
        await stopMockServer(id);
      } else {
        await startMockServer(id);
        const server = mockServers.find(s => s.id === id);
        if (server) {
          toast.success(`Mock server "${server.name}" started`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || String(err));
    }
  };

  const confirmDeleteServer = async () => {
    if (serverToDelete) {
      await deleteMockServer(serverToDelete);
      setServerToDelete(null);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="text-h2" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Mock Servers
        </h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="btn-secondary" 
          style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}
        >
          {showAddForm ? 'Cancel' : '+ New Mock'}
        </button>
      </div>

      {showAddForm && (
        <form 
          onSubmit={handleCreateMock} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            background: 'var(--bg-surface)', 
            padding: '12px', 
            borderRadius: '8px',
            border: '1px solid var(--border-default)' 
          }}
        >
          <input 
            type="text" 
            placeholder="Mock Server Name" 
            value={newMockName}
            onChange={(e) => setNewMockName(e.target.value)}
            style={{ 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-default)', 
              color: 'var(--text-primary)', 
              padding: '6px 10px', 
              fontSize: '12px', 
              borderRadius: '4px',
              outline: 'none'
            }}
            autoFocus
          />
          <button 
            type="submit" 
            className="send-btn-premium" 
            style={{ fontSize: '11px', padding: '6px', fontWeight: 600 }}
          >
            Create Server
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
        {mockServers.length === 0 ? (
          <EmptyState 
            icon={Server}
            title="Simulate Any API"
            description="Create local endpoints to mimic production services for front-end testing."
            compact
          />
        ) : (
          mockServers.map(mock => {
            const isActive = activeMockServerId === mock.id;
            return (
              <div 
                key={mock.id}
                onClick={() => setActiveMockServerId(mock.id)}
                style={{ 
                  padding: '12px', 
                  background: isActive ? 'var(--accent-subtle)' : 'var(--bg-surface)', 
                  border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border-subtle)'}`, 
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 200ms ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span 
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={mock.name}
                  >
                    {mock.name.length > 23 ? `${mock.name.substring(0, 23)}...` : mock.name}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      onClick={(e) => handleToggleServer(mock.id, mock.status, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: mock.status === 'active' ? 'var(--status-error)' : 'var(--status-success)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background 150ms ease'
                      }}
                      title={mock.status === 'active' ? 'Stop Server' : 'Start Server'}
                    >
                      {mock.status === 'active' ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setServerToDelete(mock.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px'
                      }}
                      title="Delete Mock Server"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Port: {mock.port}
                  </span>
                  
                  <span style={{ 
                    fontSize: '9px', 
                    padding: '2px 6px', 
                    borderRadius: '8px', 
                    background: mock.status === 'active' ? 'var(--status-success-subtle)' : 'var(--bg-overlay)',
                    color: mock.status === 'active' ? 'var(--status-success)' : 'var(--text-tertiary)',
                    fontWeight: 700
                  }}>
                    {mock.status.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={!!serverToDelete}
        onClose={() => setServerToDelete(null)}
        onConfirm={confirmDeleteServer}
        title="Delete Mock Server"
        message="Are you sure you want to delete this mock server? This action cannot be undone."
        confirmLabel="Delete"
        isDanger
      />
    </div>
  );
}
