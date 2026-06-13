import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { generateCurl, generateFetch, generatePython, generateGo, generateJava } from '../../services/codeGen';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';

interface CodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CodeGenerator({ isOpen, onClose }: CodeGeneratorProps) {
  const { tabs, activeTabId } = useTabStore();
  const [lang, setLang] = useState<'curl' | 'js' | 'python' | 'go' | 'java'>('curl');
  const [isCopied, setIsCopied] = useState(false);
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeTab || !activeTab.request) return null;

  const request = activeTab.request;
  let code = '';
  switch (lang) {
    case 'curl': code = generateCurl(request); break;
    case 'js': code = generateFetch(request); break;
    case 'python': code = generatePython(request); break;
    case 'go': code = generateGo(request); break;
    case 'java': code = generateJava(request); break;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
      <div 
        style={{ width: '700px', backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-h2">Code Snippet</h2>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', overflowX: 'auto' }} className="no-scrollbar">
          <button className={`config-tab ${lang === 'curl' ? 'active' : ''}`} onClick={() => setLang('curl')}>Curl</button>
          <button className={`config-tab ${lang === 'js' ? 'active' : ''}`} onClick={() => setLang('js')}>JS (Fetch)</button>
          <button className={`config-tab ${lang === 'python' ? 'active' : ''}`} onClick={() => setLang('python')}>Python (Requests)</button>
          <button className={`config-tab ${lang === 'go' ? 'active' : ''}`} onClick={() => setLang('go')}>Go</button>
          <button className={`config-tab ${lang === 'java' ? 'active' : ''}`} onClick={() => setLang('java')}>Java (HttpClient)</button>
        </div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={handleCopy}
              style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
            </button>
            <pre style={{ margin: 0, background: 'var(--bg-surface)', padding: '16px', paddingTop: '32px', borderRadius: '4px', overflowX: 'auto', color: 'var(--text-primary)', border: '1px solid var(--border-default)', whiteSpace: 'pre-wrap', minHeight: '150px', maxHeight: '400px' }} className="text-mono">
              {code}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
