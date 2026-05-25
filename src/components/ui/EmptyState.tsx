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
      padding: compact ? '20px 12px' : '40px 24px',
      height: '100%',
      opacity: 0.9
    }}>
      <div style={{ 
        width: compact ? '40px' : '64px', 
        height: compact ? '40px' : '64px', 
        borderRadius: '16px', 
        background: 'rgba(255, 255, 255, 0.03)', 
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: compact ? '12px' : '20px',
        color: 'var(--accent-primary)',
        boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
      }}>
        <Icon size={compact ? 20 : 32} strokeWidth={1.5} />
      </div>
      
      <h3 style={{ 
        fontSize: compact ? '13px' : '16px', 
        fontWeight: 600, 
        color: 'var(--text-primary)', 
        margin: '0 0 8px 0' 
      }}>
        {title}
      </h3>
      
      <p style={{ 
        fontSize: compact ? '11px' : '13px', 
        color: 'var(--text-tertiary)', 
        lineHeight: 1.5,
        margin: 0,
        maxWidth: '240px'
      }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="btn-primary rounded-md"
          style={{ 
            marginTop: '20px', 
            padding: compact ? '6px 12px' : '8px 16px',
            fontSize: compact ? '11px' : '12px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
