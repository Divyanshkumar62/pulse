import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTabStore } from '../../stores/useTabStore';
import { generateDocumentation } from '../../services/docGenerator';
import { FileText, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentationView() {
  const { tabs, activeTabId } = useTabStore();
  const [copied, setCopied] = React.useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const request = activeTab?.request;
  const response = activeTab?.response;

  const markdown = useMemo(() => {
    if (!request) return '';
    return generateDocumentation(request, response);
  }, [request, response]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success('Documentation copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!request) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <FileText size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
        <p>Select a request to view documentation.</p>
      </div>
    );
  }

  return (
    <div className="documentation-view" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-deep)',
      borderLeft: '1px solid var(--border-subtle)'
    }}>
      <div style={{ 
        padding: '12px 20px', 
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Live Documentation</span>
        </div>
        <button 
          onClick={handleCopy}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          className="copy-docs-btn"
        >
          {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} color="var(--text-secondary)" />}
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{copied ? 'Copied' : 'Copy MD'}</span>
        </button>
      </div>

      <div className="documentation-content custom-scrollbar" style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '32px',
        color: 'var(--text-primary)',
        lineHeight: 1.6
      }}>
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px', letterSpacing: '-0.02em', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }} {...props} />,
            h3: ({node, ...props}) => <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '32px', marginBottom: '16px', color: 'var(--accent-primary)' }} {...props} />,
            h4: ({node, ...props}) => <h4 style={{ fontSize: '14px', fontWeight: 700, marginTop: '24px', marginBottom: '8px' }} {...props} />,
            p: ({node, ...props}) => <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }} {...props} />,
            code: ({node, inline, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '');
              return !inline ? (
                <pre style={{ 
                  background: 'var(--bg-elevated)', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  overflowX: 'auto',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '24px'
                }}>
                  <code style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }} className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code style={{ 
                  background: 'var(--bg-elevated)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '0.9em',
                  color: 'var(--accent-primary)'
                }} {...props}>
                  {children}
                </code>
              );
            },
            table: ({node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '14px' }} {...props} />,
            th: ({node, ...props}) => <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontWeight: 600 }} {...props} />,
            td: ({node, ...props}) => <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }} {...props} />,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>

      <style>{`
        .copy-docs-btn:hover {
          border-color: var(--accent-primary);
          background: var(--accent-subtle);
        }
        .copy-docs-btn:hover span {
          color: var(--accent-primary) !important;
        }
      `}</style>
    </div>
  );
}
