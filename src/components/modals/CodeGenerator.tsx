import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { generateCurl, generateFetch } from '../../services/codeGen';
import { toast } from 'sonner';

interface CodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CodeGenerator({ isOpen, onClose }: CodeGeneratorProps) {
  const { tabs, activeTabId } = useTabStore();
  const [lang, setLang] = useState<'curl' | 'js'>('curl');
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeTab) return null;

  const request = activeTab.request;
  const code = lang === 'curl' ? generateCurl(request) : generateFetch(request);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div 
        style={{ width: '700px', backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-h2">Code Snippet</h2>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
        
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
          <button 
            className={`config-tab ${lang === 'curl' ? 'active' : ''}`}
            onClick={() => setLang('curl')}
          >
            cURL
          </button>
          <button 
            className={`config-tab ${lang === 'js' ? 'active' : ''}`}
            onClick={() => setLang('js')}
          >
            JavaScript (Fetch)
          </button>
        </div>
        
        <div style={{ padding: '16px', position: 'relative' }}>
          <button 
            onClick={handleCopy}
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Copy
          </button>
          <pre style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '4px', overflowX: 'auto', color: 'var(--text-primary)', border: '1px solid var(--border-default)', whiteSpace: 'pre-wrap' }} className="text-mono">
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}
