import React from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { v4 as uuidv4 } from 'uuid';

export default function FlowSidebar() {
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

  return (
    <div className="w-[280px] h-full bg-[#0f111a] flex flex-col p-5 border-r border-white/10 shrink-0 select-none z-10">
  
      {/* SECTION 1: Brand Header */}
      <div className="mb-8 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <span className="text-white text-xl font-bold tracking-wide">Pulse</span>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">API Flow Builder</span>
      </div>

      {/* SECTION 2: Scrollable List Area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 no-scrollbar">
        
        {/* Library Group */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 px-2">Library</span>
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg bg-white/10 text-white transition-all">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            <span className="text-sm font-medium">Flows</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            <span className="text-sm font-medium">Collections</span>
          </button>
        </div>

        {/* API Requests Group */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 px-2">API Requests</span>
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-green-400 border border-green-400/30">GET</span>
            <span className="text-sm font-medium truncate">collect1</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-yellow-400 border border-yellow-400/30">POST</span>
            <span className="text-sm font-medium truncate">POSTreq1</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Footer (Forced to bottom via mt-auto) */}
      <div className="mt-auto pt-4 flex flex-col">
        <button 
          onClick={handleCreateFlow}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg mb-4 transition-colors"
        >
          + New Flow
        </button>
        
        <div className="flex items-center gap-3 px-2">
          {/* STRICT IMAGE CONSTRAINT HERE */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 shrink-0">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm text-white font-medium truncate">Alex Chen</span>
            <span className="text-xs text-gray-500 truncate">Pro Developer</span>
          </div>
          <button className="text-gray-400 hover:text-white ml-auto shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </div>

    </div>
  );
}