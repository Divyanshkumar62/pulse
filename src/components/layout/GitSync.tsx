import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useAppStore } from '../../stores/useAppStore';
import { getGitStatus, gitPull, gitAddRemote, GitStatus } from '../../hooks/useTauri';
import { GitBranch, RefreshCw, CheckCircle, ArrowUp, Settings, X, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import '../../styles/components/git-sync.css';

export default function GitSync() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { setCommitModalOpen } = useAppStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isSettingRemote, setIsSettingRemote] = useState(false);
  
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
      if (errMsg.includes('No remote configured') || errMsg.includes('Remote') || errMsg.includes('origin')) {
        setShowRemoteModal(true);
      } else {
        toast.error('Pull failed: ' + errMsg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSetRemote = async () => {
    if (!activeWorkspace?.path || !remoteUrl.trim()) return;
    setIsSettingRemote(true);
    try {
      await gitAddRemote(activeWorkspace.path, 'origin', remoteUrl.trim());
      toast.success('Remote configured successfully');
      setShowRemoteModal(false);
      setRemoteUrl('');
      await refreshStatus();
    } catch (e: any) {
      toast.error('Failed to set remote: ' + String(e?.message || e));
    } finally {
      setIsSettingRemote(false);
    }
  };

  const openCommitModal = async () => {
    const freshStatus = await getGitStatus(activeWorkspace?.path || '');
    setCommitModalOpen(true, freshStatus, activeWorkspace?.path || '');
  };

  if (!activeWorkspace?.path) return null;

  return (
    <>
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

          <button 
            className="git-btn-icon" 
            onClick={() => setShowRemoteModal(true)}
            title="Configure Remote"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {showRemoteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowRemoteModal(false)}
        >
          <div
            style={{
              width: '420px',
              backgroundColor: 'var(--bg-deep)',
              borderRadius: '12px',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link2 size={18} color="var(--accent-primary)" />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Configure Remote</h2>
              </div>
              <button
                onClick={() => setShowRemoteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '4px', lineHeight: 1 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Remote URL
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/username/repo.git"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Enter your GitHub/GitLab repository URL
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowRemoteModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetRemote}
                  disabled={!remoteUrl.trim() || isSettingRemote}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: !remoteUrl.trim() || isSettingRemote ? 'not-allowed' : 'pointer',
                    opacity: !remoteUrl.trim() || isSettingRemote ? 0.5 : 1
                  }}
                >
                  {isSettingRemote ? 'Setting...' : 'Save Remote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}