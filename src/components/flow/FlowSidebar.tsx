import React, { useState, useRef, useEffect } from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { useAppStore } from '../../stores/useAppStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { usePresenceStore } from '../../stores/usePresenceStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { v4 as uuidv4 } from 'uuid';
import { getGravatarUrl } from '../../utils/gravatar';
import { LayoutDashboard, Folder, ChevronDown, ChevronRight, Clock, Globe, GitBranch, MoreVertical, Pin, Lock, Sparkles } from 'lucide-react';
import ContextMenu, { ContextMenuItem } from '../ui/ContextMenu';
import ConfirmModal from '../ui/ConfirmModal';
import { toast } from 'sonner';
import '../../styles/components/flow/flow-sidebar.css';

export default function FlowSidebar() {
  const [activeTab, setActiveTab] = useState('flows');
  const [isFlowsExpanded, setIsFlowsExpanded] = useState(true);
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(true);
  const [isControlExpanded, setIsControlExpanded] = useState(true);
  const { addFlow, setActiveFlowId, flows, activeFlowId, updateFlow, deleteFlow } = useFlowStore();
  const { collections } = useCollectionStore();
  const { setCreateFlowModalOpen } = useAppStore();
  const { presence } = usePresenceStore();
  const { settings } = useSettingsStore();
  
  const [menuPos, setMenuPos] = useState<{ x: number, y: number, flowId: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- FEATURE UNDER CONSTRUCTION ---
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 16px',
      background: 'var(--bg-deep)',
      gap: '24px',
      userSelect: 'none'
    }}>
      {/* Category Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Flow Library
        </span>
        
        {/* Mock Flow Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { name: 'Auth & Sync Pipeline', nodes: 3 },
            { name: 'Daily User Cleanup', nodes: 5 },
            { name: 'Slack Notify Webhook', nodes: 2 }
          ].map((flow, idx) => (
            <div 
              key={idx}
              onClick={() => {
                toast.info("Visual Flow Builder is in developer preview.", {
                  description: "Request early access in the main editor panel."
                });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {flow.name}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  {flow.nodes} nodes
                </span>
              </div>
              <Lock size={12} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(187, 154, 247, 0.03) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.12)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8' }}>
          <Sparkles size={14} />
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automations</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, opacity: 0.8 }}>
          Create schedules, cron-like triggers, and request pipes. Request beta access in the visual flow editor.
        </p>
      </div>
    </div>
  );

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleOpenCreateModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCreateFlowModalOpen(true);
  };

  const handleFlowClick = (flowId: string) => {
    setActiveFlowId(flowId);
  };

  const handleFlowMenuClick = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY, flowId });
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const submitRename = (id: string) => {
    if (editValue.trim()) {
      updateFlow(id, { name: editValue.trim() });
    }
    setEditingId(null);
  };

  const handleDuplicateFlow = (flowId: string) => {
    const flow = flows.find(f => f.id === flowId);
    if (flow) {
      const newFlow = {
        ...flow,
        id: uuidv4(),
        name: flow.name + ' (Copy)',
        nodes: (flow.nodes || []).map(n => ({ ...n })),
        edges: (flow.edges || []).map(e => ({ ...e })),
        pinned: false,
      };
      addFlow(newFlow as any);
      toast.success('Flow duplicated');
    }
  };

  const getMenuItems = (flow: any): ContextMenuItem[] => [
    { 
      label: 'Rename', 
      onClick: () => startRename(flow.id, flow.name) 
    },
    { 
      label: 'Duplicate', 
      onClick: () => handleDuplicateFlow(flow.id) 
    },
    { 
      label: flow.pinned ? 'Unpin' : 'Pin', 
      onClick: () => updateFlow(flow.id, { pinned: !flow.pinned }) 
    },
    { 
      label: 'Delete', 
      danger: true, 
      onClick: () => setConfirmDeleteId(flow.id) 
    }
  ];

  const handleDragStart = (event: React.DragEvent, nodeType: string, requestName?: string, requestMethod?: string, requestUrl?: string, requestId?: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    if (requestName) event.dataTransfer.setData('requestName', requestName);
    if (requestMethod) event.dataTransfer.setData('requestMethod', requestMethod);
    if (requestUrl) event.dataTransfer.setData('requestUrl', requestUrl);
    if (requestId) event.dataTransfer.setData('requestId', requestId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const flowToDelete = flows.find(f => f.id === confirmDeleteId);

  // Deduplicate flows for safety before rendering to prevent key issues
  const uniqueFlows = Array.from(new Map(flows.map(f => [f.id, f])).values());

  return (
    <div className="flow-sidebar">
      <div className="sidebar-content no-scrollbar">
        
        <div className="category-group">
          <span className="category-title">Library</span>
          <button 
            className={`nav-item ${activeTab === 'flows' ? 'active' : ''}`}
            onClick={() => setActiveTab('flows')}
          >
            <LayoutDashboard size={16} />
            <span>Flows</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'collections' ? 'active' : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            <Folder size={16} />
            <span>Collections</span>
          </button>
        </div>

        {activeTab === 'flows' && (
          <div className="category-group">
            <div 
              className="category-header" 
              onClick={() => setIsFlowsExpanded(!isFlowsExpanded)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span className="category-title">Your Flows</span>
              <div style={{ color: '#6b7280', paddingRight: '8px' }}>
                {isFlowsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </div>
            
            {isFlowsExpanded && (
              <div className="expanded-list">
                {uniqueFlows.length === 0 ? (
                  <span style={{ padding: '8px 12px', color: 'var(--text-tertiary, #64748b)', fontSize: '13px' }}>
                    No flows yet. Create one to get started.
                  </span>
                ) : (
                  [...uniqueFlows].sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return 0;
                  }).map((flow) => (
                    <div 
                      key={flow.id}
                      className={`nav-item-wrapper ${activeFlowId === flow.id ? 'active' : ''}`}
                    >
                      <button 
                        className={`nav-item ${activeFlowId === flow.id ? 'active' : ''}`}
                        onClick={() => handleFlowClick(flow.id)}
                        style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '8px 12px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                          {editingId === flow.id ? (
                            <input 
                              ref={editInputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => submitRename(flow.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') submitRename(flow.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--accent-primary)', 
                                borderRadius: '4px', color: 'white', padding: '2px 6px', fontSize: '13px', outline: 'none'
                              }}
                            />
                          ) : (
                            <>
                              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flow.name}</span>
                              {presence
                                .filter(p => p.item_id === flow.id && p.email !== settings?.email)
                                .map(p => (
                                  <img 
                                    key={p.email}
                                    src={getGravatarUrl(p.email, 32)} 
                                    alt={p.email}
                                    title={`${p.email} is viewing this flow`}
                                    style={{ 
                                      width: '14px', 
                                      height: '14px', 
                                      borderRadius: '50%', 
                                      border: '1px solid var(--accent-primary)',
                                      boxShadow: '0 0 6px var(--accent-subtle)'
                                    }}
                                  />
                                ))
                              }
                              {flow.pinned && <Pin size={10} style={{ opacity: 0.6, color: '#f59e0b' }} />}
                            </>
                          )}
                        </div>
                        {!editingId && (
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary, #64748b)' }}>
                            {flow.nodes?.length || 0} nodes
                          </span>
                        )}
                      </button>
                      
                      <button 
                        onClick={(e) => handleFlowMenuClick(e, flow.id)}
                        className="item-action-btn"
                        title="More options"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* API Requests Group */}
        {activeTab === 'collections' && (
          <div className="category-group">
            <div 
              className="category-header" 
              onClick={() => setIsCollectionsExpanded(!isCollectionsExpanded)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span className="category-title">API Requests</span>
              <div style={{ color: '#6b7280', paddingRight: '8px' }}>
                {isCollectionsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </div>

            {isCollectionsExpanded && (
              <div className="expanded-list custom-scrollbar-mini" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {collections.length === 0 ? (
                  <span style={{ padding: '8px 12px', color: 'var(--text-tertiary, #64748b)', fontSize: '12px' }}>
                    No collections yet. Create one in Collections tab.
                  </span>
                ) : (
                  collections.map((col, colIdx) => (
                    <div key={`${col.id || 'col'}-${colIdx}`}>
                      <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {col.name}
                      </div>
                      {col.requests.map((req, idx) => (
                        <button 
                          key={`${req.id}-${col.id}-${idx}`}
                          className="nav-item"
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, 'request', req.name, req.method, req.url, req.id)}
                        >
                          <span className={`http-badge badge-${req.method.toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 4px', minWidth: '32px' }}>{req.method}</span>
                          <span style={{ fontSize: '12px' }}>{req.name}</span>
                        </button>
                      ))}
                      {col.folders?.map((folder, folderIdx) => (
                        <div key={`${folder.id || 'folder'}-${folderIdx}`}>
                          <div style={{ padding: '4px 12px', fontSize: '11px', color: '#475569' }}>
                            📁 {folder.name}
                          </div>
                          {folder.requests.map((req, idx) => (
                            <button 
                              key={`${req.id}-${folder.id}-${idx}`}
                              className="nav-item"
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, 'request', req.name, req.method, req.url, req.id)}
                            >
                              <span className={`http-badge badge-${req.method.toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 4px', minWidth: '32px' }}>{req.method}</span>
                              <span style={{ fontSize: '12px' }}>{req.name}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Control Items */}
        <div className="category-group">
          <div 
            className="category-header" 
            onClick={() => setIsControlExpanded(!isControlExpanded)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span className="category-title">Control Items</span>
            <div style={{ color: '#6b7280', paddingRight: '8px' }}>
              {isControlExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </div>

          {isControlExpanded && (
            <div className="expanded-list">
              <button 
                className="nav-item"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, 'logic', 'Condition', 'LOGIC')}
              >
                <div className="node-icon-preview purple">
                   <GitBranch size={12} />
                </div>
                <span>Condition</span>
              </button>
              <button 
                className="nav-item"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, 'delay', 'Delay', 'DELAY')}
              >
                <div className="node-icon-preview blue">
                   <Clock size={12} />
                </div>
                <span>Delay</span>
              </button>
              <button 
                className="nav-item"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, 'loop', 'Loop', 'LOOP')}
              >
                <div className="node-icon-preview orange">
                   <GitBranch size={12} style={{ transform: 'rotate(90deg)' }} />
                </div>
                <span>Loop</span>
              </button>
              <button 
                className="nav-item"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, 'request', 'HTTP Request', 'REQUEST')}
              >
                <div className="node-icon-preview slate">
                   <Globe size={12} />
                </div>
                <span>HTTP Request</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="primary-btn rounded-md" style={{ fontWeight: 600 }} onClick={handleOpenCreateModal}>
          + New Flow
        </button>
      </div>

      {menuPos && (
        <ContextMenu 
          x={menuPos!.x}
          y={menuPos!.y}
          items={getMenuItems(flows.find(f => f.id === menuPos!.flowId))}
          onClose={() => setMenuPos(null)}
        />
      )}

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
            if (confirmDeleteId) {
                deleteFlow(confirmDeleteId);
                if (activeFlowId === confirmDeleteId) setActiveFlowId(null);
            }
        }}
        title="Delete Flow"
        message={`Are you sure you want to delete "${flowToDelete?.name}"? This will permanently remove the flow and all its connections.`}
        confirmLabel="Delete"
        isDanger={true}
      />

    </div>
  );
}
