import { useTabStore } from '../../stores/useTabStore';

export default function StatusBar() {
  const { activeTabId } = useTabStore();
  
  return (
    <footer className="status-bar idle">
      <div className="status-bar-left">
        <span>Ready</span>
      </div>
      <div className="status-bar-right">
        {activeTabId ? <span>Request context active</span> : null}
      </div>
    </footer>
  );
}
