import React, { useState } from 'react';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useFlowStore } from '../../stores/useFlowStore';
import { v4 as uuidv4 } from 'uuid';

export default function FlowSidebar() {
  const { collections } = useCollectionStore();
  const { flows, activeFlowId, addFlow, setActiveFlow } = useFlowStore();

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

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-[280px] h-screen bg-[#0f111a] flex flex-col p-5">
      {/* Section 1: Top Brand Header */}
      <div className="flex flex-col items-start mb-8">
        <div className="flex flex-row items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-500">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" />
          </svg>
          <span className="text-xl font-bold text-white">Pulse</span>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">API FLOW BUILDER</span>
      </div>

      {/* Section 2 & 3: Category Groups */}
      <div className="flex-1 overflow-y-auto">
        
        {/* LIBRARY Section */}
        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 mt-6">LIBRARY</div>
        <div className="flex flex-col gap-1">
          <div
            className="flex flex-row items-center gap-3 px-3 py-2.5 w-full rounded-lg bg-white/10 backdrop-blur-sm text-white transition-all duration-200 cursor-pointer"
            onClick={() => {}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-400">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" />
              <path d="M12 11v6M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Flows</span>
          </div>
          <div
            className="flex flex-row items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-white/10 hover:backdrop-blur-sm text-gray-300 hover:text-white transition-all duration-200 cursor-pointer"
            onClick={() => {}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
              <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm">Collections</span>
          </div>
        </div>

        {/* CONTROL ITEMS Section */}
        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 mt-6">CONTROL ITEMS</div>
        <div className="flex flex-col gap-1">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'delay')}
            className="flex flex-row items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-white/10 hover:backdrop-blur-sm text-gray-300 hover:text-white transition-all duration-200 cursor-grab active:cursor-grabbing"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-orange-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Delay Node</span>
          </div>
        </div>

        {/* API REQUESTS Section */}
        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 mt-6">API REQUESTS</div>
        <div className="flex flex-col gap-1">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'request')}
            className="flex flex-row items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-white/10 hover:backdrop-blur-sm text-gray-300 hover:text-white transition-all duration-200 cursor-grab active:cursor-grabbing"
          >
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-green-400 border border-green-400/30">GET</span>
            <span className="text-sm">collect1</span>
          </div>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'request')}
            className="flex flex-row items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-white/10 hover:backdrop-blur-sm text-gray-300 hover:text-white transition-all duration-200 cursor-grab active:cursor-grabbing"
          >
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-blue-400 border border-blue-400/30">POST</span>
            <span className="text-sm">POSTreq1</span>
          </div>
        </div>
      </div>

      {/* Section 4: Bottom Footer */}
      <div className="mt-auto">
        <button
          onClick={handleCreateFlow}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg mb-4 transition-colors"
        >
          + New Flow
        </button>
        
        <div className="flex flex-row items-center">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
            alt="User"
            className="w-8 h-8 rounded-full"
          />
          <div className="flex flex-col ml-3">
            <span className="text-sm text-white font-medium">Alex Chen</span>
            <span className="text-xs text-gray-500">Pro Developer</span>
          </div>
          <button className="ml-auto text-gray-400 hover:text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}