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
import { Play, Square, Save, Zap, GitBranch, MousePointer2, Plus } from 'lucide-react';

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
          method: 'GET'
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
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
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
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0f172a] relative overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-24 h-24 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
              <GitBranch size={48} className="text-blue-400" />
              <Zap size={20} className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Orchestrate</span>?
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Create an automated API workflow by dragging requests from the left sidebar onto this canvas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full pt-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-3 group hover:bg-white/10 transition-all duration-300">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <MousePointer2 size={20} />
              </div>
              <span className="text-xs font-medium text-slate-300">Drag & Drop Requests</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-3 group hover:bg-white/10 transition-all duration-300">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Zap size={20} />
              </div>
              <span className="text-xs font-medium text-slate-300">Automate Execution</span>
            </div>
          </div>

          <div className="pt-8">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              <div className="h-[1px] w-8 bg-slate-800" />
              <span>How it works</span>
              <div className="h-[1px] w-8 bg-slate-800" />
            </div>
            <p className="mt-4 text-xs text-slate-500 max-w-[280px]">
              Select a flow from the sidebar or click <span className="text-blue-400">+</span> to create a new one to start building.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0f172a] relative">
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
        fitView
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="rgba(255, 255, 255, 0.05)" 
        />
        <Controls showInteractive={false} className="bg-slate-800 border-slate-700 fill-white" />
        
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={saveFlowsToDisk}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-slate-700 transition-all"
          >
            <Save size={16} />
            <span className="text-sm font-medium">Save</span>
          </button>
          
          <button
            onClick={handleRunFlow}
            disabled={executionState === 'running'}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-white transition-all ${
              executionState === 'running' 
                ? 'bg-red-500/20 border-red-500/50 text-red-500' 
                : 'bg-blue-600/80 border-blue-400/50 hover:bg-blue-500'
            }`}
          >
            {executionState === 'running' ? (
              <>
                <Square size={16} fill="currentColor" />
                <span className="text-sm font-medium">Stop</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                <span className="text-sm font-medium">Run Flow</span>
              </>
            )}
          </button>
        </Panel>
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
