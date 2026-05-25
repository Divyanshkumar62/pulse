import React from 'react';
import { Plus, Import, BookOpen, Settings, Zap } from 'lucide-react';
import { useTabStore } from '../../stores/useTabStore';
import { useAppStore } from '../../stores/useAppStore';

export default function WelcomeScreen() {
  const { openTab } = useTabStore();
  const { setImportModalOpen, setSettingsOpen } = useAppStore();

  const handleNewRequest = () => {
    const newReq = {
      id: crypto.randomUUID(),
      name: 'Untitled Request',
      method: 'GET' as const,
      url: '',
      headers: [],
      body: { type: 'none' as const, content: '' },
    };
    openTab(newReq);
  };

  const cards = [
    { 
        title: 'New Request', 
        description: 'Start testing a new API endpoint immediately.', 
        icon: Plus, 
        action: handleNewRequest,
        color: 'var(--accent-primary)'
    },
    { 
        title: 'Import Collection', 
        description: 'Migrate from Postman or OpenAPI effortlessly.', 
        icon: Import, 
        action: () => setImportModalOpen(true),
        color: '#10b981'
    },
    { 
        title: 'Documentation', 
        description: 'Learn how to master Pulse automation and scripts.', 
        icon: BookOpen, 
        action: () => window.open('https://docs.pulse-ide.com', '_blank'),
        color: '#8b5cf6'
    },
    { 
        title: 'Global Settings', 
        description: 'Configure proxies, certificates, and appearance.', 
        icon: Settings, 
        action: () => setSettingsOpen(true),
        color: '#f59e0b'
    },
  ];

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: 'radial-gradient(circle at 50% 50%, #0c0e1a 0%, #080a13 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Background Pulse Effect */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        animation: 'welcome-pulse 8s infinite ease-in-out',
        zIndex: 0
      }} />

      <div style={{ zIndex: 1, textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '100px',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
            <Zap size={16} color="var(--accent-primary)" style={{ marginRight: '8px' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>
                Welcome to Pulse v0.1.0
            </span>
        </div>
        
        <h1 style={{ fontSize: '48px', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-1px' }}>
            Pulse <span style={{ color: 'var(--accent-primary)' }}>IDE</span>
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            The next-generation API workspace for professionals. Build, automate, and document your APIs in record time.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        width: '100%', 
        maxWidth: '800px',
        padding: '0 40px',
        zIndex: 1
      }}>
        {cards.map((card, idx) => (
          <div 
            key={idx}
            onClick={card.action}
            style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = card.color;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.3), 0 0 20px ${card.color}1a`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: `${card.color}1a`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: card.color
            }}>
                <card.icon size={24} />
            </div>
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{card.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
          marginTop: '64px', 
          display: 'flex', 
          gap: '32px', 
          opacity: 0.4, 
          fontSize: '11px', 
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>T</kbd>
              <span>New Tab</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>P</kbd>
              <span>Command Palette</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>S</kbd>
              <span>Save Changes</span>
          </div>
      </div>

      <style>{`
        @keyframes welcome-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
