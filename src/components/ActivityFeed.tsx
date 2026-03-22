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
    <div className="activity-feed" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 className="text-label" style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activities.map(activity => (
          <div key={activity.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
              {activity.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{activity.user}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{activity.time}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activity.target}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
