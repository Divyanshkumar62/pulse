import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';
import RequestBuilder from '../request/RequestBuilder';
import ResponseViewer from '../response/ResponseViewer';
import CollectionRunner from '../collections/CollectionRunner';
import CollectionDocs from '../collections/CollectionDocs';
import WelcomeScreen from '../layout/WelcomeScreen';
import { useResizable } from '../../hooks/useResizable';
import '../../styles/components/tab-content.css';

export default function TabContent() {
  const { tabs, activeTabId, closeTab } = useTabStore();
  const { responsePosition, responseHeight, setResponseHeight, responseWidth, setResponseWidth } = useAppStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const isBottom = responsePosition === 'bottom';
  
  // Resizable height for bottom position
  const { height: resHeight, isDragging: isDraggingRow, startDrag: startDragRow } = useResizable(
    responseHeight || 400, 
    200, 
    800, 
    setResponseHeight,
    'y'
  );

  // Resizable width for right position
  const { width: resWidth, isDragging: isDraggingCol, startDrag: startDragCol } = useResizable(
    responseWidth || 500, 
    300, 
    1000, 
    setResponseWidth,
    'x'
  );

  if (!activeTab) {
    return (
      <div className="tab-content-empty">
        <WelcomeScreen />
      </div>
    );
  }

  // Handle special tab types
  if (activeTab.type === 'runner' && activeTab.collection) {
    return (
      <div style={{ width: '100%', height: '100%', background: 'var(--bg-deep)' }}>
        <CollectionRunner 
          collection={activeTab.collection} 
          onClose={() => closeTab(activeTab.id)} 
        />
      </div>
    );
  }

  if (activeTab.type === 'docs' && activeTab.collection) {
    return (
      <div style={{ width: '100%', height: '100%', background: 'var(--bg-deep)' }}>
        <CollectionDocs 
          collection={activeTab.collection} 
          onClose={() => closeTab(activeTab.id)} 
        />
      </div>
    );
  }

  // Default: Request Builder
  return (
    <div className={`tab-content-layout ${isBottom ? 'dock-bottom' : 'dock-right'}`}>
      <div className="request-pane">
        <RequestBuilder />
      </div>
      
      <div 
        className={`pane-resizer ${isDraggingRow || isDraggingCol ? 'dragging' : ''}`}
        onMouseDown={isBottom ? startDragRow : startDragCol}
      />
      
      <div 
        className="response-pane" 
        style={isBottom ? { height: `${resHeight}px` } : { width: `${resWidth}px` }}
      >
        <ResponseViewer />
      </div>
    </div>
  );
}
