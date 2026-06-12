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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f111a] border border-[#1e2235] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2235]">
          <h2 className="text-lg font-semibold text-white">Update Available</h2>
          <button 
            onClick={onClose}
            disabled={isInstalling}
            className="p-1 text-gray-400 transition-colors rounded-lg hover:text-white hover:bg-white/5 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 text-blue-400">
            <ArrowDownToLine className="w-8 h-8" />
          </div>
          
          <h3 className="mb-2 text-xl font-medium text-center text-white">
            Version {update?.version || 'Unknown'} is ready
          </h3>
          
          <div className="mb-4 p-3 bg-white/5 border border-[#1e2235] rounded-lg text-sm text-center text-gray-300 space-y-1">
            <div>Current Version: <span className="font-semibold text-white">{currentVersion}</span></div>
            <div>Available Version: <span className="font-semibold text-blue-400">{update?.version || 'Unknown'}</span></div>
          </div>
          
          <p className="mb-6 text-sm text-center text-gray-400">
            A new version of Pulse is available. Would you like to install it now? The application will restart automatically after the installation completes.
          </p>

          {error && (
            <div className="p-3 mb-6 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isInstalling}
              className="flex-1 px-4 py-2 text-sm font-medium text-white transition-colors border rounded-lg border-[#1e2235] hover:bg-[#1e2235] disabled:opacity-50"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isInstalling ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
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
  );
}
