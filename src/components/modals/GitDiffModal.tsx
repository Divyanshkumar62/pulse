import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Check, Undo } from 'lucide-react';
import { toast } from 'sonner';

interface DiffLine {
  type: 'added' | 'removed' | 'equal';
  content: string;
}

interface GitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspacePath: string;
  filePath: string;
  onDiscardSuccess?: () => void;
}

export default function GitDiffModal({ isOpen, onClose, workspacePath, filePath, onDiscardSuccess }: GitDiffModalProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && workspacePath && filePath) {
      loadDiff();
    }
  }, [isOpen, workspacePath, filePath]);

  const loadDiff = async () => {
    setIsLoading(true);
    try {
      const lines = await invoke<DiffLine[]>('get_git_diff', { path: workspacePath, filePath });
      setDiffLines(lines);
    } catch (e) {
      toast.error('Failed to load diff: ' + String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm(`Are you sure you want to discard all changes in ${filePath}? This cannot be undone.`)) {
      return;
    }

    try {
      await invoke('git_discard_changes', { path: workspacePath, filePath });
      toast.success('Changes discarded');
      onDiscardSuccess?.();
      onClose();
    } catch (e) {
      toast.error('Failed to discard changes: ' + String(e));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '80vw',
          maxWidth: '1000px',
          height: '80vh',
          backgroundColor: 'var(--bg-deep)',
          borderRadius: '12px',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Review Changes</h2>
            <code style={{ fontSize: '11px', color: 'var(--accent-primary)', background: 'rgba(37,99,235,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{filePath}</code>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleDiscard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Undo size={14} />
              Discard
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', background: '#0d1117', padding: '12px 0' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
              Calculating differences...
            </div>
          ) : diffLines.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
              No changes detected.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.6' }}>
              {diffLines.map((line, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    width: '100%',
                    background: line.type === 'added' ? 'rgba(46,160,67,0.15)' : line.type === 'removed' ? 'rgba(248,81,70,0.15)' : 'transparent',
                    borderLeft: `3px solid ${line.type === 'added' ? '#2ea043' : line.type === 'removed' ? '#f85149' : 'transparent'}`
                  }}
                >
                  <span style={{ width: '40px', textAlign: 'right', paddingRight: '12px', color: 'var(--text-tertiary)', userSelect: 'none', opacity: 0.5 }}>{idx + 1}</span>
                  <span style={{ width: '20px', textAlign: 'center', color: line.type === 'added' ? '#3fb950' : line.type === 'removed' ? '#f85149' : 'var(--text-tertiary)' }}>
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </span>
                  <pre style={{ margin: 0, padding: '0 12px', whiteSpace: 'pre-wrap', color: line.type === 'added' ? '#aff5b4' : line.type === 'removed' ? '#ffdcd7' : '#c9d1d9' }}>
                    {line.content || ' '}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
