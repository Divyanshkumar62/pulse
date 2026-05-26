import React from 'react';
import { useAppStore } from '../../stores/useAppStore';

export default function WelcomeScreen() {
  const { setCommandPaletteOpen } = useAppStore();

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: 'var(--bg-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      color: 'var(--text-primary)'
    }}>
      {/* Engineering Dot Grid Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(var(--border-subtle) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        opacity: 0.2,
        zIndex: 0
      }} />

      {/* Main Illustration Container */}
      <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '32px'
      }}>
        {/* Animated Isometric Server Node (Blueprint Style) */}
        <svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <style>{`
            .blueprint-path {
              stroke: var(--accent-primary);
              stroke-width: 0.5;
              stroke-dasharray: 100;
              stroke-dashoffset: 100;
              animation: draw 3s ease-out forwards;
            }
            .blueprint-fill {
              fill: var(--accent-primary);
              opacity: 0;
              animation: fadeIn 1s 2s forwards;
            }
            @keyframes draw {
              to { stroke-dashoffset: 0; }
            }
            @keyframes fadeIn {
              to { opacity: 0.1; }
            }
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            .floating {
                animation: float 6s ease-in-out infinite;
            }
          `}</style>
          <g className="floating">
            {/* Isometric Cube / Server */}
            <path className="blueprint-path" d="M50 20 L80 35 L80 65 L50 80 L20 65 L20 35 Z" />
            <path className="blueprint-path" d="M50 20 L50 80" />
            <path className="blueprint-path" d="M50 50 L80 35" />
            <path className="blueprint-path" d="M50 50 L20 35" />
            
            {/* Interior Details */}
            <path className="blueprint-path" d="M30 45 L45 53" style={{ animationDelay: '0.5s' }} />
            <path className="blueprint-path" d="M30 55 L45 63" style={{ animationDelay: '0.7s' }} />
            <path className="blueprint-path" d="M70 45 L55 53" style={{ animationDelay: '0.9s' }} />
            <path className="blueprint-path" d="M70 55 L55 63" style={{ animationDelay: '1.1s' }} />
            
            {/* Fills */}
            <path className="blueprint-fill" d="M50 20 L80 35 L50 50 L20 35 Z" />
          </g>
        </svg>

        {/* Minimalist Typography */}
        <div style={{ textAlign: 'center' }}>
            <h1 style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                letterSpacing: '4px', 
                textTransform: 'uppercase', 
                opacity: 0.8,
                margin: '0 0 8px 0'
            }}>
                System Idle
            </h1>
            <div style={{ 
                height: '1px', 
                width: '40px', 
                background: 'var(--accent-primary)', 
                margin: '0 auto 16px',
                opacity: 0.5
            }} />
            <p style={{ 
                fontSize: '12px', 
                color: 'var(--text-tertiary)', 
                margin: 0,
                fontFamily: 'var(--font-mono)'
            }}>
                Ready for deployment
            </p>
        </div>
      </div>

      {/* Modern Shortcut Hint */}
      <div 
        onClick={() => setCommandPaletteOpen(true)}
        style={{ 
            position: 'absolute', 
            bottom: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '100px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 1
        }}
        onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }}
      >
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Press</span>
          <div style={{ display: 'flex', gap: '4px' }}>
              <kbd style={{ 
                  background: 'var(--bg-elevated)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '10px',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 2px 0 var(--border-default)'
              }}>Ctrl</kbd>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>+</span>
              <kbd style={{ 
                  background: 'var(--bg-elevated)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '10px',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 2px 0 var(--border-default)'
              }}>P</kbd>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>to launch Command Palette</span>
      </div>
    </div>
  );
}
