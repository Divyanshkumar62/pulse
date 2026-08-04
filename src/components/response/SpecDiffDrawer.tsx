import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface SpecDiffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  errors: string[];
  requestName: string;
}

export default function SpecDiffDrawer({ isOpen, onClose, errors, requestName }: SpecDiffDrawerProps) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '400px',
        backgroundColor: '#0f172a',
        borderLeft: '1px solid #1e293b',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans, sans-serif)',
        color: '#f1f5f9',
        animation: 'slideIn 0.25s ease-out'
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Drawer Header */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#1e293b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} className="text-warning" style={{ color: '#f59e0b' }} />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Spec Drift Mismatches</h3>
        </div>
        <button 
          onClick={onClose} 
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Endpoint</span>
          <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px', color: '#cbd5e1' }}>{requestName}</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Contract Deviations</span>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 12px 0' }}>
            The live API response payload deviates from the expected OpenAPI JSON schema.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {errors.map((error, idx) => {
            // Formatting to make it look like a clear red/green diff line
            let diffPrefix = '-';
            let diffColor = '#f87171'; // Light red
            let formattedError = error;

            if (error.includes('is required')) {
              diffPrefix = '+';
              diffColor = '#34d399'; // Light green
              formattedError = `Missing required property: ${error.replace('is required', '')}`;
            }

            return (
              <div 
                key={idx} 
                style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${diffColor}20`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  lineHeight: '1.4',
                  alignItems: 'flex-start'
                }}
              >
                <span style={{ color: diffColor, fontWeight: 'bold', fontSize: '14px', userSelect: 'none', width: '12px' }}>
                  {diffPrefix}
                </span>
                <span style={{ color: '#e2e8f0', flex: 1 }}>{formattedError}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawer Footer */}
      <div 
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #1e293b',
          backgroundColor: '#0f172a',
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center'
        }}
      >
        Pulse Asynchronous Drift Detector v1.0
      </div>
    </div>
  );
}
