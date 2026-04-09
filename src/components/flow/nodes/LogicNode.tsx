import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, GitBranch, Repeat, Settings2 } from 'lucide-react';
import '../../../styles/components/flow/flow-nodes.css';

export function LogicNode({ data }: { data: any }) {
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
      <Handle type="target" position={Position.Left} className="flow-handle" />
      
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
        {getIcon()}
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {data.type || 'Logic'}
        </span>
        <span className="text-xs font-semibold text-slate-200">
          {isDelay ? `${data.delayMs || 1000}ms Wait` : data.name || 'Condition'}
        </span>
      </div>

      <Handle type="source" position={Position.Right} className="flow-handle" />
    </div>
  );
}
