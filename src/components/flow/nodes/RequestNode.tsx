import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Activity, CheckCircle, AlertCircle, Loader2, ArrowUpRight, MoreVertical } from 'lucide-react';
import '../../../styles/components/flow/flow-nodes.css';

export function RequestNode({ data }: { data: any }) {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'running': return <Loader2 className="spinning text-blue-400" size={14} />;
      case 'success': return <CheckCircle className="text-green-400" size={14} />;
      case 'error': return <AlertCircle className="text-red-400" size={14} />;
      default: return <Activity className="text-gray-400" size={14} />;
    }
  };

  const isActive = data.status === 'running' || data.status === 'success';

  return (
    <div className={`request-node-container ${data.status || 'idle'}`}>
      <div className="node-status-bar" />
      
      {isActive && (
        <div className="request-node-active-tag">
          Active Node
        </div>
      )}

      <div className="request-node-content">
        <Handle type="target" position={Position.Left} className="flow-handle" />
        
        <div className="request-node-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Activity size={18} className="text-blue-400" />
            </div>
            <div className="request-name">{data.name}</div>
          </div>
          <button className="p-1 hover:bg-white/5 rounded text-slate-500">
            <MoreVertical size={16} />
          </button>
        </div>
        
        <div className="node-fields">
          <div className="node-field">
            <span className="node-field-label">Method</span>
            <span className="method-badge">{data.method || 'GET'}</span>
          </div>
          
          <div className="node-field">
            <span className="node-field-label">Endpoint</span>
            <span className="node-field-value text-slate-300">/v1/user/auth</span>
          </div>

          <div className="node-field">
            <span className="node-field-label">Status</span>
            <div className="flex items-center gap-2">
              <span className={`node-field-value ${data.status === 'success' ? 'text-green-400' : 'text-slate-400'}`}>
                {data.lastResponse?.status || 'Waiting...'}
              </span>
              {getStatusIcon()}
            </div>
          </div>
        </div>

        <Handle type="source" position={Position.Right} className="flow-handle" />
      </div>

      <div className="node-footer">
        <div className="node-link">
          View JSON Response <ArrowUpRight size={12} />
        </div>
      </div>
    </div>
  );
}
