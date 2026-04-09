import React from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { v4 as uuidv4 } from 'uuid';

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '280px',
    height: '100%',
    backgroundColor: '#0b0f16',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
    userSelect: 'none',
    zIndex: 10,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  categoryGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  categoryHeader: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 'bold',
    marginBottom: '8px',
    paddingLeft: '8px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '10px 12px',
    width: '100%',
    borderRadius: '8px',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: '#9ca3af',
  },
  buttonActive: {
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
  },
  buttonIcon: {
    width: '16px',
    height: '16px',
    flexShrink: 0,
  },
  buttonText: {
    fontSize: '14px',
    fontWeight: 500,
  },
  methodBadge: {
    fontSize: '9px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid',
    flexShrink: 0,
  },
  getBadge: {
    color: '#4ade80',
    borderColor: 'rgba(74,222,128,0.3)',
  },
  postBadge: {
    color: '#fbbf24',
    borderColor: 'rgba(251,191,36,0.3)',
  },
  requestText: {
    fontSize: '14px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  newFlowBtn: {
    width: '100%',
    backgroundColor: '#2563eb',
    color: 'white',
    fontWeight: 500,
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.2s',
  },
};

export default function FlowSidebar() {
  const { flows, activeFlowId, addFlow, setActiveFlow } = useFlowStore();

  const handleCreateFlow = () => {
    const newFlow = {
      id: uuidv4(),
      name: 'Untitled Workflow',
      nodes: [],
      edges: [],
      workspaceId: 'default'
    };
    addFlow(newFlow);
    setActiveFlow(newFlow.id);
  };

  return (
    <div style={styles.container}>
      <button 
        onClick={handleCreateFlow}
        style={styles.newFlowBtn}
      >
        + New Flow
      </button>

      <div style={styles.scrollArea}>
        <div style={styles.categoryGroup}>
          <span style={styles.categoryHeader}>Library</span>
          <button style={{...styles.button, ...styles.buttonActive}}>
            <svg style={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span style={styles.buttonText}>Flows</span>
          </button>
          <button style={styles.button}>
            <svg style={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span style={styles.buttonText}>Collections</span>
          </button>
        </div>

        <div style={styles.categoryGroup}>
          <span style={styles.categoryHeader}>API Requests</span>
          <button style={styles.button}>
            <span style={{...styles.methodBadge, ...styles.getBadge}}>GET</span>
            <span style={styles.requestText}>collect1</span>
          </button>
          <button style={styles.button}>
            <span style={{...styles.methodBadge, ...styles.postBadge}}>POST</span>
            <span style={styles.requestText}>POSTreq1</span>
          </button>
        </div>
      </div>
    </div>
  );
}