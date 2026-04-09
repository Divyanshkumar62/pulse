import React from 'react';
import { useFlowStore } from '../../stores/useFlowStore';
import { v4 as uuidv4 } from 'uuid';

// Using inline styles instead of Tailwind CSS (Tailwind not configured in this project)
const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '280px',
    height: '100%',
    backgroundColor: '#0f111a',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
    userSelect: 'none',
    zIndex: 10,
  },
  brandHeader: {
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  brandIcon: {
    width: '20px',
    height: '20px',
    color: '#3b82f6',
  },
  brandName: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  brandSubtitle: {
    fontSize: '10px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    fontWeight: 'bold',
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
  footer: {
    marginTop: 'auto',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  newFlowBtn: {
    width: '100%',
    backgroundColor: '#2563eb',
    color: 'white',
    fontWeight: 500,
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '16px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.2s',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '8px',
  },
  avatarWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: '#374151',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    fontSize: '14px',
    color: 'white',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '12px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  settingsBtn: {
    color: '#9ca3af',
    cursor: 'pointer',
    flexShrink: 0,
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    padding: 0,
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
      {/* SECTION 1: Brand Header */}
      <div style={styles.brandHeader}>
        <div style={styles.brandRow}>
          <svg style={styles.brandIcon} fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span style={styles.brandName}>Pulse</span>
        </div>
        <span style={styles.brandSubtitle}>API Flow Builder</span>
      </div>

      {/* SECTION 2: Scrollable List Area */}
      <div style={styles.scrollArea}>
        
        {/* Library Group */}
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

        {/* API Requests Group */}
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

      {/* SECTION 3: Footer */}
      <div style={styles.footer}>
        <button 
          onClick={handleCreateFlow}
          style={styles.newFlowBtn}
        >
          + New Flow
        </button>
        
        <div style={styles.userRow}>
          <div style={styles.avatarWrapper}>
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" 
              alt="Avatar" 
              style={styles.avatarImg} 
            />
          </div>
          <div style={styles.userInfo}>
            <span style={styles.userName}>Alex Chen</span>
            <span style={styles.userRole}>Pro Developer</span>
          </div>
          <button style={styles.settingsBtn}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}