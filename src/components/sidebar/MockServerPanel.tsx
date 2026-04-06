import { useState } from 'react';
import { useEnvStore } from '../../stores/useEnvStore';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/components/activity-panel.css';

interface MockServer {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
}

export default function MockServerPanel() {
  const { environments, addEnvironment } = useEnvStore();
  const [mockServers, setMockServers] = useState<MockServer[]>([
    { id: uuidv4(), name: 'Pulse Mock API', url: 'https://mock.pulse.api/v1', status: 'active' }
  ]);

  const handleCreateEnv = () => {
    addEnvironment({ id: uuidv4(), name: 'New Environment', variables: [] });
  };

  const handleCreateMock = () => {
    const newMock: MockServer = {
      id: uuidv4(),
      name: 'New Mock Server',
      url: `https://mock.pulse.api/${uuidv4().slice(0, 8)}`,
      status: 'active'
    };
    setMockServers([...mockServers, newMock]);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-h2" style={{ margin: 0, fontSize: '14px' }}>Mock Servers</h2>
        <button onClick={handleCreateMock} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
          + New Mock
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mockServers.map(mock => (
          <div 
            key={mock.id}
            style={{ 
              padding: '12px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{mock.name}</span>
              <span style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '10px', 
                background: mock.status === 'active' ? 'var(--status-success-subtle)' : 'var(--bg-overlay)',
                color: mock.status === 'active' ? 'var(--status-success)' : 'var(--text-tertiary)',
                fontWeight: 700
              }}>
                {mock.status.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mock.url}
            </span>
          </div>
        ))}

        {environments.length === 0 && (
          <div style={{ marginTop: '20px', padding: '20px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>No environments found</p>
            <button onClick={handleCreateEnv} className="send-btn-premium" style={{ fontSize: '12px' }}>
              Add Environment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
