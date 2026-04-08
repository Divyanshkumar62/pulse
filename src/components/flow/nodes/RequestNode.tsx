import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Activity, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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

  return (
    <div className={`request-node-container ${data.status || 'idle'}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      
      <div className="request-node-header">
        <span className="method-badge">
          {data.method || 'GET'}
        </span>
        <div className="status-container">{getStatusIcon()}</div>
      </div>
      
      <div className="request-node-body">
        <div className="request-name">{data.name}</div>
        {data.lastResponse && (
          <div className="execution-meta">
            {data.lastResponse.status} • {data.lastResponse.time_ms}ms
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  );
}
