import React, { useState } from 'react';
import { VariableResolver } from '../../services/variableResolver';
import { Variable } from '../../types';

interface VariableTooltipProps {
  text: string;
  collectionVariables?: Variable[];
  environmentVariables?: Variable[];
  globalVariables?: Variable[];
  className?: string;
  style?: React.CSSProperties;
}

export const VariableTooltip: React.FC<VariableTooltipProps> = ({
  text,
  collectionVariables = [],
  environmentVariables = [],
  globalVariables = [],
  className,
  style
}) => {
  const [hoveredVar, setHoveredVar] = useState<{ name: string; value: string | null; scope: string } | null>(null);

  if (!text || typeof text !== 'string') return <span className={className} style={style}>{text}</span>;

  // Regex to match {{varName}}
  const regex = /\{\{([^}]+)\}\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const varName = match[1].trim();
    const startIndex = match.index;
    const endIndex = regex.lastIndex;

    // Push preceding normal text
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    const details = VariableResolver.getVariableDetails(
      varName,
      collectionVariables,
      environmentVariables,
      globalVariables
    );

    parts.push(
      <span
        key={`${varName}-${startIndex}`}
        onMouseEnter={() => setHoveredVar({ name: varName, value: details.value, scope: details.scope })}
        onMouseLeave={() => setHoveredVar(null)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: details.scope === 'Unresolved' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          color: details.scope === 'Unresolved' ? '#f87171' : '#60a5fa',
          border: `1px solid ${details.scope === 'Unresolved' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
          borderRadius: '3px',
          padding: '0 4px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.95em',
          cursor: 'help',
          margin: '0 1px'
        }}
      >
        {`{{${varName}}}`}
        {hoveredVar?.name === varName && (
          <div
            style={{
              position: 'absolute',
              bottom: '125%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#1e293b',
              border: '1px solid var(--border-default, #334155)',
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              zIndex: 1000,
              minWidth: '180px',
              maxWidth: '300px',
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '11px', color: '#f8fafc' }}>{`{{${varName}}}`}</span>
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: 600,
                  backgroundColor: details.scope === 'Environment' ? '#0284c7' : details.scope === 'Collection' ? '#7c3aed' : details.scope === 'Global' ? '#059669' : '#dc2626',
                  color: '#ffffff'
                }}
              >
                {details.scope}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
              {details.value !== null ? details.value : <span style={{ color: '#ef4444' }}>Unresolved variable</span>}
            </div>
          </div>
        )}
      </span>
    );

    lastIndex = endIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className} style={style}>{parts}</span>;
};
