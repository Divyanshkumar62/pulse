import { useState, useEffect } from 'react';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { v4 as uuidv4 } from 'uuid';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (node: any) => void;
}

const nodeTypeOptions = [
  { type: 'request', label: 'HTTP Request', description: 'Make an HTTP API call' },
  { type: 'delay', label: 'Delay', description: 'Wait for a specified time' },
  { type: 'logic', label: 'Condition', description: 'Branch based on a condition' },
  { type: 'assertion', label: 'Assertion', description: 'Verify response data' },
  { type: 'loop', label: 'Loop', description: 'Iterate over an array' },
];

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function CreateNodeModal({ isOpen, onClose, onAdd }: CreateNodeModalProps) {
  const { collections } = useCollectionStore();
  const [nodeType, setNodeType] = useState('request');
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [delayMs, setDelayMs] = useState(1000);
  const [condition, setCondition] = useState('');
  const [loopOver, setLoopOver] = useState('');
  const [loopVar, setLoopVar] = useState('item');

  const isValid = () => {
    if (!name.trim()) return false;
    if (nodeType === 'request') {
      return !!selectedRequestId || !!url.trim();
    }
    if (nodeType === 'delay') {
      return delayMs > 0;
    }
    if (nodeType === 'logic') {
      return !!condition.trim();
    }
    if (nodeType === 'loop') {
      return !!loopOver.trim() && !!loopVar.trim();
    }
    return true;
  };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setMethod('GET');
      setUrl('');
      setSelectedRequestId('');
      setDelayMs(1000);
      setCondition('');
      setLoopOver('');
      setLoopVar('item');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allRequests = collections.flatMap(c => {
    const directReqs = (c.requests || []).map(r => ({ ...r, collectionName: c.name }));
    const folderReqs = (c.folders || []).flatMap(f => 
      (f.requests || []).map(r => ({ ...r, collectionName: `${c.name} / ${f.name}` }))
    );
    return [...directReqs, ...folderReqs];
  });

  const handleAdd = () => {
    const nodeData: any = {
      id: uuidv4(),
      type: nodeType,
      position: { x: 100, y: 100 }, // Builder will reposition
      data: {
        name: name || (nodeType === 'request' ? 'New Request' : nodeType === 'delay' ? 'Delay' : nodeType === 'logic' ? 'Condition' : 'Loop'),
        status: 'idle',
        type: nodeType,
      },
    };

    if (nodeType === 'request') {
      if (selectedRequestId) {
        const req = allRequests.find(r => r.id === selectedRequestId);
        if (req) {
          nodeData.data.name = req.name;
          nodeData.data.url = req.url;
          nodeData.data.method = req.method;
          nodeData.data.headers = req.headers;
        }
      } else {
        nodeData.data.url = url;
        nodeData.data.method = method;
        nodeData.data.headers = [
          { id: '1', key: 'Content-Type', value: 'application/json', enabled: true }
        ];
      }
    } else if (nodeType === 'delay') {
      nodeData.data.delayMs = delayMs;
    } else if (nodeType === 'logic') {
      nodeData.data.condition = condition;
    } else if (nodeType === 'loop') {
      nodeData.data.loopOver = loopOver;
      nodeData.data.loopVar = loopVar;
    }

    onAdd(nodeData);
    onClose();
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
        zIndex: 11000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{ 
          backgroundColor: '#1e293b', 
          borderRadius: '12px', 
          padding: '24px',
          width: '520px',
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
          Add Node to Flow
        </h2>

        {/* Node Type Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            Node Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {nodeTypeOptions.map(opt => (
              <button
                key={opt.type}
                onClick={() => setNodeType(opt.type)}
                style={{
                  padding: '12px 8px',
                  backgroundColor: nodeType === opt.type ? '#2563eb' : '#0f172a',
                  border: `1px solid ${nodeType === opt.type ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <span>{opt.label}</span>
                <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 400 }}>{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            Node Name
          </label>
          <input 
            type="text"
            className="text-input"
            style={{ width: '100%' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Custom Step"
          />
        </div>

        {nodeType === 'request' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Select from Collections
              </label>
              <select
                value={selectedRequestId}
                onChange={(e) => {
                  setSelectedRequestId(e.target.value);
                  if (e.target.value) setUrl('');
                }}
                className="text-input"
                style={{ width: '100%' }}
              >
                <option value="">-- Manual URL --</option>
                {allRequests.map((req, idx) => (
                  <option key={`${req.id}-${idx}`} value={req.id}>
                    [{req.method}] {req.name} ({req.collectionName})
                  </option>
                ))}
              </select>
            </div>

            {!selectedRequestId && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Method</label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="text-input"
                            style={{ width: '100%' }}
                        >
                            {httpMethods.map(m => (
                            <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="text-input"
                    style={{ width: '100%' }}
                    placeholder="https://api.example.com"
                  />
                </div>
              </>
            )}
          </>
        )}

        {nodeType === 'delay' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Delay (ms)</label>
            <input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
              className="text-input"
              style={{ width: '100%' }}
            />
          </div>
        )}

        {nodeType === 'logic' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Condition</label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="text-input"
              style={{ width: '100%' }}
              placeholder="{{status}} === 200"
            />
          </div>
        )}

        {nodeType === 'loop' && (
          <div style={{ display: 'flex', gap: '12px' }}>
             <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Loop Over</label>
                <input
                    type="text"
                    value={loopOver}
                    onChange={(e) => setLoopOver(e.target.value)}
                    className="text-input"
                    style={{ width: '100%' }}
                    placeholder="{{items}}"
                />
             </div>
             <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Var Name</label>
                <input
                    type="text"
                    value={loopVar}
                    onChange={(e) => setLoopVar(e.target.value)}
                    className="text-input"
                    style={{ width: '100%' }}
                    placeholder="item"
                />
             </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={handleAdd} 
            className="btn-primary" 
            disabled={!isValid()}
            style={{ 
              padding: '8px 24px',
              opacity: isValid() ? 1 : 0.5,
              cursor: isValid() ? 'pointer' : 'not-allowed'
            }}
          >
            Add Node
          </button>
        </div>
      </div>
    </div>
  );
}
