import { useSettingsStore } from '../../stores/useSettingsStore';

export default function SettingsPanel() {
  const { settings, updateSettings } = useSettingsStore();

  if (!settings) return <div style={{ padding: '12px' }}>Loading...</div>;

  return (
    <div style={{ padding: '12px' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--accent-primary)' }}>User Settings</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>Name</label>
        <input
          type="text"
          style={{ width: '100%', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}
          value={settings.name}
          onChange={(e) => updateSettings({ name: e.target.value })}
        />
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>Email</label>
        <input
          type="email"
          style={{ width: '100%', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}
          value={settings.email}
          onChange={(e) => updateSettings({ email: e.target.value })}
        />
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>Request Timeout (seconds)</label>
        <input
          type="number"
          style={{ width: '100%', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px' }}
          value={settings.default_timeout_secs}
          onChange={(e) => updateSettings({ default_timeout_secs: parseInt(e.target.value) || 30 })}
        />
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={settings.follow_redirects}
            onChange={(e) => updateSettings({ follow_redirects: e.target.checked })}
          />
          Follow Redirects
        </label>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={settings.verify_ssl}
            onChange={(e) => updateSettings({ verify_ssl: e.target.checked })}
          />
          Verify SSL Certificates
        </label>
      </div>

      <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
        <h4 className="text-label" style={{ marginBottom: '8px' }}>Data Location</h4>
        <p className="text-mono" style={{ color: 'var(--text-secondary)' }}>
          ~/.pulse/
        </p>
      </div>
    </div>
  );
}
