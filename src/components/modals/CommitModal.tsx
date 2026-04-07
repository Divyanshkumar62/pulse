import React, { useState } from 'react';
import { gitCommit, gitPush } from '../../hooks/useTauri';
import { Send, CheckCircle, X, Database, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: { modified: string[]; untracked: string[] } | null;
  workspacePath: string;
}

export default function CommitModal({ isOpen, onClose, status, workspacePath }: CommitModalProps) {
  const [message, setMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

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
      }, 1500);
    } catch (e: any) {
      toast.error('Sync failed: ' + String(e?.message || e));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
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
          width: '450px',
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
            <Database size={18} color="var(--accent-primary)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Synchronize Workspace</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '4px', lineHeight: 1 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>{status?.modified?.length || 0}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>MODIFIED</span>
            </div>
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>{status?.untracked?.length || 0}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>NEW FILES</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>CHANGELOG PREVIEW</div>
            <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {status?.modified.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-primary)' }}>
                  <FileText size={12} />
                  <span>{f}</span>
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
        </div>
      </div>
    </div>
  );
}
