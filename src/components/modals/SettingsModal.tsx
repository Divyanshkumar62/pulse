import { useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettingsStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !settings) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 10000 
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          width: '600px', 
          backgroundColor: 'var(--bg-deep)', 
          borderRadius: '12px', 
          border: '1px solid var(--border-default)', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-h2" style={{ margin: 0 }}>Settings</h2>
          <button 
            onClick={onClose} 
            style={{ 
              color: 'var(--text-tertiary)', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '24px',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '70vh' }}>
          <section>
            <h3 className="text-label" style={{ marginBottom: '12px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Your Name</label>
                <input
                  type="text"
                  className="text-input"
                  style={{ width: '100%', padding: '10px 12px' }}
                  value={settings.name}
                  onChange={(e) => updateSettings({ name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Email Address</label>
                <input
                  type="email"
                  className="text-input"
                  style={{ width: '100%', padding: '10px 12px' }}
                  value={settings.email}
                  onChange={(e) => updateSettings({ email: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section style={{ paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <h3 className="text-label" style={{ marginBottom: '12px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Request Defaults</h3>
            <div style={{ marginBottom: '16px' }}>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Timeout (seconds)</label>
              <input
                type="number"
                className="text-input"
                style={{ width: '120px', padding: '10px 12px' }}
                value={settings.default_timeout_secs}
                onChange={(e) => updateSettings({ default_timeout_secs: parseInt(e.target.value) || 30 })}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.follow_redirects}
                  onChange={(e) => updateSettings({ follow_redirects: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                />
                Follow HTTP Redirects
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.verify_ssl}
                  onChange={(e) => updateSettings({ verify_ssl: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                />
                Verify SSL Certificates
              </label>
            </div>
          </section>

          <section style={{ paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <h3 className="text-label" style={{ marginBottom: '16px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appearance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { id: 'dark', name: 'Electric Blue', colors: ['#0d1117', '#2563eb', '#e6edf3'] },
                { id: 'light', name: 'High Contrast', colors: ['#ffffff', '#0366d6', '#24292e'] },
                { id: 'gruvbox', name: 'Gruvbox', colors: ['#282828', '#fe8019', '#ebdbb2'] },
                { id: 'nord', name: 'Arctic Nord', colors: ['#2e3440', '#88c0d0', '#eceff4'] },
                { id: 'tokyo', name: 'Tokyo Night', colors: ['#1a1b26', '#bb9af7', '#c0caf5'] },
              ].map(theme => (
                <div 
                  key={theme.id}
                  onClick={() => updateSettings({ theme: theme.id })}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: settings.theme === theme.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: settings.theme === theme.id ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {theme.colors.map(color => (
                        <div key={color} style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: color, border: '1px solid rgba(0,0,0,0.1)' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{theme.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
             <h3 className="text-label" style={{ marginBottom: '12px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>App Info</h3>
             <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="text-label" style={{ color: 'var(--text-secondary)' }}>Version</span>
                  <span className="text-mono" style={{ fontSize: '12px' }}>0.1.0-alpha</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-label" style={{ color: 'var(--text-secondary)' }}>Data Directory</span>
                  <span className="text-mono" style={{ fontSize: '12px' }}>~/.pulse/</span>
                </div>
             </div>
          </section>
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={onClose} style={{ padding: '8px 24px' }}>Done</button>
        </div>
      </div>
    </div>
  );
}
