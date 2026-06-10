import React, { useEffect } from 'react';
import { useTeamStore } from '../stores/useTeamStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { getGravatarUrl } from '../utils/gravatar';
import { GitCommit, Clock, User } from 'lucide-react';

export default function TeamActivityFeed() {
  const { activityLog, fetchActivityLogAction } = useTeamStore();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  useEffect(() => {
    console.log('[Pulse] TeamActivityFeed: Active workspace:', activeWorkspace?.name, 'Path:', activeWorkspace?.path);
    const path = activeWorkspace?.path;
    if (path) {
      fetchActivityLogAction(path);
      
      const interval = setInterval(() => {
        fetchActivityLogAction(path);
      }, 120000);
      
      return () => clearInterval(interval);
    }
  }, [activeWorkspace?.path, fetchActivityLogAction]);

  console.log('[Pulse] TeamActivityFeed: Activity log count:', activityLog.length);

  if (!activeWorkspace?.path) {
    return (
      <div className="team-activity-feed" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', padding: '0 16px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Team Activity
        </h3>
        <div style={{ padding: '20px 0', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed var(--border-subtle)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>No Workspace Folder Linked</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', lineHeight: 1.4, padding: '0 12px' }}>
            Link this workspace to a local folder to enable Git activity tracking.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-activity-feed" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Team Activity
        </h3>
      </div>
      
      <div className="activity-list no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', maxHeight: '400px' }}>
        {activityLog.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
            No recent activity found.
          </div>
        ) : (
          activityLog.map((log) => (
            <div 
              key={log.hash}
              style={{ 
                display: 'flex', 
                gap: '12px', 
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                transition: 'background 0.2s'
              }}
              className="activity-item-hover"
            >
              <img 
                src={getGravatarUrl(log.author_email, 64)} 
                alt={log.author_name}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  border: '1px solid var(--border-subtle)',
                  marginTop: '2px'
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.author_name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} />
                    {log.relative_time}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '6px' }}>
                  {log.message}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GitCommit size={12} color="var(--accent-primary)" style={{ opacity: 0.7 }} />
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--accent-primary)', opacity: 0.8 }}>
                    {log.hash.substring(0, 7)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .activity-item-hover:hover {
          background: rgba(255,255,255,0.02);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
