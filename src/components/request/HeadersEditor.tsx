import KeyValueTable from './KeyValueTable';
import { useTabStore } from '../../stores/useTabStore';

export default function HeadersEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const headers = activeTab.request.headers || [];

  return (
    <div className="headers-editor" style={{ height: '100%', overflowY: 'auto' }}>
      <KeyValueTable 
        items={headers} 
        onChange={(data) => updateActiveTabRequest({ headers: data })} 
        keyPlaceholder="Header Name"
        valuePlaceholder="Value"
      />
    </div>
  );
}
