import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { toast } from 'sonner';
import { Camera, Trash2, X } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { settings, updateSettings } = useSettingsStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setName(settings.name || '');
      setEmail(settings.email || '');
      setAvatarUrl(settings.avatarUrl || '');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await updateSettings({ name, email, avatarUrl });
      toast.success('Profile updated successfully');
      onClose();
    } catch (e) {
      toast.error('Failed to save profile');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 1MB for Base64 efficiency)
      if (file.size > 1024 * 1024) {
        toast.error('Image must be less than 1MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
                onClick={() => fileInputRef.current?.click()}
                style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: avatarUrl 
                    ? `url(${avatarUrl}) center/cover no-repeat`
                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'white',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '4px solid var(--bg-elevated)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                >
                {!avatarUrl && (name ? name.charAt(0).toUpperCase() : '?')}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    borderRadius: '50%'
                }}
                className="avatar-hover-overlay"
                >
                    <Camera size={24} color="white" />
                </div>
                </div>

                {avatarUrl && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeAvatar(); }}
                        style={{ 
                            position: 'absolute', bottom: 0, right: 0, 
                            background: '#ef4444', color: 'white', border: 'none', 
                            borderRadius: '50%', width: '28px', height: '28px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                        title="Remove Image"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Click to upload profile picture (max 1MB)
            </p>
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
                <input
                type="email"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                />
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
