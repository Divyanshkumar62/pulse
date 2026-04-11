import React, { useState } from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { useAppStore } from '../../stores/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import { LayoutDashboard, Folder } from 'lucide-react';
import '../../styles/components/flow/flow-sidebar.css';



export default function FlowSidebar() {
  const [activeTab, setActiveTab] = useState('flows');
  const { addFlow, setActiveFlow, flows, activeFlowId, updateFlow, deleteFlow } = useFlowStore();
  const { setCreateFlowModalOpen } = useAppStore();
  
  const [flowMenuAnchor, setFlowMenuAnchor] = useState<{flowId: string, x: number, y: number} | null>(null);

  const handleOpenCreateModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCreateFlowModalOpen(true);
  };

  const handleFlowClick = (flowId: string) => {
    setActiveFlow(flowId);
  };

  const handleFlowMenuClick = (e: React.MouseEvent, flowId: string) => {
    e.stopPropagation();
    setFlowMenuAnchor({ flowId, x: e.clientX, y: e.clientY });
  };

  const handleCloseMenu = () => {
    setFlowMenuAnchor(null);
  };

  const handleRenameFlow = (flowId: string) => {
    const newName = prompt('Enter new name:');
    if (newName && newName.trim()) {
      updateFlow(flowId, { name: newName.trim() });
    }
    handleCloseMenu();
  };

  const handleDuplicateFlow = (flowId: string) => {
    const flow = flows.find(f => f.id === flowId);
    if (flow) {
      const newFlow = {
        ...flow,
        id: uuidv4(),
        name: flow.name + ' (Copy)',
        nodes: [...flow.nodes],
        edges: [...flow.edges],
      };
      addFlow(newFlow);
    }
    handleCloseMenu();
  };

  const handleDeleteFlow = (flowId: string) => {
    if (confirm('Are you sure you want to delete this flow?')) {
      deleteFlow(flowId);
      if (activeFlowId === flowId) {
        setActiveFlow(null);
      }
    }
    handleCloseMenu();
  };

  const handleDragStart = (event: React.DragEvent, nodeType: string, requestName?: string, requestMethod?: string, requestUrl?: string, requestId?: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    if (requestName) {
      event.dataTransfer.setData('requestName', requestName);
    }
    if (requestMethod) {
      event.dataTransfer.setData('requestMethod', requestMethod);
    }
    if (requestUrl) {
      event.dataTransfer.setData('requestUrl', requestUrl);
    }
    if (requestId) {
      event.dataTransfer.setData('requestId', requestId);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flow-sidebar">
      
      <div className="sidebar-content">
        
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
            <span className="category-title">Your Flows</span>
            {flows.length === 0 ? (
              <span style={{ padding: '8px 12px', color: 'var(--text-tertiary, #64748b)', fontSize: '13px' }}>
                No flows yet. Create one to get started.
              </span>
            ) : (
              flows.map((flow) => (
                <div 
                  key={flow.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}
                >
                  <button 
                    className={`nav-item ${activeFlowId === flow.id ? 'active' : ''}`}
                    onClick={() => handleFlowClick(flow.id)}
                    style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                  >
                    <span style={{ fontWeight: 500 }}>{flow.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)' }}>
                      {flow.nodes?.length || 0} nodes
                    </span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlowMenuClick(e, flow.id);
                    }}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'var(--text-tertiary, #64748b)', 
                      cursor: 'pointer',
                      padding: '8px',
                      fontSize: '16px',
                      borderRadius: '4px',
                    }}
                    title="More options"
                  >
                    ⋮
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* API Requests Group */}
        {activeTab === 'collections' && (
          <div className="category-group">
            <span className="category-title">API Requests</span>
            <button 
              className="nav-item"
              draggable={true}
              onDragStart={(e) => handleDragStart(e, 'request', 'collect1', 'GET', 'https://api.example.com/collect1')}
            >
              <span className="http-badge badge-get">GET</span>
              <span>collect1</span>
            </button>
            <button 
              className="nav-item"
              draggable={true}
              onDragStart={(e) => handleDragStart(e, 'request', 'POSTreq1', 'POST', 'https://api.example.com/POSTreq1')}
            >
              <span className="http-badge badge-post">POST</span>
              <span>POSTreq1</span>
            </button>
            <button 
              className="nav-item"
              draggable={true}
              onDragStart={(e) => handleDragStart(e, 'request', 'User Login', 'POST', 'https://api.example.com/auth/login')}
            >
              <span className="http-badge badge-post">POST</span>
              <span>User Login</span>
            </button>
            <button 
              className="nav-item"
              draggable={true}
              onDragStart={(e) => handleDragStart(e, 'request', 'Get Profile', 'GET', 'https://api.example.com/user/profile')}
            >
              <span className="http-badge badge-get">GET</span>
              <span>Get Profile</span>
            </button>
          </div>
        )}

        {/* Control Items */}
        <div className="category-group">
          <span className="category-title">Control Items</span>
          <button 
            className="nav-item"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, 'logic', 'Condition', 'LOGIC', '')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3h5v5M8 3H3v5M16 21h5v-5M8 21H3v-5M21 3l-9 9M3 21l9-9"/>
            </svg>
            <span>Condition</span>
          </button>
          <button 
            className="nav-item"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, 'delay', 'Delay', 'DELAY', '')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Delay</span>
          </button>
          <button 
            className="nav-item"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, 'request', 'HTTP Request', 'REQUEST', '')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
            </svg>
            <span>HTTP Request</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Footer with Create Flow Button */}
      <div className="sidebar-footer">
        <button className="primary-btn" onClick={handleOpenCreateModal}>
          + New Flow
        </button>
      </div>

      {/* Context Menu for Flow Actions */}
      {flowMenuAnchor && (
        <div 
          style={{
            position: 'fixed',
            top: flowMenuAnchor.y,
            left: flowMenuAnchor.x,
            backgroundColor: 'var(--bg-elevated, #1e293b)',
            border: '1px solid var(--border-default, rgba(255,255,255,0.1))',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 1000,
            minWidth: '160px',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleRenameFlow(flowMenuAnchor.flowId)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, white)',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface, #334155)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✏️ Rename
          </button>
          <button
            onClick={() => handleDuplicateFlow(flowMenuAnchor.flowId)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, white)',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface, #334155)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📋 Duplicate
          </button>
          <button
            onClick={() => handleDeleteFlow(flowMenuAnchor.flowId)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface, #334155)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🗑️ Delete
          </button>
        </div>
      )}
      
      {flowMenuAnchor && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
          }}
          onClick={handleCloseMenu}
        />
      )}

    </div>
  );
}