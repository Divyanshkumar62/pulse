import React, { useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Collection } from '../../types';
import { exportCollection } from '../../hooks/useTauri';
import { toast } from 'sonner';

interface ExportModalProps {
  collection: Collection;
  onClose: () => void;
}

export default function ExportModal({ collection, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'postman' | 'openapi_json' | 'openapi_yaml'>('postman');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const apiFormat = format === 'postman' ? 'postman' : 'openapi';
      const exportData = await exportCollection(collection, apiFormat);
      const jsonString = JSON.stringify(exportData, null, 2);

      const filePath = await save({
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }],
        defaultPath: `${collection.name.toLowerCase().replace(/\s+/g, '-')}-export.json`
      });

      if (filePath) {
        await writeTextFile(filePath, jsonString);
        toast.success('Collection exported successfully!');
        onClose();
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--bg-default)', padding: '24px', borderRadius: '12px',
        width: '400px', border: '1px solid var(--border-default)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text-primary)' }}>Export Collection</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Export <strong>{collection.name}</strong> to use in other API clients or documentation tools.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Format</label>
          <div 
            onClick={() => setFormat('postman')}
            style={{
              padding: '12px', borderRadius: '8px', border: '1px solid',
              borderColor: format === 'postman' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              backgroundColor: format === 'postman' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px'
            }}
          >
            <div style={{ 
                width: '16px', height: '16px', borderRadius: '50%', border: '2px solid',
                borderColor: format === 'postman' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {format === 'postman' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Postman Collection v2.1</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Standard format for Postman and Insomnia</div>
            </div>
          </div>

          <div 
            onClick={() => setFormat('openapi_json')}
            style={{
              padding: '12px', borderRadius: '8px', border: '1px solid',
              borderColor: format === 'openapi_json' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              backgroundColor: format === 'openapi_json' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px'
            }}
          >
             <div style={{ 
                width: '16px', height: '16px', borderRadius: '50%', border: '2px solid',
                borderColor: format === 'openapi_json' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {format === 'openapi_json' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>OpenAPI 3.0</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Industry standard for API definitions</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-default)',
              backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              backgroundColor: 'var(--accent-primary)', color: 'white', fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.7 : 1
            }}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
