import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MoreVertical, ArrowUpRight } from 'lucide-react';
import '../../../styles/components/flow/flow-nodes.css';

interface RequestNodeProps {
  data: any;
  id: string;
}

export function RequestNode({ data, id }: RequestNodeProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const statusClass = data.status || 'idle';
  const statusLabel = data.status === 'success' ? '200 OK' : 
                      data.status === 'error' ? 'Failed' : 
                      data.status === 'running' ? 'Running...' : 'Pending';

  return (
    <div className="request-node-container" onDoubleClick={data.onDoubleClick}>
      <Handle type="target" position={Position.Left} className="flow-handle" />
      
      {/* HEADER: Molecule + Title + More */}
      <div className="request-node-header">
        <div className="header-left">
          <div className="node-icon-wrapper">
            {/* Molecule SVG Icon */}
            <svg viewBox="0 0 24 24" className="molecule-icon" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
              <circle cx="12" cy="12" r="3" />
              <circle cx="19" cy="7" r="2" />
              <circle cx="5" cy="7" r="2" />
              <circle cx="12" cy="19" r="2" />
              <line x1="12" y1="12" x2="19" y2="7" opacity="0.4" />
              <line x1="12" y1="12" x2="5" y2="7" opacity="0.4" />
              <line x1="12" y1="12" x2="12" y2="19" opacity="0.4" />
            </svg>
          </div>
          <div className="node-title-group">
            <span className="node-active-tag">Active Node</span>
            <span className="node-name">{data.name || 'Request'}</span>
          </div>
        </div>
        
        <button className="node-menu-btn" onClick={handleMenuClick}>
          <MoreVertical size={16} />
        </button>
      </div>

      {/* BODY: Method & Status Only */}
      <div className="request-node-body">
        <div className="node-row">
          <span className="node-label">Method</span>
          <span className="method-badge">{data.method || 'GET'}</span>
        </div>
        
        <div className="node-row">
          <span className="node-label">Status</span>
          <div className="status-indicator">
            <div className={`status-dot ${statusClass}`} />
            <span className="node-value">{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* FOOTER: View Response Action */}
      <div className="node-footer">
        <button className="view-response-btn" onClick={() => data.onAction?.('viewResponse', id)}>
          <span>View JSON Response</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      <Handle type="source" position={Position.Right} className="flow-handle" />
    </div>
  );
}