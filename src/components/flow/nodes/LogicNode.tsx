import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, GitBranch, Repeat, Settings2, Plus, MoreVertical, Play, CheckSquare } from 'lucide-react';
import '../../../styles/components/flow/flow-nodes.css';

export function LogicNode({ data, id }: { data: any, id: string }) {
  const [showMenu, setShowMenu] = useState(false);

  const isDelay = data.type === 'delay';
  const isBranch = data.type === 'logic';
  const isLoop = data.type === 'loop';
  const isAssertion = data.type === 'assertion';

  const getIcon = () => {
    if (isDelay) return <Clock size={16} className="text-blue-400" />;
    if (isBranch) return <GitBranch size={16} className="text-purple-400" />;
    if (isLoop) return <Repeat size={16} className="text-orange-400" />;
    if (isAssertion) return <CheckSquare size={16} className="text-green-400" />;
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

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(!showMenu);
  };

  const handleActionClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (data.onAction) {
      data.onAction(action, id);
    }
    setShowMenu(false);
  };

  return (
    <div 
      className={`logic-node-container ${data.type || 'logic'} ${data.status || 'idle'}`}
      onDoubleClick={() => data.onDoubleClick?.()}
      style={{
        borderLeft: data.status && data.status !== 'idle' ? `3px solid ${getStatusColor()}` : undefined
      }}
    >
      <div className="node-menu-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button 
          className="node-play-btn" 
          title="Run Node"
          onClick={(e) => handleActionClick('runNode', e)}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#10b981',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'all 0.2s',
          }}
        >
          <Play size={12} fill="#10b981" />
        </button>
        <button 
          className="node-menu-btn" 
          onClick={handleMenuClick}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MoreVertical size={14} />
        </button>
        
        {showMenu && (
          <>
            <div className="node-menu-overlay" onClick={() => setShowMenu(false)} />
            <div className="node-context-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={(e) => handleActionClick('rename', e)}>Rename</button>
              <button onClick={(e) => handleActionClick('duplicate', e)}>Duplicate</button>
              <button onClick={(e) => handleActionClick('delete', e)} className="delete-btn">Delete</button>
            </div>
          </>
        )}
      </div>

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
          {isDelay ? 'Delay' : isBranch ? 'Condition' : isLoop ? 'Loop' : isAssertion ? 'Assertion' : 'Control'}
        </span>
        <span className="node-name">
          {isDelay ? `${data.delayMs || 1000}ms Wait` : (isBranch || isAssertion) ? (data.condition || 'New Logic') : data.name}
        </span>
      </div>

      {(isBranch || isAssertion) ? (
        <>
          <Handle 
            type="source" 
            position={Position.Right} 
            id={isBranch ? "true" : "passed"}
            className="flow-handle flow-handle-right flow-handle-true"
          />
          <div className="handle-label success-label top">{isBranch ? 'True' : 'Passed'}</div>

          <Handle 
            type="source" 
            position={Position.Right} 
            id={isBranch ? "false" : "failed"}
            className="flow-handle flow-handle-right flow-handle-false"
          />
          <div className="handle-label failure-label bottom">{isBranch ? 'False' : 'Failed'}</div>
        </>
      ) : isLoop ? (
        <>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="each"
            className="flow-handle flow-handle-right flow-handle-true"
          />
          <div className="handle-label success-label top">Each</div>

          <Handle 
            type="source" 
            position={Position.Right} 
            id="done"
            className="flow-handle flow-handle-right flow-handle-false"
          />
          <div className="handle-label failure-label bottom">Done</div>
        </>
      ) : (
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
      )}
    </div>
  );
}
