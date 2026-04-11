import { useState, useEffect } from 'react';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { v4 as uuidv4 } from 'uuid';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (node: any) => void;
}

const nodeTypeOptions = [
  { type: 'request', label: 'HTTP Request', description: 'Make an HTTP API call' },
  { type: 'delay', label: 'Delay', description: 'Wait for a specified time' },
  { type: 'logic', label: 'Condition', description: 'Branch based on a condition' },
];

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function CreateNodeModal({ isOpen, onClose, onAddNode }: CreateNodeModalProps) {
  const { collections } = useCollectionStore();
  const [nodeType, setNodeType] = useState('request');
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [delayMs, setDelayMs] = useState(1000);
  const [condition, setCondition] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setMethod('GET');
      setUrl('');
      setSelectedRequestId('');
      setDelayMs(1000);
      setCondition('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allRequests = collections.flatMap(c => 
    c.requests.map(r => ({ ...r, collectionName: c.name }))
  );

  const handleAdd = () => {
    console.log('[CreateNodeModal] handleAdd called, nodeType:', nodeType);
    
    const nodeData: any = {
      id: uuidv4(),
      type: nodeType,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        name: name || (nodeType === 'request' ? 'New Request' : nodeType === 'delay' ? 'Delay' : 'Condition'),
        status: 'idle',
        type: nodeType,
      },
    };

    console.log('[CreateNodeModal] Created nodeData:', nodeData);

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
    }

    onAddNode(nodeData);
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
        zIndex: 1000,
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
          width: '480px',
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
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
            Node Type
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {nodeTypeOptions.map(opt => (
              <button
                key={opt.type}
                onClick={() => setNodeType(opt.type)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  backgroundColor: nodeType === opt.type ? '#2563eb' : '#0f172a',
                  border: `1px solid ${nodeType === opt.type ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Request Node Options */}
        {nodeType === 'request' && (
          <>
            {/* Select from Collection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                Select from Collections <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
              </label>
              <select
                value={selectedRequestId}
                onChange={(e) => {
                  setSelectedRequestId(e.target.value);
                  if (e.target.value) setUrl('');
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ color: '#64748b' }}>-- Select a saved request --</option>
                {allRequests.map(req => (
                  <option key={req.id} value={req.id}>
                    [{req.method}] {req.name} ({req.collectionName})
                  </option>
                ))}
              </select>
            </div>

            {!selectedRequestId && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                    HTTP Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {httpMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                    URL
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/endpoint"
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
              </>
            )}
          </>
        )}

        {/* Delay Node Options */}
        {nodeType === 'delay' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
              Delay (milliseconds)
            </label>
            <input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
              placeholder="1000"
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
        )}

        {/* Condition Node Options */}
        {nodeType === 'logic' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
              Condition
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="{{status}} == 200"
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
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Use {"{{variable}}"} to reference flow state variables
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
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
            onClick={handleAdd}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add Node
          </button>
        </div>
      </div>
    </div>
  );
}