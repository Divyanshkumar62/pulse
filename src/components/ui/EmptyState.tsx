import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  compact = false
}: EmptyStateProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      textAlign: 'center',
      padding: compact ? '40px 12px' : '60px 24px',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: compact ? '120px' : '200px',
        height: compact ? '120px' : '200px',
        background: 'radial-gradient(circle, var(--accent-subtle) 0%, transparent 70%)',
        opacity: 0.4,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ 
        width: compact ? '56px' : '80px', 
        height: compact ? '56px' : '80px', 
        borderRadius: '24px', 
        background: 'var(--bg-glass)', 
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: compact ? '16px' : '24px',
        color: 'var(--accent-primary)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        zIndex: 1
      }}>
        <Icon size={compact ? 28 : 40} strokeWidth={1.5} />
      </div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{ 
          fontSize: compact ? '14px' : '18px', 
          fontWeight: 700, 
          color: 'var(--text-primary)', 
          margin: '0 0 4px 0',
          letterSpacing: '-0.01em'
        }}>
          {title}
        </h3>
        
        <p style={{ 
          fontSize: compact ? '12px' : '14px', 
          color: 'var(--text-secondary)', 
          lineHeight: 1.5,
          margin: 0,
          maxWidth: compact ? '180px' : '280px',
          opacity: 0.8
        }}>
          {description}
        </p>

        {actionLabel && onAction && (
          <button 
            onClick={onAction}
            className="btn-primary rounded-md"
            style={{ 
              marginTop: '24px', 
              padding: compact ? '8px 16px' : '10px 20px',
              fontSize: compact ? '12px' : '13px',
              fontWeight: 600,
              boxShadow: '0 4px 12px var(--accent-subtle)',
              border: 'none',
              background: 'var(--accent-primary)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
