import { useAppStore } from '../../stores/useAppStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useEnvStore } from '../../stores/useEnvStore';
import CustomSelect from '../ui/CustomSelect';
import '../../styles/components/header.css';
import GitSync from './GitSync';

export default function Header() {
  const { setProfileOpen } = useAppStore();
  const { settings } = useSettingsStore();
  const { environments, activeEnvId, setActiveEnvId } = useEnvStore();
  
  return (
    <header className="app-header" data-tauri-drag-region>
      <div className="header-left" data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" />
            </svg>
          </div>
          <span className="brand-name">Pulse</span>
        </div>
      </div>

      <div className="header-center" data-tauri-drag-region>
        <GitSync />
      </div>

      <div className="header-right">
        <div style={{ width: '200px' }}>
          <CustomSelect
            value={activeEnvId || ''}
            onChange={(val) => setActiveEnvId(val || null)}
            options={[
              { value: '', label: 'No Environment' },
              ...environments.map(env => ({
                value: env.id,
                label: env.name
              }))
            ]}
          />
        </div>
        <div className="user-profile" onClick={() => setProfileOpen(true)}>
          {settings?.avatarUrl ? (
            <img src={settings.avatarUrl} alt="Profile" />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px', 
              fontWeight: 700, 
              color: 'white',
              lineHeight: 1
            }}>
              {settings?.name ? settings.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
