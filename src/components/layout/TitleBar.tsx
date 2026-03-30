import { useEnvStore } from '../../stores/useEnvStore';

export default function TitleBar() {
  const { environments, activeEnvId, setActiveEnvId } = useEnvStore();

  return (
    <div data-tauri-drag-region className="title-bar" style={{ height: '50px', background: 'rgba(10, 10, 15, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <div className="title-bar-brand" data-tauri-drag-region style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.05em', color: '#fff', gap: '8px' }}>
        <span style={{ color: 'var(--accent-primary)', fontSize: '22px' }}>⚡</span> Pulse
      </div>
      <div className="title-bar-center" data-tauri-drag-region>
        {/* Global search component will go here */}
      </div>
      <div className="title-bar-actions">
        <select 
          className="env-selector"
          value={activeEnvId || ''} 
          onChange={(e) => setActiveEnvId(e.target.value)}
        >
          {environments.map(env => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
