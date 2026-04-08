import React, { useState } from 'react';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useFlowStore } from '../../stores/useFlowStore';
import { Search, Plus, Folder as FolderIcon, FileCode, Play, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function FlowSidebar() {
  const { collections } = useCollectionStore();
  const { flows, activeFlowId, addFlow, setActiveFlow, deleteFlow } = useFlowStore();
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreateFlow = () => {
    const newFlow = {
      id: uuidv4(),
      name: 'New Flow',
      nodes: [
        {
          id: 'start',
          type: 'start' as const,
          position: { x: 250, y: 50 },
          data: { name: 'Start' }
        }
      ],
      edges: [],
      workspaceId: 'default' // Should be dynamic
    };
    addFlow(newFlow);
    setActiveFlow(newFlow.id);
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, requestId?: string, name?: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    if (requestId) event.dataTransfer.setData('requestId', requestId);
    if (name) event.dataTransfer.setData('name', name);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-col h-full bg-[#1e293b] border-r border-white/5">
      <div className="p-4 border-b border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Flows</h2>
          <button 
            onClick={handleCreateFlow}
            className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-md transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {flows.length > 0 ? (
            flows.map(flow => (
              <div 
                key={flow.id}
                onClick={() => setActiveFlow(flow.id)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                  activeFlowId === flow.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Play size={14} className={activeFlowId === flow.id ? 'text-blue-400' : 'text-slate-400'} />
                  <span className={`text-sm truncate ${activeFlowId === flow.id ? 'text-white font-medium' : 'text-slate-300'}`}>
                    {flow.name}
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteFlow(flow.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-6 border border-dashed border-white/5 rounded-lg px-2">
              <p className="text-[10px] text-slate-500 font-medium">No flows created yet.</p>
              <button 
                onClick={handleCreateFlow}
                className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                + Create Flow
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Control Items</h3>
            <div 
              draggable 
              onDragStart={(e) => onDragStart(e, 'delay')}
              className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-md cursor-grab active:cursor-grabbing group transition-colors"
            >
              <FileCode size={14} className="text-blue-400" />
              <span className="text-xs text-slate-300 group-hover:text-white">Delay Node</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">API Requests</h3>
            {collections.map(collection => (
              <div key={collection.id} className="space-y-1">
                <div className="flex items-center gap-2 px-1 py-1 text-xs text-slate-400 font-medium">
                  <FolderIcon size={12} />
                  <span>{collection.name}</span>
                </div>
                <div className="pl-4 space-y-1">
                  {collection.requests.map(req => (
                    <div 
                      key={req.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, 'request', req.id, req.name)}
                      className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-md cursor-grab active:cursor-grabbing group transition-colors"
                    >
                      <span className={`text-[9px] font-bold px-1 rounded ${
                        req.method === 'GET' ? 'text-green-400' : 
                        req.method === 'POST' ? 'text-blue-400' : 'text-slate-400'
                      }`}>
                        {req.method}
                      </span>
                      <span className="text-xs text-slate-300 group-hover:text-white truncate">
                        {req.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
