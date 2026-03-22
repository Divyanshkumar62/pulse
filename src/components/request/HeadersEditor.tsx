import { useTabStore } from '../../stores/useTabStore';
import KeyValueTable from './KeyValueTable';

export default function HeadersEditor() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const headers = activeTab?.request.headers || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <KeyValueTable 
        items={headers} 
        onChange={(newHeaders) => updateActiveTabRequest({ headers: newHeaders })} 
        keyPlaceholder="Header" 
        valuePlaceholder="Value" 
      />
    </div>
  );
}
