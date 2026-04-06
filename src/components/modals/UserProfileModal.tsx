import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { settings, updateSettings } = useSettingsStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setEmail(settings.email || '');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateSettings({ name, email });
    setIsEditing(false);
  };

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
          width: '450px', 
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
          <h2 className="text-h2" style={{ margin: 0 }}>User Profile</h2>
          <button 
            className="modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white',
            }}>
              {name ? name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {name || 'User'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                {email || 'No email set'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Your Name</label>
            <input
              type="text"
              className="text-input"
              style={{ width: '100%', padding: '10px 12px' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Email Address</label>
            <input
              type="email"
              className="text-input"
              style={{ width: '100%', padding: '10px 12px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '8px 24px' }}>Done</button>
        </div>
      </div>
    </div>
  );
}
