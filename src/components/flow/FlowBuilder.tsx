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
import { Play, Save, Plus, Maximize, ZoomIn, ZoomOut, Library, Repeat, GitBranch, Clock, ArrowRight, Sparkles, Send } from 'lucide-react';
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
import EmptyState from '../ui/EmptyState';
import { Workflow } from 'lucide-react';

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

  const [previewEmail, setPreviewEmail] = useState('');
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [previewSubmitting, setPreviewSubmitting] = useState(false);

  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewEmail.trim()) return;
    setPreviewSubmitting(true);
    setTimeout(() => {
      setPreviewSubmitting(false);
      setPreviewSubmitted(true);
      toast.success("Joined waitlist! We'll notify you soon.");
    }, 1000);
  };

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
            const isTriggered = (sourceNode?.data as any)?.triggeredHandle === edge.sourceHandle;
            
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

  // --- FEATURE UNDER CONSTRUCTION ---
  return (
    <div className="flow-construction-container">
      {/* Animated background elements */}
      <div className="flow-bg-orb orb-1"></div>
      <div className="flow-bg-orb orb-2"></div>
      <div className="flow-bg-orb orb-3"></div>
      <div className="flow-bg-grid"></div>

      <div className="flow-construction-card">
        {/* Glow Top Badge */}
        <div className="flow-coming-soon-badge">
          <Sparkles size={14} className="sparkle-icon" />
          <span>Coming Soon</span>
        </div>

        {/* Feature Icon */}
        <div className="flow-feature-icon-wrapper">
          <Workflow size={44} strokeWidth={1.5} className="flow-feature-icon" />
        </div>

        {/* Title */}
        <h2 className="flow-title">
          Visual Flow Builder
        </h2>

        {/* Subtitle / Description */}
        <p className="flow-subtitle">
          Design complex execution pipelines visually. Drag-and-drop requests, configure logic triggers, loop data streams, and debug runs in real-time.
        </p>

        {/* Features Preview Grid */}
        <div className="flow-features-grid">
          <div className="flow-feature-item">
            <div className="flow-feature-icon-box blue">
               <Play size={22} />
            </div>
            <span>Request Chaining</span>
          </div>

          <div className="flow-feature-item">
            <div className="flow-feature-icon-box green">
               <GitBranch size={22} />
            </div>
            <span>Control Nodes</span>
          </div>

          <div className="flow-feature-item">
            <div className="flow-feature-icon-box orange">
               <Repeat size={22} />
            </div>
            <span>Mock Runs</span>
          </div>
        </div>
      </div>

      <style>{`
        .flow-construction-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          align-items: center;
          justify-content: center;
          background: #0f111a;
          position: relative;
          overflow: hidden;
          padding: 40px 24px;
        }

        .flow-bg-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.5;
          z-index: 1;
        }

        .flow-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          z-index: 1;
          animation: float 10s infinite alternate ease-in-out;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: #3b82f6; /* Blue */
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: #8b5cf6; /* Purple */
          bottom: -50px;
          right: -50px;
          animation-delay: -3s;
        }

        .orb-3 {
          width: 250px;
          height: 250px;
          background: #10b981; /* Emerald */
          bottom: 20%;
          left: 20%;
          animation-delay: -7s;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, 50px) scale(1.1); }
        }

        .flow-construction-card {
          max-width: 640px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: rgba(17, 24, 39, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 64px 48px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          z-index: 10;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .flow-construction-card:hover {
          transform: translateY(-4px);
        }

        .flow-coming-soon-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 8px 20px;
          border-radius: 100px;
          color: #a78bfa;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 40px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
          animation: pulse-glow 3s infinite;
        }

        .sparkle-icon {
          animation: sparkle 2s infinite ease-in-out;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.15); border-color: rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.4); border-color: rgba(139, 92, 246, 0.6); }
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
          50% { transform: scale(1.2) rotate(15deg); opacity: 1; }
        }

        .flow-feature-icon-wrapper {
          width: 96px;
          height: 96px;
          border-radius: 28px;
          background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 32px;
          position: relative;
        }

        .flow-feature-icon-wrapper::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 30px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
          z-index: -1;
          opacity: 0.5;
          filter: blur(10px);
          animation: rotate-gradient 4s linear infinite;
        }

        @keyframes rotate-gradient {
          0% { filter: hue-rotate(0deg) blur(10px); }
          100% { filter: hue-rotate(360deg) blur(10px); }
        }

        .flow-feature-icon {
          animation: gentle-bounce 3s infinite ease-in-out;
        }

        @keyframes gentle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .flow-title {
          font-size: 36px;
          font-weight: 800;
          margin: 0 0 16px 0;
          background: linear-gradient(to right, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .flow-subtitle {
          font-size: 16px;
          color: #94a3b8;
          max-width: 500px;
          margin: 0 0 48px 0;
          line-height: 1.6;
        }

        .flow-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          width: 100%;
        }

        .flow-feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }

        .flow-feature-item:hover {
          background: rgba(255, 255, 255, 0.04);
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .flow-feature-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }

        .flow-feature-item:hover .flow-feature-icon-box {
          transform: scale(1.1);
        }

        .flow-feature-icon-box.blue {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .flow-feature-icon-box.green {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .flow-feature-icon-box.orange {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .flow-feature-item span {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  );

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
                value={activeFlow?.environmentId || ''}
                onChange={(e) => activeFlow && updateFlow(activeFlow.id, { environmentId: e.target.value })}
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
          nodeId={selectedNodeId!} 
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
