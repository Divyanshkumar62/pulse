import { useTabStore } from '../../stores/useTabStore';
import RequestBuilder from '../request/RequestBuilder';
import ResponseViewer from '../response/ResponseViewer';

export default function TabContent() {
  const { activeTabId } = useTabStore();

  if (!activeTabId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 className="text-h2" style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>Welcome to Pulse</h2>
          <p className="text-body">Select a request from the sidebar or click + to create a new tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <RequestBuilder />
      </div>
      <div style={{ height: '1px', backgroundColor: 'var(--border-default)', cursor: 'row-resize' }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ResponseViewer />
      </div>
    </div>
  );
}
