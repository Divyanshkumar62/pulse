import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useEnvStore } from '../../stores/useEnvStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import CustomSelect from '../ui/CustomSelect';
import '../../styles/components/header.css';
import GitSync from './GitSync';
import { getGravatarUrl } from '../../utils/gravatar';
import { Avatar } from '../ui/Avatar';

export default function Header() {
  const { setProfileOpen, setSidebarTab, sidebarVisible, toggleSidebar } = useAppStore();
  const { settings } = useSettingsStore();
  const { environments, activeEnvId, setActiveEnvId } = useEnvStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showWorkspaceDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWorkspaceDropdown]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  // Determine which avatar to show: Custom Image > Gravatar > Initial
  const displayAvatar = settings?.avatarUrl || (settings?.email ? getGravatarUrl(settings.email, 64) : null);
  
  return (
    <header className="app-header" data-tauri-drag-region>
      <div className="header-left" data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="workspace-switcher-container" ref={dropdownRef}>
          <button 
            className="workspace-switcher-btn"
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
          >
            <span className={`workspace-status-dot ${activeWorkspace?.type === 'team' ? 'team' : 'personal'}`}></span>
            <span className="workspace-name">{activeWorkspace?.name || 'Personal Workspace'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showWorkspaceDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.6 }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          {showWorkspaceDropdown && (
            <div className="workspace-dropdown">
              <div className="workspace-dropdown-header">Switch Workspace</div>
              <div className="workspace-options">
                {workspaces.map(w => (
                  <button 
                    key={w.id} 
                    className={`workspace-option-item ${w.id === activeWorkspaceId ? 'active' : ''}`}
                    onClick={() => {
                      setActiveWorkspace(w.id);
                      setShowWorkspaceDropdown(false);
                    }}
                  >
                    <span className={`workspace-status-dot ${w.type === 'team' ? 'team' : 'personal'}`}></span>
                    <div className="workspace-option-details">
                      <span className="workspace-option-name">{w.name}</span>
                      <span className="workspace-option-type">{w.type === 'team' ? 'Shared Team' : 'Local Only'}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="workspace-dropdown-footer">
                <button 
                  className="manage-teams-btn"
                  onClick={async () => {
                    setSidebarTab('teams');
                    if (!sidebarVisible) {
                      toggleSidebar();
                    }
                    // Switch to first team workspace if currently on personal
                    if (activeWorkspace?.type !== 'team') {
                      const firstTeam = workspaces.find(w => w.type === 'team');
                      if (firstTeam) {
                        await setActiveWorkspace(firstTeam.id);
                      }
                    }
                    setShowWorkspaceDropdown(false);
                  }}
                >
                  👥 Manage Teams
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="header-center" data-tauri-drag-region>
        <GitSync />
      </div>

      <div className="header-right">
        <div style={{ width: '160px', marginRight: '-40px', zIndex: 10 }}>
          <CustomSelect
            value={activeEnvId || ''}
            onChange={(val) => setActiveEnvId(val || null)}
            options={environments.map(env => ({
              value: env.id,
              label: env.name
            }))}
          />
        </div>
        <div className="user-profile" onClick={() => setProfileOpen(true)} style={{ zIndex: 11 }}>
          <Avatar 
            src={displayAvatar} 
            alt={settings?.name || 'User'} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    </header>
  );
}
