import KeyValueTable from './KeyValueTable';
import { useTabStore } from '../../stores/useTabStore';

export default function ParamsEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const params = activeTab.request.params || [];

  return (
    <div className="params-editor" style={{ height: '100%', overflowY: 'auto' }}>
      <KeyValueTable 
        items={params} 
        onChange={(data) => updateActiveTabRequest({ params: data })} 
        keyPlaceholder="Query Parameter"
        valuePlaceholder="Value"
      />
    </div>
  );
}
