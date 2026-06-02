import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ArrowLeft, ArrowRight, Save, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface ConflictResolverProps {
  isOpen: boolean;
  onClose: () => void;
  workspacePath: string;
  conflictedFiles: string[];
  onResolveSuccess: () => void;
}

export default function ConflictResolver({ isOpen, onClose, workspacePath, conflictedFiles, onResolveSuccess }: ConflictResolverProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFileContent, setCurrentFileContent] = useState({ ours: '', theirs: '', base: '' });
  const [mergedContent, setMergedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentFile = conflictedFiles[currentIndex];

  useEffect(() => {
    if (isOpen && currentFile) {
      loadFileData();
    }
  }, [isOpen, currentFile]);

  const loadFileData = async () => {
    setIsLoading(true);
    try {
      // In a real Git conflict, we'd use git show :1:file, :2:file, :3:file
      // For this implementation, we'll use the checkouts we already have
      const ours = await invoke<string>('read_conflicted_file', { path: workspacePath, filePath: currentFile, stage: 2 });
      const theirs = await invoke<string>('read_conflicted_file', { path: workspacePath, filePath: currentFile, stage: 3 });
      
      setCurrentFileContent({ ours, theirs, base: '' });
      setMergedContent(ours); // Default to ours
    } catch (e) {
      console.error('Failed to load conflicted file:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (strategy: 'ours' | 'theirs' | 'manual') => {
    try {
      if (strategy === 'manual') {
        await invoke('write_file_content', { path: workspacePath, filePath: currentFile, content: mergedContent });
        await invoke('git_resolve_conflict', { path: workspacePath, filePath: currentFile, resolution: 'ours' }); // Marker as resolved
      } else {
        await invoke('git_resolve_conflict', { path: workspacePath, filePath: currentFile, resolution: strategy });
      }

      if (currentIndex < conflictedFiles.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success('All conflicts resolved!');
        onResolveSuccess();
        onClose();
      }
    } catch (e) {
      toast.error('Failed to resolve conflict: ' + String(e));
    }
  };

  if (!isOpen || !currentFile) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: '95vw', height: '90vh', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle color="#f59e0b" size={20} />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Conflict Resolver ({currentIndex + 1}/{conflictedFiles.length})</h2>
              <code style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{currentFile}</code>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* 3-Way Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1.2fr', gap: '1px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
          
          {/* Ours (Left) */}
          <div style={{ background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              YOUR CHANGES (LOCAL)
              <button onClick={() => setMergedContent(currentFileContent.ours)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline' }}>Use This</button>
            </div>
            <pre className="custom-scrollbar" style={{ flex: 1, margin: 0, padding: '16px', overflow: 'auto', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {currentFileContent.ours}
            </pre>
          </div>

          {/* Theirs (Right) */}
          <div style={{ background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              INCOMING CHANGES (REMOTE)
              <button onClick={() => setMergedContent(currentFileContent.theirs)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline' }}>Use This</button>
            </div>
            <pre className="custom-scrollbar" style={{ flex: 1, margin: 0, padding: '16px', overflow: 'auto', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {currentFileContent.theirs}
            </pre>
          </div>

          {/* Merged (Bottom Full Width) */}
          <div style={{ gridColumn: 'span 2', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              RESULTING MERGE
              <div style={{ display: 'flex', gap: '8px' }}>
                 <button 
                  onClick={() => handleResolve('manual')}
                  style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '10px' }}
                >
                  Confirm Merge
                </button>
              </div>
            </div>
            <textarea 
              value={mergedContent}
              onChange={(e) => setMergedContent(e.target.value)}
              style={{ 
                flex: 1, width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', 
                padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none', resize: 'none' 
              }}
              placeholder="Resulting code after merge..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', opacity: currentIndex === 0 ? 0.5 : 1 }}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            <button 
              disabled={currentIndex === conflictedFiles.length - 1}
              onClick={() => setCurrentIndex(currentIndex + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', opacity: currentIndex === conflictedFiles.length - 1 ? 0.5 : 1 }}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => handleResolve('ours')}
              style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Take All Local
            </button>
            <button 
              onClick={() => handleResolve('theirs')}
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Take All Incoming
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
