import { useEnvStore } from '../../stores/useEnvStore';

export default function TitleBar() {
  const { environments, activeEnvId, setActiveEnvId } = useEnvStore();

  return (
    <div data-tauri-drag-region className="title-bar">
      <div className="title-bar-brand" data-tauri-drag-region>
        <span className="brand-icon">⚡</span> Pulse
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
