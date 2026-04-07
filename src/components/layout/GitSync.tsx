import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useAppStore } from '../../stores/useAppStore';
import { getGitStatus, gitPull, GitStatus } from '../../hooks/useTauri';
import { GitBranch, RefreshCw, CheckCircle, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import '../../styles/components/git-sync.css';

export default function GitSync() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { setCommitModalOpen } = useAppStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const refreshStatus = useCallback(async () => {
    if (activeWorkspace?.path) {
      try {
        const s = await getGitStatus(activeWorkspace.path);
        setStatus(s);
      } catch {
        setStatus(null);
      }
    } else {
      setStatus(null);
    }
  }, [activeWorkspace?.path]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 10000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handlePull = async () => {
    if (!activeWorkspace?.path) return;
    setIsSyncing(true);
    try {
      await gitPull(activeWorkspace.path);
      await refreshStatus();
      toast.success('Pulled latest changes from remote');
    } catch (e: any) {
      const errMsg = String(e?.message || e);
      if (errMsg.includes('No remote configured')) {
        toast.info('No remote configured — add one with: git remote add origin <url>');
      } else {
        toast.error('Pull failed: ' + errMsg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const openCommitModal = async () => {
    const freshStatus = await getGitStatus(activeWorkspace?.path || '');
    setCommitModalOpen(true, freshStatus, activeWorkspace?.path || '');
  };

  if (!activeWorkspace?.path) return null;

  return (
    <div className="git-sync-widget">
      <div className="git-branch-info">
        <GitBranch size={14} className="icon-blue" />
        <span className="branch-name">{status?.branch || 'main'}</span>
      </div>

      <div className="git-status-actions">
        {status?.has_changes ? (
          <button 
            className="git-btn git-btn-dirty" 
            onClick={openCommitModal}
            title={`${status.modified.length + status.untracked.length} changes to sync`}
          >
            <div className="status-dot pulsing" />
            <span>Sync Changes</span>
            <ArrowUp size={14} />
          </button>
        ) : (
          <div className="git-status-clean" title="All changes synced">
            <CheckCircle size={14} className="icon-green" />
            <span>Synced</span>
          </div>
        )}

        <button 
          className={`git-btn-icon ${isSyncing ? 'spinning' : ''}`} 
          onClick={handlePull}
          title="Pull from remote"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
}
