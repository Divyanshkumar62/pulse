import React, { useState } from 'react';
import { gitCommit, gitPush, gitRebaseContinue, gitRebaseAbort, GitStatus } from '../../hooks/useTauri';
import { Send, CheckCircle, X, Database, FileText, Eye, AlertTriangle, Play, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import GitDiffModal from './GitDiffModal';

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: GitStatus | null;
  workspacePath: string;
  refreshStatus?: () => void;
}

export default function CommitModal({ isOpen, onClose, status, workspacePath, refreshStatus }: CommitModalProps) {
  const [message, setMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [diffFile, setDiffFile] = useState<{ path: string, mode: 'view' | 'resolve' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSyncing) return;

    setIsSyncing(true);
    try {
      await gitCommit(workspacePath, message.trim());
      try {
        const pushed = await gitPush(workspacePath);
        if (pushed) {
          toast.success('Changes committed and pushed successfully');
        } else {
          toast.success('Changes committed locally (no remote configured)');
        }
      } catch (pushErr: any) {
        toast.error('Commit succeeded but push failed: ' + String(pushErr?.message || pushErr));
      }
      setSynced(true);
      setTimeout(() => {
        onClose();
        setSynced(false);
        setMessage('');
        refreshStatus?.();
      }, 1500);
    } catch (e: any) {
      toast.error('Sync failed: ' + String(e?.message || e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRebaseContinue = async () => {
    if (status?.conflicted.length) {
        toast.error('Please resolve all conflicts before continuing');
        return;
    }
    setIsSyncing(true);
    try {
        await gitRebaseContinue(workspacePath);
        toast.success('Rebase continued successfully');
        refreshStatus?.();
    } catch (e) {
        toast.error('Failed to continue rebase: ' + String(e));
    } finally {
        setIsSyncing(false);
    }
  };

  const handleRebaseAbort = async () => {
    setIsSyncing(true);
    try {
        await gitRebaseAbort(workspacePath);
        toast.success('Rebase aborted');
        refreshStatus?.();
    } catch (e) {
        toast.error('Failed to abort rebase: ' + String(e));
    } finally {
        setIsSyncing(false);
    }
  };

  const isConflicted = !!status?.conflicted.length;
  const isRebasing = !!status?.is_rebasing;

  return createPortal(
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
      onClick={onClose}
    >
      <div
        style={{
          width: '480px',
          backgroundColor: 'var(--bg-deep)',
          borderRadius: '12px',
          border: `1px solid ${isConflicted ? '#ef4444' : 'var(--border-default)'}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isConflicted ? <AlertTriangle size={18} color="#ef4444" /> : <Database size={18} color="var(--accent-primary)" />}
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {isRebasing ? 'Resolve Rebase Conflicts' : 'Synchronize Workspace'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '4px', lineHeight: 1 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRebasing && !isConflicted && (
              <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} />
                  All conflicts resolved. You can now continue the rebase.
              </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isConflicted ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>{status?.modified?.length || 0}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>MODIFIED</span>
            </div>
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>{status?.untracked?.length || 0}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>NEW FILES</span>
            </div>
            {isConflicted && (
                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>{status?.conflicted?.length || 0}</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444', letterSpacing: '0.1em' }}>CONFLICTS</span>
                </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>CHANGELOG PREVIEW</div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {status?.conflicted.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '6px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={12} />
                    <span style={{ fontWeight: 600 }}>{f}</span>
                  </div>
                  <button 
                    onClick={() => setDiffFile({ path: f, mode: 'resolve' })}
                    style={{ background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}
                  >
                    RESOLVE
                  </button>
                </div>
              ))}
              {status?.modified.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={12} />
                    <span>{f}</span>
                  </div>
                  <button 
                    onClick={() => setDiffFile({ path: f, mode: 'view' })}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    title="View Diff"
                  >
                    <Eye size={12} />
                  </button>
                </div>
              ))}
              {status?.untracked.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                  <FileText size={12} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {isRebasing ? (
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                    onClick={handleRebaseAbort}
                    disabled={isSyncing}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Ban size={16} />
                    Abort Rebase
                </button>
                <button
                    onClick={handleRebaseContinue}
                    disabled={isSyncing || isConflicted}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: isConflicted ? 'var(--bg-surface)' : '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isConflicted ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: isConflicted ? 0.5 : 1
                    }}
                >
                    <Play size={16} />
                    Continue Rebase
                </button>
              </div>
          ) : (
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>COMMIT MESSAGE</label>
                <textarea
                    style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                    }}
                    placeholder="Describe your changes"
                    required
                    autoFocus
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                    type="button"
                    onClick={onClose}
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
                    type="submit"
                    disabled={isSyncing || !message.trim()}
                    style={{
                    flex: 1,
                    padding: '10px 20px',
                    background: synced ? '#10b981' : 'var(--accent-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSyncing || !message.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSyncing || !message.trim() ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                    }}
                >
                    {isSyncing ? (
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    ) : synced ? (
                    <CheckCircle size={18} />
                    ) : (
                    <>
                        <span>Commit & Push</span>
                        <Send size={16} />
                    </>
                    )}
                </button>
                </div>
            </form>
          )}
        </div>
      </div>

      <GitDiffModal 
        isOpen={!!diffFile} 
        onClose={() => setDiffFile(null)} 
        workspacePath={workspacePath} 
        filePath={diffFile?.path || ''}
        mode={diffFile?.mode}
        onDiscardSuccess={refreshStatus}
      />
    </div>,
    document.body
  );
}
