import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle, AlertCircle, Loader2, MoreVertical, Plus } from 'lucide-react';
import '../../../styles/components/flow/flow-nodes.css';

interface RequestNodeProps {
  data: any;
  id: string;
}

const methodColors: Record<string, string> = {
  GET: '#3b82f6',
  POST: '#eab308',
  PUT: '#22c55e',
  PATCH: '#8b5cf6',
  DELETE: '#ef4444',
};

export function RequestNode({ data, id }: RequestNodeProps) {
  const [showMenu, setShowMenu] = useState(false);

  const method = (data.method || 'GET').toUpperCase();
  const methodColor = methodColors[method] || '#64748b';
  
  const statusColor = data.status === 'success' ? '#22c55e' : 
                     data.status === 'error' ? '#ef4444' : 
                     data.status === 'running' ? '#3b82f6' : '#64748b';

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(!showMenu);
  };

  const handleActionClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[RequestNode] Action clicked:', action, 'id:', id);
    if (data.onAction) {
      data.onAction(action, id);
    }
    setShowMenu(false);
  };

  const handleOverlayClick = () => {
    setShowMenu(false);
  };

  return (
    <div 
      className={`request-node-container ${data.status || 'idle'}`}
      onDoubleClick={(e) => {
        if (data.onDoubleClick) data.onDoubleClick(e);
      }}
      style={{ borderTop: `3px solid ${methodColor}` }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="flow-handle flow-handle-left"
      >
        <div 
          className="handle-plus-icon" 
          onClick={(e) => { e.stopPropagation(); if (data.onAction) data.onAction('addFromNode_left', id); }}
        >
          <Plus size={10} strokeWidth={3} />
        </div>
      </Handle>
      
      <div className="request-node-content">
        <div className="node-header">
          <span className="node-name" style={{ color: methodColor }}>{data.name || 'Request'}</span>
          <div className="node-menu-wrapper">
            <button 
              className="node-menu-btn" 
              onClick={handleMenuClick}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <MoreVertical size={14} />
            </button>
            
            {showMenu && (
              <>
                <div className="node-menu-overlay" onClick={handleOverlayClick} />
                <div className="node-context-menu" onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => handleActionClick('rename', e)}>Rename</button>
                  <button onClick={(e) => handleActionClick('duplicate', e)}>Duplicate</button>
                  <button onClick={(e) => handleActionClick('viewResponse', e)}>View Response</button>
                  <button onClick={(e) => handleActionClick('delete', e)} className="delete-btn">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="node-info">
          <span className="node-method" style={{ backgroundColor: methodColor + '20', color: methodColor }}>
            {method}
          </span>
          <span className="node-status" style={{ color: statusColor }}>
            {data.status === 'running' ? <Loader2 size={12} className="spinning" /> : 
             data.status === 'success' ? <CheckCircle size={12} /> : 
             data.status === 'error' ? <AlertCircle size={12} /> : null}
            <span>{data.status === 'running' ? 'Running' : data.status === 'success' ? 'Done' : data.status === 'error' ? 'Failed' : 'Pending'}</span>
          </span>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        className="flow-handle flow-handle-right"
      >
        <div 
          className="handle-plus-icon" 
          onClick={(e) => { e.stopPropagation(); if (data.onAction) data.onAction('addFromNode_right', id); }}
        >
          <Plus size={10} strokeWidth={3} />
        </div>
      </Handle>
    </div>
  );
}