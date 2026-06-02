import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Check, Undo, ArrowLeft, ArrowRight, ArrowDown, Columns, LayoutList, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { resolveGitConflict } from '../../hooks/useTauri';
import ConflictResolver from './ConflictResolver';

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
  mode?: 'view' | 'resolve';
}

export default function GitDiffModal({ isOpen, onClose, workspacePath, filePath, onDiscardSuccess, mode = 'view' }: GitDiffModalProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isSideBySide, setIsSideBySide] = useState(true);

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

  const handleResolve = async (strategy: 'ours' | 'theirs') => {
    setIsResolving(true);
    try {
      await resolveGitConflict(workspacePath, filePath, strategy);
      toast.success(`Resolved using ${strategy === 'ours' ? 'current' : 'incoming'} version`);
      onDiscardSuccess?.();
      onClose();
    } catch (e) {
      toast.error('Failed to resolve conflict: ' + String(e));
    } finally {
      setIsResolving(false);
    }
  };

  if (!isOpen) return null;

  // Split lines for side-by-side view
  const leftLines: (DiffLine | null)[] = [];
  const rightLines: (DiffLine | null)[] = [];

  if (isSideBySide) {
    let i = 0;
    while (i < diffLines.length) {
      const current = diffLines[i];
      if (current.type === 'equal') {
        leftLines.push(current);
        rightLines.push(current);
        i++;
      } else if (current.type === 'removed') {
        // Look ahead for matching added line to align them
        if (i + 1 < diffLines.length && diffLines[i + 1].type === 'added') {
          leftLines.push(current);
          rightLines.push(diffLines[i + 1]);
          i += 2;
        } else {
          leftLines.push(current);
          rightLines.push(null);
          i++;
        }
      } else if (current.type === 'added') {
        leftLines.push(null);
        rightLines.push(current);
        i++;
      }
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: '1200px',
          height: '85vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {mode === 'resolve' ? 'Resolve Conflict' : 'Review Changes'}
              </h2>
              <code style={{ fontSize: '11px', color: 'var(--accent-primary)', background: 'rgba(37,99,235,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{filePath}</code>
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)', padding: '2px' }}>
              <button 
                onClick={() => setIsSideBySide(false)}
                style={{ 
                  padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  background: !isSideBySide ? 'var(--bg-elevated)' : 'transparent',
                  color: !isSideBySide ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600
                }}
              >
                <LayoutList size={14} />
                Unified
              </button>
              <button 
                onClick={() => setIsSideBySide(true)}
                style={{ 
                  padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  background: isSideBySide ? 'var(--bg-elevated)' : 'transparent',
                  color: isSideBySide ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600
                }}
              >
                <Columns size={14} />
                Split
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {mode === 'resolve' ? (
              <>
                <button
                  disabled={isResolving}
                  onClick={() => handleResolve('theirs')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '6px',
                    color: '#10b981',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowDown size={14} />
                  Accept Incoming
                </button>
                <button
                  disabled={isResolving}
                  onClick={() => handleResolve('ours')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(37,99,235,0.1)',
                    border: '1px solid rgba(37,99,235,0.2)',
                    borderRadius: '6px',
                    color: 'var(--accent-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Check size={14} />
                  Keep Current
                </button>
              </>
            ) : (
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
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', background: '#0d1117' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
              Calculating differences...
            </div>
          ) : diffLines.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
              No changes detected.
            </div>
          ) : isSideBySide ? (
            <div style={{ display: 'flex', minWidth: '100%', minHeight: '100%' }}>
              {/* Left Pane (Original) */}
              <div style={{ flex: 1, borderRight: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>ORIGINAL</div>
                <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6', padding: '12px 0' }}>
                  {leftLines.map((line, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        width: '100%',
                        background: line?.type === 'removed' ? 'rgba(248,81,70,0.15)' : 'transparent',
                        opacity: line ? 1 : 0.2,
                        minHeight: '1.6em'
                      }}
                    >
                      <span style={{ width: '35px', textAlign: 'right', paddingRight: '8px', color: 'var(--text-tertiary)', userSelect: 'none', opacity: 0.4 }}>{line ? idx + 1 : ''}</span>
                      <pre style={{ margin: 0, padding: '0 8px', whiteSpace: 'pre-wrap', color: line?.type === 'removed' ? '#ffdcd7' : '#c9d1d9', flex: 1 }}>
                        {line?.content || (line === null ? '' : ' ')}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Pane (Modified) */}
              <div style={{ flex: 1 }}>
                <div style={{ padding: '8px 16px', background: 'rgba(37,99,235,0.05)', fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>MODIFIED</div>
                <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6', padding: '12px 0' }}>
                  {rightLines.map((line, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        width: '100%',
                        background: line?.type === 'added' ? 'rgba(46,160,67,0.15)' : 'transparent',
                        opacity: line ? 1 : 0.2,
                        minHeight: '1.6em'
                      }}
                    >
                      <span style={{ width: '35px', textAlign: 'right', paddingRight: '8px', color: 'var(--text-tertiary)', userSelect: 'none', opacity: 0.4 }}>{line ? idx + 1 : ''}</span>
                      <pre style={{ margin: 0, padding: '0 8px', whiteSpace: 'pre-wrap', color: line?.type === 'added' ? '#aff5b4' : '#c9d1d9', flex: 1 }}>
                        {line?.content || (line === null ? '' : ' ')}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.6', padding: '12px 0' }}>
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
    </div>,
    document.body
  );
}
