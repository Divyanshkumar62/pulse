import React, { useState, useEffect } from 'react';
import { FlowNodeMapping } from '../../types';
import { useFlowStore } from '../../stores/useFlowStore';

interface NodeConfigPanelProps {
  nodeId: string;
  onClose: () => void;
}

interface Header {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export default function NodeConfigPanel({ nodeId, onClose }: NodeConfigPanelProps) {
  const { flows, activeFlowId, updateFlow } = useFlowStore();
  const flow = flows.find(f => f.id === activeFlowId);
  const node = flow?.nodes.find(n => n.id === nodeId);

  const [nodeName, setNodeName] = useState(node?.data.name || '');
  const [url, setUrl] = useState(node?.data.url || '');
  const [method, setMethod] = useState(node?.data.method || 'GET');
  const [delayMs, setDelayMs] = useState(node?.data.delayMs || 1000);
  const [condition, setCondition] = useState(node?.data.condition || '');
  const [mappings, setMappings] = useState<FlowNodeMapping[]>(node?.data.mappings || []);
  const [headers, setHeaders] = useState<Header[]>(node?.data.headers || [
    { id: '1', key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [params, setParams] = useState<Header[]>(node?.data.params || []);
  const [body, setBody] = useState(node?.data.body || '');

  useEffect(() => {
    if (node) {
      setNodeName(node.data.name || '');
      setUrl(node.data.url || '');
      setMethod(node.data.method || 'GET');
      setDelayMs(node.data.delayMs || 1000);
      setCondition(node.data.condition || '');
      setMappings(node.data.mappings || []);
      setHeaders(node.data.headers || [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }]);
      setParams(node.data.params || []);
      setBody(node.data.body || '');
    }
  }, [nodeId, node]);

  if (!node || !activeFlowId || !flow) return null;

  const handleSave = () => {
    updateFlow(activeFlowId, {
      nodes: flow.nodes.map(n => 
        n.id === nodeId ? { 
          ...n, 
          data: { 
            ...n.data, 
            name: nodeName,
            url,
            method,
            delayMs,
            condition,
            mappings,
            headers,
            params,
            body
          } 
        } : n
      )
    });
    onClose();
  };

  const addHeader = () => setHeaders([...headers, { id: Date.now().toString(), key: '', value: '', enabled: true }]);
  const updateHeader = (index: number, updates: Partial<Header>) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    setHeaders(newHeaders);
  };
  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));

  const addParam = () => setParams([...params, { id: Date.now().toString(), key: '', value: '', enabled: true }]);
  const updateParam = (index: number, updates: Partial<Header>) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], ...updates };
    setParams(newParams);
  };
  const removeParam = (index: number) => setParams(params.filter((_, i) => i !== index));

  const addMapping = () => setMappings([...mappings, { sourcePath: '', targetVar: '' }]);
  const updateMapping = (index: number, updates: Partial<FlowNodeMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setMappings(newMappings);
  };
  const removeMapping = (index: number) => setMappings(mappings.filter((_, i) => i !== index));

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '400px',
    backgroundColor: 'rgba(9, 10, 15, 0.98)',
    backdropFilter: 'blur(30px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '-20px 0 50px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={panelStyle}>
        {/* Header */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'white', margin: 0 }}>Configure Node</h3>
            <span style={{ fontSize: '11px', color: '#475569' }}>ID: {nodeId}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          <div className="config-section">
            <label className="config-label">Node Name</label>
            <input 
              type="text" 
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              className="kv-input"
              style={{ width: '100%', marginTop: '8px' }}
            />
          </div>

          {node.type === 'delay' && (
            <div className="config-section">
              <label className="config-label">Delay (ms)</label>
              <input 
                type="number" 
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
                className="kv-input"
                style={{ width: '100%', marginTop: '8px' }}
              />
            </div>
          )}

          {node.type === 'logic' && (
            <div className="config-section">
              <label className="config-label">Condition</label>
              <input 
                type="text" 
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="{{variable}} === true"
                className="kv-input"
                style={{ width: '100%', marginTop: '8px' }}
              />
            </div>
          )}

          {node.type === 'request' && (
            <>
              <div className="config-section">
                <label className="config-label">Endpoint</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="kv-input"
                    style={{ width: '100px', cursor: 'pointer' }}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className="kv-input"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Params Section */}
              <div className="config-section">
                <div className="config-section-header">
                  <label className="config-label">Query Parameters</label>
                  <button onClick={addParam} className="config-add-btn">+ Add</button>
                </div>
                {params.map((p, idx) => (
                  <div key={p.id} className="kv-row">
                    <input type="checkbox" checked={p.enabled} onChange={(e) => updateParam(idx, { enabled: e.target.checked })} className="kv-checkbox" />
                    <input type="text" value={p.key} onChange={(e) => updateParam(idx, { key: e.target.value })} placeholder="Key" className="kv-input" />
                    <input type="text" value={p.value} onChange={(e) => updateParam(idx, { value: e.target.value })} placeholder="Value" className="kv-input" />
                    <button onClick={() => removeParam(idx)} className="kv-delete">✕</button>
                  </div>
                ))}
              </div>

              {/* Headers Section */}
              <div className="config-section">
                <div className="config-section-header">
                  <label className="config-label">Headers</label>
                  <button onClick={addHeader} className="config-add-btn">+ Add</button>
                </div>
                {headers.map((h, idx) => (
                  <div key={h.id} className="kv-row">
                    <input type="checkbox" checked={h.enabled} onChange={(e) => updateHeader(idx, { enabled: e.target.checked })} className="kv-checkbox" />
                    <input type="text" value={h.key} onChange={(e) => updateHeader(idx, { key: e.target.value })} placeholder="Key" className="kv-input" />
                    <input type="text" value={h.value} onChange={(e) => updateHeader(idx, { value: e.target.value })} placeholder="Value" className="kv-input" />
                    <button onClick={() => removeHeader(idx)} className="kv-delete">✕</button>
                  </div>
                ))}
              </div>

              {/* Body Section */}
              {['POST', 'PUT', 'PATCH'].includes(method) && (
                <div className="config-section">
                  <label className="config-label">JSON Body</label>
                  <div className="json-editor-container" style={{ marginTop: '8px' }}>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder='{ "key": "value" }'
                      className="json-textarea"
                    />
                  </div>
                </div>
              )}

              {/* Response Variable Mappings */}
              <div className="config-section">
                <div className="config-section-header">
                  <label className="config-label">Response Variable Mappings</label>
                  <button onClick={addMapping} className="config-add-btn">+ Add</button>
                </div>
                {mappings.map((m, idx) => (
                  <div key={idx} className="kv-row">
                    <input 
                      type="text" 
                      value={m.sourcePath} 
                      onChange={(e) => updateMapping(idx, { sourcePath: e.target.value })} 
                      placeholder="JSON Path (e.g. data.id)" 
                      className="kv-input" 
                    />
                    <span style={{ color: '#475569' }}>→</span>
                    <input 
                      type="text" 
                      value={m.targetVar} 
                      onChange={(e) => updateMapping(idx, { targetVar: e.target.value })} 
                      placeholder="Variable Name" 
                      className="kv-input" 
                    />
                    <button onClick={() => removeMapping(idx)} className="kv-delete">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button 
            onClick={handleSave}
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 700, 
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
            }}
          >
            Save Configuration
          </button>
        </div>
    </div>
  );
}