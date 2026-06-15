import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { ArrowDownToLine, RefreshCw, X } from 'lucide-react';

interface UpdateModalProps {
  update: any;
  onClose: () => void;
}

export function UpdateModal({ update, onClose }: UpdateModalProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('Loading...');

  const [hoveredClose, setHoveredClose] = useState(false);
  const [hoveredSub, setHoveredSub] = useState(false);
  const [hoveredMain, setHoveredMain] = useState(false);

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => setCurrentVersion('Unknown'));
  }, []);

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      setError(null);
      console.log('[Pulse] Initiating update download and installation via downloadAndInstall()...');
      await update.downloadAndInstall();
      console.log('[Pulse] downloadAndInstall() completed successfully. Initiating relaunch()...');
      await relaunch();
    } catch (err) {
      console.error('[Pulse] Failed to install update:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to install update: ${errMsg}`);
      setIsInstalling(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  };

  const cardStyle: React.CSSProperties = {
    width: '90%',
    maxWidth: '440px',
    background: 'linear-gradient(145deg, rgba(30,32,40,0.98), rgba(20,21,26,1))',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderTop: '1px solid rgba(59, 130, 246, 0.5)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 40px -10px rgba(59,130,246,0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 700,
    color: '#60A5FA',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
  };

  const closeStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: hoveredClose ? '#FFF' : '#6B7280',
    backgroundColor: hoveredClose ? 'rgba(255,255,255,0.1)' : 'transparent',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: '0.2s',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '16px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const iconStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.3)',
    color: '#60A5FA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  };

  const headlineStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 600,
    color: '#FFFFFF',
    margin: '0 0 24px',
    textAlign: 'center',
  };

  const badgeStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    boxSizing: 'border-box',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#9CA3AF',
    marginBottom: '8px',
  };

  const lastRowStyle: React.CSSProperties = {
    ...rowStyle,
    marginBottom: 0,
  };

  const valStyle: React.CSSProperties = {
    color: '#E5E7EB',
    fontFamily: 'monospace',
  };

  const valNewStyle: React.CSSProperties = {
    color: '#60A5FA',
    fontFamily: 'monospace',
    fontWeight: 600,
  };

  const notesBoxStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px',
    color: '#D1D5DB',
    maxHeight: '140px',
    overflowY: 'auto',
    marginBottom: '24px',
    boxSizing: 'border-box',
    textAlign: 'left',
  };

  const notesTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
  };

  const descStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 1.5,
    margin: '0 0 24px',
  };

  const errorStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    background: 'rgba(231, 76, 60, 0.15)',
    border: '1px solid rgba(231, 76, 60, 0.2)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '12px',
    lineHeight: 1.4,
    marginBottom: '16px',
    wordBreak: 'break-all',
    boxSizing: 'border-box',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    gap: '12px',
  };

  const btnBaseStyle: React.CSSProperties = {
    flex: 1,
    height: '44px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    transition: '0.2s',
  };

  const btnSubStyle: React.CSSProperties = {
    ...btnBaseStyle,
    background: hoveredSub ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: hoveredSub ? '#FFF' : '#E5E7EB',
  };

  const btnMainStyle: React.CSSProperties = {
    ...btnBaseStyle,
    background: hoveredMain ? '#3B82F6' : '#2563EB',
    border: '1px solid #3B82F6',
    color: '#FFF',
    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
  };

  return createPortal(
    <div 
      style={overlayStyle} 
      onClick={(e) => {
        if (e.target === e.currentTarget && !isInstalling) {
          onClose();
        }
      }}
    >
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Update Available</h2>
          <button 
            onClick={onClose}
            disabled={isInstalling}
            style={closeStyle}
            onMouseEnter={() => setHoveredClose(true)}
            onMouseLeave={() => setHoveredClose(false)}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        
        <div style={bodyStyle}>
          <div style={iconStyle}>
            <ArrowDownToLine size={28} />
          </div>
          
          <h3 style={headlineStyle}>
            Version {update?.version || 'Unknown'} is ready
          </h3>
          
          <div style={badgeStyle}>
            <div style={rowStyle}>
              <span>Current Version</span>
              <span style={valStyle}>{currentVersion}</span>
            </div>
            <div style={lastRowStyle}>
              <span>Available Version</span>
              <span style={valNewStyle}>{update?.version || 'Unknown'}</span>
            </div>
          </div>
          
          {(update?.body || update?.notes) && (
            <div style={notesBoxStyle}>
              <h4 style={notesTitleStyle}>What's New</h4>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {update?.body || update?.notes}
              </div>
            </div>
          )}

          <p style={descStyle}>
            A new version of Pulse is available. Would you like to install it now? The application will restart automatically after the installation completes.
          </p>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <div style={actionsStyle}>
            <button
              onClick={onClose}
              disabled={isInstalling}
              style={btnSubStyle}
              onMouseEnter={() => setHoveredSub(true)}
              onMouseLeave={() => setHoveredSub(false)}
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              style={btnMainStyle}
              onMouseEnter={() => setHoveredMain(true)}
              onMouseLeave={() => setHoveredMain(false)}
            >
              {isInstalling ? (
                <>
                  <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1.5s linear infinite', marginRight: '8px' }} />
                  Installing...
                </>
              ) : (
                'Install Update'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
