import React, { useState, useEffect } from 'react';
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

  return (
    <>
      <style>{`
        .pulse-updater-overlay {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          background-color: rgba(9, 9, 11, 0.85);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          animation: pulseFadeIn 0.2s ease-out forwards;
        }
        .pulse-updater-card {
          width: 90%; max-width: 440px;
          background: linear-gradient(145deg, rgba(30,32,40,0.98), rgba(20,21,26,1));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-top: 1px solid rgba(59, 130, 246, 0.5);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7), 0 0 40px -10px rgba(59,130,246,0.2);
          border-radius: 16px; overflow: hidden;
          display: flex; flex-direction: column; font-family: sans-serif;
          animation: pulseScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pulseFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulseScaleUp { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .pulse-updater-header { display: flex; justify-content: space-between; padding: 20px 24px 0; }
        .pulse-updater-title { font-size: 13px; font-weight: 700; color: #60A5FA; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
        .pulse-updater-close { background: none; border: none; color: #6B7280; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .pulse-updater-close:hover { background: rgba(255,255,255,0.1); color: #FFF; }
        .pulse-updater-body { padding: 16px 24px 24px; display: flex; flex-direction: column; align-items: center; }
        .pulse-updater-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); color: #60A5FA; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .pulse-updater-headline { font-size: 22px; font-weight: 600; color: #FFFFFF; margin: 0 0 24px; text-align: center; }
        .pulse-updater-badge { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; box-sizing: border-box; }
        .pulse-updater-row { display: flex; justify-content: space-between; font-size: 13px; color: #9CA3AF; margin-bottom: 8px; }
        .pulse-updater-row:last-child { margin-bottom: 0; }
        .pulse-updater-row span:last-child { color: #E5E7EB; font-family: monospace; }
        .pulse-updater-row.new span:last-child { color: #60A5FA; font-weight: 600; }
        .pulse-updater-notes-box { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; font-size: 13px; color: #D1D5DB; max-height: 140px; overflow-y: auto; margin-bottom: 24px; box-sizing: border-box; text-align: left; }
        .pulse-updater-notes-title { font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin: 0 0 8px 0; }
        .pulse-updater-desc { font-size: 14px; color: #9CA3AF; text-align: center; line-height: 1.5; margin: 0 0 24px; }
        .pulse-updater-actions { display: flex; width: 100%; gap: 12px; }
        .pulse-updater-btn { flex: 1; height: 44px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; border: none; transition: 0.2s; }
        .pulse-updater-btn-sub { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #E5E7EB; }
        .pulse-updater-btn-sub:hover { background: rgba(255,255,255,0.1); color: #FFF; }
        .pulse-updater-btn-main { background: #2563EB; border: 1px solid #3B82F6; color: #FFF; box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
        .pulse-updater-btn-main:hover { background: #3B82F6; }
        .pulse-updater-error { width: 100%; padding: 12px; background: rgba(231, 76, 60, 0.15); border: 1px solid rgba(231, 76, 60, 0.2); border-radius: 8px; color: #f87171; font-size: 12px; line-height: 1.4; margin-bottom: 16px; word-break: break-all; box-sizing: border-box; }
      `}</style>
      <div className="pulse-updater-overlay" onClick={(e) => {
        if (e.target === e.currentTarget && !isInstalling) {
          onClose();
        }
      }}>
        <div className="pulse-updater-card">
          <div className="pulse-updater-header">
            <h2 className="pulse-updater-title">Update Available</h2>
            <button 
              onClick={onClose}
              disabled={isInstalling}
              className="pulse-updater-close"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="pulse-updater-body">
            <div className="pulse-updater-icon">
              <ArrowDownToLine size={28} />
            </div>
            
            <h3 className="pulse-updater-headline">
              Version {update?.version || 'Unknown'} is ready
            </h3>
            
            <div className="pulse-updater-badge">
              <div className="pulse-updater-row">
                <span>Current Version</span>
                <span>{currentVersion}</span>
              </div>
              <div className="pulse-updater-row new">
                <span>Available Version</span>
                <span>{update?.version || 'Unknown'}</span>
              </div>
            </div>
            
            {(update?.body || update?.notes) && (
              <div className="pulse-updater-notes-box">
                <h4 className="pulse-updater-notes-title">What's New</h4>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {update?.body || update?.notes}
                </div>
              </div>
            )}

            <p className="pulse-updater-desc">
              A new version of Pulse is available. Would you like to install it now? The application will restart automatically after the installation completes.
            </p>

            {error && (
              <div className="pulse-updater-error">
                {error}
              </div>
            )}

            <div className="pulse-updater-actions">
              <button
                onClick={onClose}
                disabled={isInstalling}
                className="pulse-updater-btn pulse-updater-btn-sub"
              >
                Later
              </button>
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="pulse-updater-btn pulse-updater-btn-main"
              >
                {isInstalling ? (
                  <>
                    <RefreshCw className="animate-spin" style={{ width: '14px', height: '14px', animation: 'spin 1.5s linear infinite' }} />
                    Installing...
                  </>
                ) : (
                  'Install Update'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


