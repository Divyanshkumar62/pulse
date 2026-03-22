import { useTabStore } from '../../stores/useTabStore';
import KeyValueTable from './KeyValueTable';

export default function ParamsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const params = activeTab?.request.params || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <KeyValueTable 
        items={params} 
        onChange={(newParams) => updateActiveTabRequest({ params: newParams })} 
        keyPlaceholder="Query Param" 
        valuePlaceholder="Value" 
      />
    </div>
  );
}
