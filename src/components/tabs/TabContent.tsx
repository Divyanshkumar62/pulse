import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';
import RequestBuilder from '../request/RequestBuilder';
import ResponseViewer from '../response/ResponseViewer';
import { useResizable } from '../../hooks/useResizable';
import '../../styles/components/tab-content.css';

export default function TabContent() {
  const { activeTabId } = useTabStore();
  const { responsePosition, responseHeight, setResponseHeight, responseWidth, setResponseWidth } = useAppStore();

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

  if (!activeTabId) {
    return (
      <div className="tab-content-empty">
        <div className="empty-state">
          <div className="pulse-echo"></div>
          <h2 className="text-h2">Pulse IDE</h2>
          <p className="text-body">Create or select a request to begin your adventure.</p>
        </div>
      </div>
    );
  }

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
