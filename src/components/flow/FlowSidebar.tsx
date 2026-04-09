import React from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/components/flow/flow-sidebar.css';

export default function FlowSidebar() {
  const { addFlow, setActiveFlow } = useFlowStore();

  const handleCreateFlow = () => {
    const newFlow = {
      id: uuidv4(),
      name: 'Untitled Workflow',
      nodes: [],
      edges: [],
      workspaceId: 'default'
    };
    addFlow(newFlow);
    setActiveFlow(newFlow.id);
  };

  return (
    <div className="flow-sidebar">
      
      {/* SECTION 3: Footer */}
      <div className="sidebar-footer">
        <button className="primary-btn" onClick={handleCreateFlow}>
          + New Flow
        </button>
      </div>

      {/* SECTION 2: Scrollable List Area */}
      <div className="sidebar-content">
        
        {/* Library Group */}
        <div className="category-group">
          <span className="category-title">Library</span>
          <button className="nav-item active">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Flows</span>
          </button>
          <button className="nav-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span>Collections</span>
          </button>
        </div>

        {/* API Requests Group */}
        <div className="category-group">
          <span className="category-title">API Requests</span>
          <button className="nav-item">
            <span className="http-badge badge-get">GET</span>
            <span>collect1</span>
          </button>
          <button className="nav-item">
            <span className="http-badge badge-post">POST</span>
            <span>POSTreq1</span>
          </button>
        </div>
      </div>

    </div>
  );
}