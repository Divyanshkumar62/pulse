import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, GitBranch, Repeat, Settings2, Plus } from 'lucide-react';
import '../../../styles/components/flow/flow-nodes.css';

export function LogicNode({ data, id }: { data: any, id: string }) {
  const isDelay = data.type === 'delay';
  const isBranch = data.type === 'logic';
  const isLoop = data.type === 'loop';

  const getIcon = () => {
    if (isDelay) return <Clock size={16} className="text-blue-400" />;
    if (isBranch) return <GitBranch size={16} className="text-purple-400" />;
    if (isLoop) return <Repeat size={16} className="text-orange-400" />;
    return <Settings2 size={16} className="text-slate-400" />;
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#3b82f6';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return 'transparent';
    }
  };

  return (
    <div 
      className={`logic-node-container ${data.type || 'logic'} ${data.status || 'idle'}`}
      onDoubleClick={() => data.onDoubleClick?.()}
      style={{
        borderLeft: data.status && data.status !== 'idle' ? `3px solid ${getStatusColor()}` : undefined
      }}
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
      
      <div className="logic-node-icon-wrapper">
        {getIcon()}
      </div>

      <div className="logic-node-info">
        <span className="node-active-tag">
          {isDelay ? 'Delay' : isBranch ? 'Logic' : 'Control'}
        </span>
        <span className="node-name">
          {isDelay ? `${data.delayMs || 1000}ms Wait` : isBranch ? (data.condition || 'Condition') : data.name}
        </span>
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
