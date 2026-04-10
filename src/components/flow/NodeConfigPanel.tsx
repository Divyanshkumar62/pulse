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

  useEffect(() => {
    if (node) {
      setNodeName(node.data.name || '');
      setUrl(node.data.url || '');
      setMethod(node.data.method || 'GET');
      setDelayMs(node.data.delayMs || 1000);
      setCondition(node.data.condition || '');
      setMappings(node.data.mappings || []);
      setHeaders(node.data.headers || [
        { id: '1', key: 'Content-Type', value: 'application/json', enabled: true }
      ]);
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
            headers
          } 
        } : n
      )
    });
    onClose();
  };

  const addMapping = () => {
    setMappings([...mappings, { sourcePath: '', targetVar: '' }]);
  };

  const updateMapping = (index: number, updates: Partial<FlowNodeMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setMappings(newMappings);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const addHeader = () => {
    setHeaders([...headers, { id: Date.now().toString(), key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, updates: Partial<Header>) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const nodeTypes = ['request', 'delay', 'logic'];
  const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '360px',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    backdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: 'white',
          margin: 0,
        }}>
          Configure Node
        </h3>
        <button 
          onClick={onClose} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#94a3b8', 
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        
        {/* Node Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Node Name</label>
          <input 
            type="text" 
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            placeholder="Node name"
            style={inputStyle}
          />
        </div>

        {/* Type-specific config */}
        {node.type === 'delay' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Delay (milliseconds)</label>
            <input 
              type="number" 
              value={delayMs}
              onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
              placeholder="1000"
              style={inputStyle}
            />
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Wait for this many milliseconds before continuing
            </p>
          </div>
        )}

        {node.type === 'logic' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Condition</label>
            <input 
              type="text" 
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="{{node.status}} == 200"
              style={inputStyle}
            />
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Use {"{{node.response.field}}"} to reference previous node outputs
            </p>
          </div>
        )}

        {node.type === 'request' && (
          <>
            {/* HTTP Method */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {methodOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* URL */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>URL</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                style={inputStyle}
              />
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Use {"{{var_name}}"} for flow variables, {"{{node.field}}"} for previous node outputs
              </p>
            </div>

            {/* Headers */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Headers</label>
                <button 
                  onClick={addHeader}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#3b82f6', 
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add
                </button>
              </div>
              {headers.map((header, idx) => (
                <div key={header.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => updateHeader(idx, { enabled: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <input 
                    type="text" 
                    value={header.key}
                    onChange={(e) => updateHeader(idx, { key: e.target.value })}
                    placeholder="Header name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input 
                    type="text" 
                    value={header.value}
                    onChange={(e) => updateHeader(idx, { value: e.target.value })}
                    placeholder="Value"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button 
                    onClick={() => removeHeader(idx)}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: '#ef4444', 
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Variable Mappings */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Response Mappings</label>
                <button 
                  onClick={addMapping}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#3b82f6', 
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add
                </button>
              </div>
              
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                Map JSON response fields to flow variables for use in downstream nodes.
              </p>

              {mappings.map((mapping, idx) => (
                <div key={idx} style={{ marginBottom: '12px', position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={mapping.sourcePath}
                      onChange={(e) => updateMapping(idx, { sourcePath: e.target.value })}
                      placeholder="e.g. body.token"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <span style={{ color: '#64748b' }}>→</span>
                    <input 
                      type="text" 
                      value={mapping.targetVar}
                      onChange={(e) => updateMapping(idx, { targetVar: e.target.value })}
                      placeholder="var_name"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button 
                      onClick={() => removeMapping(idx)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#ef4444', 
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {mappings.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '16px', 
                  border: '2px dashed rgba(255, 255, 255, 0.1)', 
                  borderRadius: '8px',
                  color: '#64748b',
                  fontSize: '12px',
                }}>
                  No mappings configured. Add mappings to extract data from the response.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '16px 20px', 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)' 
      }}>
        <button 
          onClick={handleSave}
          style={{ 
            width: '100%',
            padding: '12px',
            backgroundColor: '#2563eb',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}