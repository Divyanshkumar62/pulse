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

  return (
    <div className={`logic-node-container ${data.type || 'logic'}`}>
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
      
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
        {getIcon()}
      </div>

      <div className="flex flex-col">
        <span className="node-active-tag">
          {data.type || 'Logic'} Item
        </span>
        <span className="node-name">
          {isDelay ? `${data.delayMs || 1000}ms Wait` : data.name || 'Condition'}
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
