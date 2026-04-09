import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Square, Save, Zap, GitBranch, MousePointer2, Plus, ChevronRight, Maximize, Search } from 'lucide-react';

import { v4 as uuidv4 } from 'uuid';
import { RequestNode } from './nodes/RequestNode';
import { LogicNode } from './nodes/LogicNode';
import { useFlowStore } from '../../stores/useFlowStore';
import { FlowRunner } from '../../utils/flowRunner';
import NodeConfigPanel from './NodeConfigPanel';

const nodeTypes = {
  request: RequestNode,
  logic: LogicNode,
  delay: LogicNode,
};

export default function FlowBuilder() {
  const { activeFlowId, flows, executionState, updateFlow, saveFlowsToDisk } = useFlowStore();
  const activeFlow = useMemo(() => flows.find(f => f.id === activeFlowId), [flows, activeFlowId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>(activeFlow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>(activeFlow?.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: false,
    style: { strokeWidth: 3 },
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const requestId = event.dataTransfer.getData('requestId');
      const name = event.dataTransfer.getData('name');

      if (!type) return;

      const position = { x: event.clientX - 350, y: event.clientY - 150 };

      const newNode = {
        id: uuidv4(),
        type: type as any,
        position,
        data: { 
          name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          requestId,
          status: 'idle',
          method: 'GET',
          type: type // store the type in data for styling
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  // Update store when local state changes
  useEffect(() => {
    if (activeFlowId) {
      updateFlow(activeFlowId, { nodes, edges });
    }
  }, [nodes, edges, activeFlowId, updateFlow]);

  // Sync initial state when active flow changes
  useEffect(() => {
    if (activeFlow) {
      setNodes(activeFlow.nodes);
      setEdges(activeFlow.edges);
    }
  }, [activeFlowId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleRunFlow = async () => {
    if (!activeFlow) return;
    const runner = new FlowRunner(activeFlow);
    await runner.run();
  };

  if (!activeFlowId) {
    return (
      <div className="flow-workspace">
        <div className="flow-empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2>No Flow Selected</h2>
          <p>Create a new flow or select an existing one to get started</p>
        </div>
      </div>
    );
  }


  return (
    <div className="h-full w-full bg-[#070b14] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={24} 
          size={1.5} 
          color="rgba(255, 255, 255, 0.04)" 
        />
        
        <Panel position="top-right" className="flex gap-2">
          <div className="flex bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-2xl">
            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
              <Search size={18} />
            </button>
            <div className="w-[1px] h-4 bg-white/10 my-auto mx-1" />
            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
              <Plus size={18} />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
              <Maximize size={18} />
            </button>
          </div>

          <button
            onClick={saveFlowsToDisk}
            className="px-6 py-2 bg-slate-100 text-slate-900 rounded-xl font-bold text-sm hover:bg-white transition-all shadow-xl"
          >
            Save
          </button>
          
          <button
            onClick={handleRunFlow}
            disabled={executionState === 'running'}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
          >
            {executionState === 'running' ? (
              <>
                <Square size={14} fill="white" /> Stop
              </>
            ) : (
              <>
                <Play size={14} fill="white" /> Deploy
              </>
            )}
          </button>
        </Panel>

        <Controls 
          showInteractive={false} 
          className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl" 
        />
      </ReactFlow>

      {selectedNodeId && (
        <NodeConfigPanel 
          nodeId={selectedNodeId} 
          onClose={() => setSelectedNodeId(null)} 
        />
      )}
    </div>
  );
}
