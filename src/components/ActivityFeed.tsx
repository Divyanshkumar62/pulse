import { useTeamStore } from '../stores/useTeamStore';

export default function ActivityFeed() {
  const { invitations } = useTeamStore();
  
  // Mock some activity if no invitations
  const activities = [
    ...invitations.map(i => ({ 
      id: i.id, 
      type: 'invite', 
      user: i.invited_by, 
      target: i.team_name, 
      time: 'Just now',
      icon: '✉️' 
    })),
    { id: '1', type: 'system', user: 'System', target: 'Environment "Dev" updated', time: '2h ago', icon: '⚙️' },
    { id: '2', type: 'system', user: 'System', target: 'New collection created', time: '5h ago', icon: '📁' },
  ];

  return (
    <div className="activity-feed" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <h3 style={{ 
        color: 'var(--accent-primary)', 
        fontSize: '13px', 
        fontWeight: 700,
        margin: 0
      }}>Recent Activity</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {activities.map(activity => (
          <div key={activity.id} style={{ 
            display: 'flex', 
            gap: '14px', 
            alignItems: 'flex-start',
            padding: '12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            transition: 'all var(--transition-base)',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'var(--accent-subtle)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
          >
            <div style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--bg-surface)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '14px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}>
              {activity.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{activity.user}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{activity.time}</span>
              </div>
              <p style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)', 
                margin: 0, 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                lineHeight: 1.4
              }}>
                {activity.target}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
