import { useAppStore } from '../../stores/useAppStore';
import UserProfileModal from '../modals/UserProfileModal';
import '../../styles/components/header.css';

export default function Header() {
  const { isProfileOpen, setProfileOpen } = useAppStore();
  
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
      </div>

      <div className="header-right">
        <div className="user-profile" onClick={() => setProfileOpen(true)}>
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" />
        </div>
      </div>

      <UserProfileModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
