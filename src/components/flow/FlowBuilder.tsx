import React, { useCallback, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
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
  useReactFlow,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Save, Plus, Maximize, ZoomIn, ZoomOut, Library } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { RequestNode } from './nodes/RequestNode';
import { LogicNode } from './nodes/LogicNode';
import { useFlowStore } from '../../stores/useFlowStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useEnvStore } from '../../stores/useEnvStore';
import { FlowRunner } from '../../utils/flowRunner';
import NodeConfigPanel from './NodeConfigPanel';
import CreateNodeModal from '../modals/CreateNodeModal';
import CustomEdge from './CustomEdge';
import ConfirmModal from '../ui/ConfirmModal';

const nodeTypes = {
  request: RequestNode,
  logic: LogicNode,
  delay: LogicNode,
  loop: LogicNode,
  assertion: LogicNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

function isFlowDataEqual(
  nodesA: any[], 
  edgesA: any[], 
  nodesB: any[], 
  edgesB: any[]
) {
  const getCoreNodes = (nds: any[]) => (nds || []).map(n => ({
    id: n.id,
    type: n.type,
    position: { x: Math.round(n.position?.x || 0), y: Math.round(n.position?.y || 0) },
    data: {
      name: n.data?.name,
      requestId: n.data?.requestId,
      url: n.data?.url,
      method: n.data?.method,
      delayMs: n.data?.delayMs,
      condition: n.data?.condition,
      loopOver: n.data?.loopOver,
      loopVar: n.data?.loopVar,
      headers: n.data?.headers,
      params: n.data?.params,
      mappings: n.data?.mappings,
      body: n.data?.body,
      status: n.data?.status,
      lastResponse: n.data?.lastResponse,
    }
  }));

  const getCoreEdges = (eds: any[]) => (eds || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: e.animated,
  }));

  const coreNodesA = getCoreNodes(nodesA);
  const coreNodesB = getCoreNodes(nodesB);
  const coreEdgesA = getCoreEdges(edgesA);
  const coreEdgesB = getCoreEdges(edgesB);

  return JSON.stringify(coreNodesA) === JSON.stringify(coreNodesB) &&
         JSON.stringify(coreEdgesA) === JSON.stringify(coreEdgesB);
}

export default function FlowBuilder() {
  const { activeFlowId, flows, executionState, updateFlow, saveFlowsToDisk } = useFlowStore();
  const { collections } = useCollectionStore();
  const { environments } = useEnvStore();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  
  const activeFlow = flows.find(f => f.id === activeFlowId);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [nodeToDeleteId, setNodeToDeleteId] = useState<string | null>(null);

  const lastSentToStoreRef = useRef<string>('');
  const localUpdateTimeoutRef = useRef<any>(null);

  // Keep a reference to the latest nodes state to avoid triggering sync loops in callbacks
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Run a single individual node by invoking the backend with a temporary single-node flow
  const handleRunNode = useCallback(async (nodeId: string) => {
    const { activeFlowId, flows } = useFlowStore.getState();
    const flow = flows.find(f => f.id === activeFlowId);
    if (!flow) return;
    
    const targetNode = nodesRef.current.find(n => n.id === nodeId);
    if (!targetNode) {
      toast.error('Node not found');
      return;
    }
    
    console.log(`[Pulse FlowBuilder] Running individual node: "${nodeId}" ("${targetNode.data?.name}")`);
    toast.info(`Running node: "${targetNode.data?.name || 'Request'}"...`);
    
    const miniFlow = {
      ...flow,
      nodes: [
        {
          id: targetNode.id,
          type: targetNode.type,
          position: targetNode.position,
          data: {
            name: targetNode.data?.name,
            requestId: targetNode.data?.requestId,
            url: targetNode.data?.url,
            method: targetNode.data?.method,
            delayMs: targetNode.data?.delayMs,
            condition: targetNode.data?.condition,
            loopOver: targetNode.data?.loopOver,
            loopVar: targetNode.data?.loopVar,
            headers: targetNode.data?.headers,
            params: targetNode.data?.params,
            mappings: targetNode.data?.mappings,
            body: targetNode.data?.body,
            status: targetNode.data?.status,
            lastResponse: targetNode.data?.lastResponse,
          }
        }
      ],
      edges: []
    };
    
    const runner = new FlowRunner(miniFlow as any);
    try {
      await runner.run();
      toast.success(`Node executed successfully`);
    } catch (e) {
      console.error(`[Pulse FlowBuilder] Node execution failed:`, e);
      toast.error(`Execution failed: ${e}`);
    }
  }, []);

  const handleNodeAction = useCallback((action: string, nodeId: string) => {
    console.log(`[Pulse FlowBuilder] handleNodeAction called: "${action}" on node ID: "${nodeId}"`);
    switch (action) {
      case 'rename':
        setSelectedNodeId(nodeId);
        break;
      case 'duplicate':
        setNodes(nds => {
          const node = nds.find(n => n.id === nodeId);
          if (!node) {
            console.error(`[Pulse FlowBuilder] Duplicate failed: Node "${nodeId}" not found in local state.`);
            return nds;
          }
          const newNodeId = uuidv4();
          const newNode = {
            ...node,
            id: newNodeId,
            selected: false, // Prevent original and duplicate from being selected/moving together
            position: { x: node.position.x + 50, y: node.position.y + 50 },
            data: { 
              ...node.data, 
              name: node.data.name + ' (copy)', 
              status: 'idle',
              onAction: handleNodeAction,
              onDoubleClick: () => {
                console.log(`[Pulse FlowBuilder] Double click on duplicated node: "${newNodeId}"`);
                setSelectedNodeId(newNodeId);
              }
            },
          };
          console.log(`[Pulse FlowBuilder] Duplicating node "${nodeId}" -> "${newNodeId}" ("${newNode.data.name}")`);
          return [...nds, newNode];
        });
        break;
      case 'delete':
        setNodeToDeleteId(nodeId);
        break;
      case 'runNode':
        handleRunNode(nodeId);
        break;
      case 'viewResponse':
        setSelectedNodeId(nodeId);
        break;
      default:
        console.warn(`[Pulse FlowBuilder] Unknown node action: "${action}"`);
    }
  }, [setNodes, handleRunNode]);

  const handleAddNode = useCallback((newNode: any) => {
    console.log(`[Pulse FlowBuilder] Adding new node "${newNode.id}" ("${newNode.data?.name}") from modal library`);
    setNodes((nds) => [...nds, {
      ...newNode,
      data: {
        ...newNode.data,
        onAction: handleNodeAction,
        onDoubleClick: () => {
          console.log(`[Pulse FlowBuilder] Double click on added node: "${newNode.id}"`);
          setSelectedNodeId(newNode.id);
        },
      }
    }]);
  }, [setNodes, handleNodeAction]);

  // Sync initial state when active flow changes or when external store updates occur
  useEffect(() => {
    // If activeFlowId changed, cancel any pending timeout to prevent cross-flow state contamination
    if (localUpdateTimeoutRef.current) {
      clearTimeout(localUpdateTimeoutRef.current);
      localUpdateTimeoutRef.current = null;
      console.log('[Pulse FlowBuilder] Active flow changed. Cancelled pending store updates for previous flow.');
    }

    // If we have a pending local change that is currently being debounced, 
    // we must NOT overwrite our local state with the stale store state.
    if (localUpdateTimeoutRef.current) {
      console.log('[Pulse FlowBuilder] Store-to-Local Sync skipped: Local edits are pending debounced store update.');
      return;
    }

    const flow = flows.find(f => f.id === activeFlowId);
    if (flow) {
      const storeNodes = flow.nodes || [];
      const storeEdges = flow.edges || [];
      
      const coreStoreNodes = storeNodes.map(n => ({
        id: n.id,
        type: n.type,
        position: { x: Math.round(n.position?.x || 0), y: Math.round(n.position?.y || 0) },
        data: {
          name: n.data?.name,
          requestId: n.data?.requestId,
          url: n.data?.url,
          method: n.data?.method,
          delayMs: n.data?.delayMs,
          condition: n.data?.condition,
          loopOver: n.data?.loopOver,
          loopVar: n.data?.loopVar,
          headers: n.data?.headers,
          params: n.data?.params,
          mappings: n.data?.mappings,
          body: n.data?.body,
          status: n.data?.status,
          lastResponse: n.data?.lastResponse,
        }
      }));

      const coreStoreEdges = storeEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: e.animated,
      }));

      const storeStringified = JSON.stringify({ nodes: coreStoreNodes, edges: coreStoreEdges });
      
      // If the store version is equal to what we just sent, do NOT overwrite the local state
      // (This breaks the infinite loop and preserves high-frequency local updates like dragging)
      if (storeStringified !== lastSentToStoreRef.current) {
        // Also check if it's different from our current local state
        if (!isFlowDataEqual(storeNodes, storeEdges, nodes, edges)) {
          console.log(`[Pulse FlowBuilder] Syncing Store -> Local State. Flow: "${activeFlowId}". Nodes count in Store: ${storeNodes.length}, Local: ${nodes.length}`);
          const nodesWithCallbacks = storeNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onAction: handleNodeAction,
              onDoubleClick: () => {
                console.log(`[Pulse FlowBuilder] Double click on node: "${node.id}"`);
                setSelectedNodeId(node.id);
              },
            },
          }));
          
          const edgesWithArrows = storeEdges.map(edge => {
            const isNegative = edge.sourceHandle === 'failure' || edge.sourceHandle === 'false' || edge.sourceHandle === 'done' || edge.sourceHandle === 'failed';
            const sourceNode = storeNodes.find(n => n.id === edge.source);
            const isTriggered = sourceNode?.data?.triggeredHandle === edge.sourceHandle;
            
            const strokeColor = isTriggered ? '#fbbf24' : (isNegative ? '#ef4444' : '#3b82f6');
            const strokeWidth = isTriggered ? 4 : 2;
            
            return {
              ...edge,
              animated: isTriggered || edge.animated,
              type: 'custom',
              style: { 
                stroke: strokeColor, 
                strokeWidth,
                filter: isTriggered ? 'drop-shadow(0 0 8px #fbbf24)' : undefined
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: strokeColor,
              }
            };
          });

          // Update ref to stay in sync
          lastSentToStoreRef.current = storeStringified;
          setNodes(nodesWithCallbacks);
          setEdges(edgesWithArrows);
        }
      }
    } else {
      if (nodes.length > 0 || edges.length > 0) {
        console.log('[Pulse FlowBuilder] No active flow. Clearing local canvas state.');
        lastSentToStoreRef.current = '';
        setNodes([]);
        setEdges([]);
      }
    }
  }, [activeFlowId, flows, setNodes, setEdges, handleNodeAction]);

  // Update store when local state changes (debounced by 250ms to prevent dragging lag and flickering)
  useEffect(() => {
    if (activeFlowId) {
      const flow = flows.find(f => f.id === activeFlowId);
      if (flow) {
        const coreNodes = (nodes || []).map(n => ({
          id: n.id,
          type: n.type,
          position: { x: Math.round(n.position?.x || 0), y: Math.round(n.position?.y || 0) },
          data: {
            name: n.data?.name,
            requestId: n.data?.requestId,
            url: n.data?.url,
            method: n.data?.method,
            delayMs: n.data?.delayMs,
            condition: n.data?.condition,
            loopOver: n.data?.loopOver,
            loopVar: n.data?.loopVar,
            headers: n.data?.headers,
            params: n.data?.params,
            mappings: n.data?.mappings,
            body: n.data?.body,
            status: n.data?.status,
            lastResponse: n.data?.lastResponse,
          }
        }));

        const coreEdges = (edges || []).map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          animated: e.animated,
        }));

        const currentStringified = JSON.stringify({ nodes: coreNodes, edges: coreEdges });
        const storeStringified = JSON.stringify({
          nodes: (flow.nodes || []).map(n => ({
            id: n.id,
            type: n.type,
            position: { x: Math.round(n.position?.x || 0), y: Math.round(n.position?.y || 0) },
            data: {
              name: n.data?.name,
              requestId: n.data?.requestId,
              url: n.data?.url,
              method: n.data?.method,
              delayMs: n.data?.delayMs,
              condition: n.data?.condition,
              loopOver: n.data?.loopOver,
              loopVar: n.data?.loopVar,
              headers: n.data?.headers,
              params: n.data?.params,
              mappings: n.data?.mappings,
              body: n.data?.body,
              status: n.data?.status,
              lastResponse: n.data?.lastResponse,
            }
          })),
          edges: (flow.edges || []).map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            animated: e.animated,
          }))
        });

        if (currentStringified !== storeStringified) {
          // Update the ref immediately to prevent store-to-local effect from overwriting local state
          lastSentToStoreRef.current = currentStringified;
          
          if (localUpdateTimeoutRef.current) {
            clearTimeout(localUpdateTimeoutRef.current);
          }
          
          localUpdateTimeoutRef.current = setTimeout(() => {
            console.log(`[Pulse FlowBuilder] Syncing Local State -> Store. Flow: "${activeFlowId}". Saving serialized nodes and edges.`);
            updateFlow(activeFlowId, { nodes: coreNodes, edges: coreEdges });
            localUpdateTimeoutRef.current = null;
          }, 250);
          
          return () => {
            if (localUpdateTimeoutRef.current) {
              clearTimeout(localUpdateTimeoutRef.current);
            }
          };
        }
      }
    }
  }, [nodes, edges, activeFlowId, updateFlow, flows]);

  const onConnect = useCallback(
    (params: Connection) => {
      const isNegative = params.sourceHandle === 'failure' || params.sourceHandle === 'false' || params.sourceHandle === 'done';
      const strokeColor = isNegative ? '#ef4444' : '#3b82f6';
      console.log(`[Pulse FlowBuilder] Creating new connection: ${params.source} (${params.sourceHandle}) -> ${params.target} (${params.targetHandle})`);
      return setEdges((eds) => addEdge({ 
        ...params, 
        animated: true, 
        type: 'custom',
        style: { stroke: strokeColor, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: strokeColor,
        }
      }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const requestId = event.dataTransfer.getData('requestId');
      let name = event.dataTransfer.getData('requestName');
      let requestMethod = event.dataTransfer.getData('requestMethod');
      let requestUrl = event.dataTransfer.getData('requestUrl');

      if (!type) {
        console.warn('[Pulse FlowBuilder] dropped node type is empty.');
        return;
      }

      if (requestId) {
        for (const col of collections) {
          const found = col.requests.find(r => r.id === requestId);
          if (found) {
            name = found.name;
            requestMethod = found.method;
            requestUrl = found.url;
            break;
          }
        }
      }

      const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      const position = reactFlowBounds 
        ? { x: event.clientX - reactFlowBounds.left - 100, y: event.clientY - reactFlowBounds.top - 50 }
        : { x: event.clientX - 100, y: event.clientY - 50 };

      const newNodeId = uuidv4();
      const newNode = {
        id: newNodeId,
        type: type === 'request' ? 'request' : (type === 'logic' || type === 'delay' || type === 'loop' ? 'logic' : 'request'),
        position,
        data: {
          name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          url: requestUrl || '',
          method: requestMethod || 'GET',
          status: 'idle',
          type: type,
          delayMs: type === 'delay' ? 1000 : undefined,
          condition: type === 'logic' ? 'true' : undefined,
          loopOver: type === 'loop' ? '' : undefined,
          loopVar: type === 'loop' ? 'item' : undefined,
          headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
          mappings: [],
          onAction: handleNodeAction,
          onDoubleClick: () => {
            console.log(`[Pulse FlowBuilder] Double click on dropped node: "${newNodeId}"`);
            setSelectedNodeId(newNodeId);
          },
        },
      };

      console.log(`[Pulse FlowBuilder] Node dropped onto canvas. Type: "${type}", ID: "${newNodeId}", Name: "${newNode.data.name}"`);
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, collections, handleNodeAction]
  );

  const handleRunFlow = async () => {
    if (!activeFlow) return;
    const runner = new FlowRunner(activeFlow);
    await runner.run();
  };

  if (!activeFlow) {
    return (
      <div className="flow-workspace">
        <div className="flow-empty-state">
          <Play size={48} />
          <h2>No Flow Selected</h2>
          <p>Select or create a flow from the sidebar to start building.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-workspace" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onNodeDoubleClick={(_e, node) => setSelectedNodeId(node.id)}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        
        {/* Top Header Panel */}
        <Panel position="top-left" style={{ margin: '16px' }}>
          <button 
            onClick={() => setShowAddNodeModal(true)}
            className="btn-primary rounded-md"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 18px', fontSize: '13px', fontWeight: 600,
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Library size={16} />
            Node Library
          </button>
        </Panel>

        <Panel position="top-right" className="flow-panel-group">
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-deep)', padding: '6px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
             <select 
                value={activeFlow.environmentId || ''}
                onChange={(e) => updateFlow(activeFlow.id, { environmentId: e.target.value })}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
             >
                <option value="">No Environment</option>
                {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                ))}
             </select>
          </div>

          <button 
            className="flow-save-btn rounded-md" 
            onClick={async () => {
              await saveFlowsToDisk();
              toast.success('Flow saved to disk');
            }}
          >
            <Save size={16} style={{ marginRight: '8px' }} />
            Save
          </button>
          
          <button 
            className="flow-deploy-btn rounded-md" 
            onClick={handleRunFlow}
            disabled={executionState === 'running'}
          >
            {executionState === 'running' ? (
              <span className="spinning" style={{ display: 'inline-block' }}>⏳</span>
            ) : (
              <Play size={16} />
            )}
            {executionState === 'running' ? 'Running...' : 'Run Flow'}
          </button>
        </Panel>

        {/* Bottom Map & Controls Area */}
        <Panel position="bottom-right" style={{ margin: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ 
                display: 'flex', background: 'var(--bg-elevated)', 
                backdropFilter: 'blur(12px)', border: '1px solid var(--border-subtle)', 
                borderRadius: '12px', padding: '4px', boxShadow: 'var(--shadow-md)' 
            }}>
                <button className="toolbar-btn" title="Zoom In" onClick={() => zoomIn()}>
                    <ZoomIn size={18} />
                </button>
                <button className="toolbar-btn" title="Zoom Out" onClick={() => zoomOut()}>
                    <ZoomOut size={18} />
                </button>
                <div className="toolbar-divider" />
                <button className="toolbar-btn" title="Fit view" onClick={() => fitView({ duration: 800 })}>
                    <Maximize size={18} />
                </button>
            </div>
            <MiniMap 
                style={{ margin: 0, position: 'static' }} 
                className="flow-minimap" 
                zoomable 
                pannable 
            />
        </Panel>
      </ReactFlow>

      {selectedNodeId && (
        <NodeConfigPanel 
          nodeId={selectedNodeId} 
          onClose={() => setSelectedNodeId(null)} 
        />
      )}

      <CreateNodeModal 
        isOpen={showAddNodeModal} 
        onClose={() => setShowAddNodeModal(false)}
        onAdd={handleAddNode}
      />

      <ConfirmModal
        isOpen={!!nodeToDeleteId}
        onClose={() => setNodeToDeleteId(null)}
        onConfirm={() => {
          if (nodeToDeleteId) {
            console.log(`[Pulse FlowBuilder] Confirming delete for node: "${nodeToDeleteId}"`);
            
            // Delete the node from local state
            setNodes(nds => nds.filter(n => n.id !== nodeToDeleteId));
            
            // Delete connected edges
            setEdges(eds => eds.filter(e => e.source !== nodeToDeleteId && e.target !== nodeToDeleteId));
            
            if (selectedNodeId === nodeToDeleteId) {
              setSelectedNodeId(null);
            }
            
            setNodeToDeleteId(null);
            toast.success('Node deleted from workflow');
          }
        }}
        title="Delete Node"
        message="Are you sure you want to delete this node? This will permanently remove the node and all of its connections from the workflow."
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
}
