import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { toast } from 'sonner';
import { Camera, Trash2, X, Mail } from 'lucide-react';
import { getGravatarUrl } from '../../utils/gravatar';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { settings, updateSettings } = useSettingsStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setEmail(settings.email || '');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await updateSettings({ name, email });
      toast.success('Profile updated successfully');
      onClose();
    } catch (e) {
      toast.error('Failed to save profile');
    }
  };

  // Determine display avatar for preview (Gravatar only)
  const previewAvatar = email ? getGravatarUrl(email, 100) : null;

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
          borderRadius: '16px', 
          border: '1px solid var(--border-default)', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>User Profile</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
                <div 
                style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: previewAvatar 
                    ? `url(${previewAvatar}) center/cover no-repeat`
                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'white',
                    overflow: 'hidden',
                    border: '4px solid var(--bg-elevated)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                >
                {!previewAvatar && (name ? name.charAt(0).toUpperCase() : '?')}
                </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {email ? 'Using Gravatar based on email' : 'Using initial fallback'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.6, color: 'var(--text-tertiary)' }}>
                    Avatars are automatically synchronized via Gravatar
                </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                <input
                type="text"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                    <input
                        type="email"
                        style={{ width: '100%', padding: '10px 12px', paddingRight: '36px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                    />
                    <div title="This email is used for your Gravatar" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                        <Mail size={14} />
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '8px 24px', borderRadius: '8px' }}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} style={{ padding: '8px 24px', borderRadius: '8px', fontWeight: 600 }}>Save Changes</button>
        </div>
      </div>
      
      <style>{`
        .avatar-hover-overlay:hover {
            opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
