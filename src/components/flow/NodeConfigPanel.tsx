import React, { useState } from 'react';
import { FlowNode, FlowNodeMapping } from '../../types';
import { useFlowStore } from '../../stores/useFlowStore';
import { X, Plus, Trash2, ArrowRight } from 'lucide-react';

interface NodeConfigPanelProps {
  nodeId: string;
  onClose: () => void;
}

export default function NodeConfigPanel({ nodeId, onClose }: NodeConfigPanelProps) {
  const { flows, activeFlowId, updateFlow } = useFlowStore();
  const flow = flows.find(f => f.id === activeFlowId);
  const node = flow?.nodes.find(n => n.id === nodeId);

  const [mappings, setMappings] = useState<FlowNodeMapping[]>(node?.data.mappings || []);
  const [delayMs, setDelayMs] = useState(node?.data.delayMs || 1000);

  const handleSave = () => {
    if (!activeFlowId || !node || !flow) return;
    updateFlow(activeFlowId, {
      nodes: flow.nodes.map(n => 
        n.id === nodeId ? { ...n, data: { ...n.data, mappings, delayMs } } : n
      )
    });
    onClose();
  };

  const addMapping = () => {
    setMappings([...mappings, { sourcePath: '', targetVar: '' }]);
  };

  const updateMapping = (index: number, updates: Partial<FlowNodeMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setMappings(newMappings);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  if (!node) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure Node</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Node Name</label>
          <input 
            type="text" 
            value={node.data.name}
            readOnly
            className="w-full bg-slate-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none"
          />
        </div>

        {node.type === 'delay' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delay (ms)</label>
            <input 
              type="number" 
              value={delayMs}
              onChange={(e) => setDelayMs(parseInt(e.target.value))}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 transition-all outline-none"
            />
          </div>
        )}

        {node.type === 'request' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Output Mappings</label>
              <button onClick={addMapping} className="p-1 hover:bg-blue-600/20 text-blue-400 rounded-md">
                <Plus size={14} />
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400">Map JSON response fields to flow variables.</p>

            <div className="space-y-3">
              {mappings.map((mapping, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/5 relative group">
                  <div className="flex items-center gap-2">
                    <input 
                      placeholder="e.g. body.token"
                      value={mapping.sourcePath}
                      onChange={(e) => updateMapping(idx, { sourcePath: e.target.value })}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white outline-none"
                    />
                    <ArrowRight size={12} className="text-slate-500" />
                    <input 
                      placeholder="var_name"
                      value={mapping.targetVar}
                      onChange={(e) => updateMapping(idx, { targetVar: e.target.value })}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => removeMapping(idx)}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-slate-800 text-slate-500 hover:text-red-400 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
              {mappings.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-lg text-slate-600 text-[10px]">
                  No mappings configured
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-all text-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
