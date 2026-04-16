import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Square, Save, Plus, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { RequestNode } from './nodes/RequestNode';
import { LogicNode } from './nodes/LogicNode';
import { useFlowStore } from '../../stores/useFlowStore';
import { FlowRunner } from '../../utils/flowRunner';
import NodeConfigPanel from './NodeConfigPanel';
import CreateNodeModal from '../modals/CreateNodeModal';

const CustomToolbar = ({ setShowAddNodeModal }: { setShowAddNodeModal: (val: boolean) => void }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flow-toolbar">
      <button 
        onClick={() => setShowAddNodeModal(true)}
        className="toolbar-btn"
        title="Add node"
      >
        <Plus size={18} />
      </button>
      <div className="toolbar-divider" />
      <button className="toolbar-btn" title="Zoom In" onClick={() => zoomIn()}>
        <ZoomIn size={18} />
      </button>
      <button className="toolbar-btn" title="Zoom Out" onClick={() => zoomOut()}>
        <ZoomOut size={18} />
      </button>
      <button className="toolbar-btn" title="Fit view" onClick={() => fitView({ duration: 800 })}>
        <Maximize size={18} />
      </button>
    </div>
  );
};

const nodeTypes = {
  request: RequestNode,
  logic: LogicNode,
  delay: LogicNode,
};

export default function FlowBuilder() {
  const { activeFlowId, flows, executionState, updateFlow, saveFlowsToDisk } = useFlowStore();
  const activeFlow = flows.find(f => f.id === activeFlowId);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const isSyncingRef = React.useRef(false);

  const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: false,
    style: { strokeWidth: 3 },
  };

  const handleNodeAction = useCallback((action: string, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    switch (action) {
      case 'rename':
        const newName = prompt('Enter new name:', node.data.name);
        if (newName) {
          setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, name: newName } } : n));
        }
        break;
      case 'duplicate':
        const newNode = {
          ...node,
          id: uuidv4(),
          position: { x: node.position.x + 50, y: node.position.y + 50 },
          data: { ...node.data, name: node.data.name + ' (copy)' },
        };
        setNodes(nds => [...nds, newNode]);
        break;
      case 'viewResponse':
        setSelectedNodeId(nodeId);
        break;
    }
  }, [nodes, setNodes]);

  // Sync nodes from store and add callbacks
  useEffect(() => {
    if (activeFlowId && activeFlow?.nodes && !isSyncingRef.current) {
      isSyncingRef.current = true;
      const nodesWithCallbacks = activeFlow.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onAction: handleNodeAction,
          onDoubleClick: () => setSelectedNodeId(node.id),
        },
      }));
      setNodes(nodesWithCallbacks);
      setEdges(activeFlow.edges || []);
      setTimeout(() => { isSyncingRef.current = false; }, 0);
    }
  }, [activeFlowId, activeFlow?.nodes, activeFlow?.edges, handleNodeAction, setNodes, setEdges]);

  // Update store when local state changes (but not during initial sync)
  useEffect(() => {
    if (activeFlowId && !isSyncingRef.current) {
      isSyncingRef.current = true;
      updateFlow(activeFlowId, { nodes, edges });
      setTimeout(() => { isSyncingRef.current = false; }, 0);
    }
  }, [nodes, edges, activeFlowId, updateFlow]);

  const handleAddNode = useCallback((newNode: any) => {
    setNodes((nds) => [...nds, {
      ...newNode,
      data: {
        ...newNode.data,
        onAction: handleNodeAction,
        onDoubleClick: () => setSelectedNodeId(newNode.id),
      }
    }]);
  }, [setNodes, handleNodeAction]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const requestId = event.dataTransfer.getData('requestId');
      const name = event.dataTransfer.getData('requestName');
      const requestMethod = event.dataTransfer.getData('requestMethod');
      const requestUrl = event.dataTransfer.getData('requestUrl');

      if (!type) return;

      const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      const position = reactFlowBounds 
        ? { x: event.clientX - reactFlowBounds.left - 280, y: event.clientY - reactFlowBounds.top - 100 }
        : { x: event.clientX - 350, y: event.clientY - 150 };

      const newNode = {
        id: uuidv4(),
        type: type as any,
        position,
        data: {
          name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          url: requestUrl || '',
          method: requestMethod || 'GET',
          status: 'idle',
          type: type,
          delayMs: type === 'delay' ? 1000 : undefined,
          condition: type === 'logic' ? 'true' : undefined,
          headers: [
            { id: '1', key: 'Content-Type', value: 'application/json', enabled: true }
          ],
          mappings: [],
          onAction: handleNodeAction,
          onDoubleClick: () => setSelectedNodeId(newNode.id),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );


  // Sync initial state when active flow changes
  useEffect(() => {
    const flow = flows.find(f => f.id === activeFlowId);
    if (flow) {
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
    }
  }, [activeFlowId, flows, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const [logsPanelOpen, setLogsPanelOpen] = useState(true);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);

  const handleRunFlow = async () => {
    if (!activeFlow) return;
    setLogsPanelOpen(true);
    const runner = new FlowRunner(activeFlow);
    await runner.run();
    setExecutionLogs(useFlowStore.getState().logs);
  };

  if (!activeFlowId) {
    return (
      <div className="flow-workspace">
        <div className="flow-empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2>Ready to Orchestrate?</h2>
          <p>Create an automated API workflow by dragging requests from the left sidebar onto this canvas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-workspace">
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

        <Panel position="top-right" className="flow-panel-group">
          <CustomToolbar setShowAddNodeModal={setShowAddNodeModal} />

          <button
            onClick={saveFlowsToDisk}
            className="flow-save-btn"
          >
            Save
          </button>

          <button
            onClick={handleRunFlow}
            disabled={executionState === 'running'}
            className={`flow-deploy-btn ${executionState === 'running' ? 'disabled' : ''}`}
          >
            {executionState === 'running' ? (
              <>
                <Square size={14} fill="currentColor" /> Stop
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" /> Deploy
              </>
            )}
          </button>
        </Panel>

        <Controls
          showInteractive={false}
          className="flow-controls"
        />
      </ReactFlow>

      {selectedNodeId && (
        <NodeConfigPanel
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {showAddNodeModal && (
        <CreateNodeModal
          isOpen={showAddNodeModal}
          onClose={() => setShowAddNodeModal(false)}
          onAddNode={handleAddNode}
        />
      )}
    </div>
  );
}