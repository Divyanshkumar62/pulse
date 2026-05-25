import React from 'react';
import { Collection, Folder, Request } from '../../types';
import { X, FileText, Layout } from 'lucide-react';

interface CollectionDocsProps {
  collection: Collection;
  onClose: () => void;
}

export default function CollectionDocs({ collection, onClose }: CollectionDocsProps) {
  const renderRequest = (req: Request, level: number) => (
    <div key={req.id} style={{ marginBottom: '40px', paddingLeft: level * 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ 
          fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.05)', color: 'var(--accent-primary)', border: '1px solid var(--accent-subtle)'
        }}>
          {req.method}
        </span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{req.name}</h3>
      </div>

      <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
        <code style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{req.url}</code>
      </div>

      {req.headers && req.headers.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Headers</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {req.headers.map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-secondary)', width: '150px' }}>{h.key}</td>
                  <td style={{ padding: '8px 0', color: 'var(--text-tertiary)' }}>{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {req.body?.content && (
        <div>
          <h4 style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Request Body</h4>
          <pre style={{ 
            background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', 
            fontSize: '12px', color: 'var(--text-secondary)', overflowX: 'auto'
          }}>
            {req.body.content}
          </pre>
        </div>
      )}
    </div>
  );

  const renderFolder = (folder: Folder, level: number) => (
    <div key={folder.id} style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', paddingLeft: level * 20 }}>
        <Layout size={18} color="var(--text-tertiary)" />
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{folder.name}</h2>
      </div>
      
      {folder.requests.map(req => renderRequest(req, level + 1))}
      {folder.folders?.map(f => renderFolder(f, level + 1))}
    </div>
  );

  return (
    <div style={{
      width: '100%', height: '100%', backgroundColor: 'var(--bg-deep)',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Navbar */}
      <div style={{ 
        padding: '16px 32px', borderBottom: '1px solid var(--border-subtle)', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={20} color="var(--accent-primary)" />
            <div>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>API Documentation</h1>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{collection.name}</span>
            </div>
        </div>
        <button 
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
            <X size={16} /> Close Docs
        </button>
      </div>

      {/* Docs Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px 10%' }} className="custom-scrollbar-mini">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '64px' }}>
                <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '16px' }}>{collection.name}</h1>
                {collection.description && (
                    <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{collection.description}</p>
                )}
            </div>

            {collection.requests.map(req => renderRequest(req, 0))}
            {collection.folders.map(folder => renderFolder(folder, 0))}
        </div>
      </div>
    </div>
  );
}
