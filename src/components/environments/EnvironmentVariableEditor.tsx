import { useEnvStore } from '../../stores/useEnvStore';
import { useAppStore } from '../../stores/useAppStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { Request } from '../../types';
import KeyValueTable from '../request/KeyValueTable';
import '../../styles/components/environments.css';
import { useMemo } from 'react';

export default function EnvironmentVariableEditor() {
  const { environments, updateEnvironment } = useEnvStore();
  const { selectedEnvironmentId, setSelectedEnvironmentId } = useAppStore();
  const { collections } = useCollectionStore();

  const selectedEnv = environments.find(e => e.id === selectedEnvironmentId);

  const variableUsages = useMemo(() => {
    if (!selectedEnv) return {};
    
    const usages: Record<string, number> = {};
    selectedEnv.variables.forEach(v => {
       if (v.key) usages[v.key] = 0;
    });
    
    const allRequests: Request[] = [];
    const extract = (items: any[]) => {
       items.forEach(item => {
          if (item.requests) allRequests.push(...item.requests);
          if (item.folders) extract(item.folders);
       });
    };
    extract(collections);
    
    allRequests.forEach(req => {
       const reqStr = JSON.stringify(req);
       Object.keys(usages).forEach(key => {
          if (reqStr.includes(`{{${key}}}`)) {
             usages[key]++;
          }
       });
    });
    
    return usages;
  }, [selectedEnv, collections]);

  if (!selectedEnv) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <p>No environment selected</p>
        <p style={{ fontSize: '13px', marginTop: '8px' }}>Select an environment from the sidebar to edit its variables</p>
      </div>
    );
  }

  const handleVariablesChange = (newVars: any[]) => {
    // Filter out the last empty row before saving to store if it has no data
    const cleanedVars = newVars.filter(v => v.key || v.value);
    updateEnvironment(selectedEnv.id, { variables: cleanedVars });
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <button 
          onClick={() => setSelectedEnvironmentId(null)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <input
          value={selectedEnv.name}
          onChange={(e) => updateEnvironment(selectedEnv.id, { name: e.target.value })}
          className="mono"
          style={{ 
            background: 'transparent', 
            border: 'none', 
            fontSize: '18px', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            outline: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            width: '100%'
          }}
          placeholder="Environment Name"
        />
      </div>

      <div className="editor-card">
        <p className="editor-help">
          Environment variables override Global variables. Use {'{{variable_name}}'} syntax in your requests.
        </p>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <KeyValueTable 
            items={selectedEnv.variables}
            onChange={handleVariablesChange}
            keyPlaceholder="Variable Name"
            valuePlaceholder="Value"
            usages={variableUsages}
          />
        </div>
      </div>
    </div>
  );
}
