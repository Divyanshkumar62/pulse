import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, GitBranch } from 'lucide-react';
import '../../../styles/components/flow/flow-nodes.css';

export function LogicNode({ data }: { data: any }) {
  const isDelay = data.delayMs !== undefined;

  return (
    <div className={`logic-node-container ${isDelay ? 'delay' : 'branch'}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      
      <div className="logic-node-content">
        {isDelay ? (
          <>
            <Clock size={16} className="text-blue-400" />
            <span>{data.delayMs}ms Delay</span>
          </>
        ) : (
          <>
            <GitBranch size={16} className="text-purple-400" />
            <span>Condition: {data.condition || 'IF'}</span>
          </>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  );
}
