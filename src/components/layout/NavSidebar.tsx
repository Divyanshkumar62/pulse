import { useAppStore } from '../../stores/useAppStore';
import { 
  Folder, 
  Globe, 
  Users, 
  Clock, 
  Database, 
  MonitorCheck, 
  Gauge, 
  Workflow,
  ArrowRightLeft,
  PanelLeft,
  Settings
} from 'lucide-react';
import '../../styles/components/nav-sidebar.css';

export default function NavSidebar() {
  const { sidebarTab, setSidebarTab, setSettingsOpen, sidebarVisible, toggleSidebar } = useAppStore();

  const primaryTabs = [
    { 
      id: 'collections', 
      label: 'Collections',
      icon: <Folder size={20} />
    },
    { 
      id: 'environments', 
      label: 'Environments',
      icon: <Globe size={20} />
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: <Users size={20} />
    },
    { 
      id: 'history', 
      label: 'History',
      icon: <Clock size={20} />
    },
    { 
      id: 'mock-servers', 
      label: 'Mock Servers',
      icon: <Database size={20} />
    },
    { 
      id: 'monitor', 
      label: 'Monitor',
      icon: <MonitorCheck size={20} />
    },
    {
      id: 'load-testing',
      label: 'Load Testing',
      icon: <Gauge size={20} />
    },
    { 
      id: 'flows', 
      label: 'Flows',
      icon: <Workflow size={20} />
    },
    {
      id: 'regression',
      label: 'Regression',
      icon: <ArrowRightLeft size={20} />
    }
  ] as const;

  return (
    <aside className="nav-sidebar">
      <div className="nav-top">
      {primaryTabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-btn ${sidebarTab === tab.id ? 'active' : ''}`}
          onClick={() => {
            if (sidebarTab === tab.id) {
              toggleSidebar();
            } else {
              setSidebarTab(tab.id as any);
              if (!sidebarVisible) toggleSidebar();
            }
          }}
          title={tab.label}
        >
          {tab.icon}
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
      </div>
      
      <div className="nav-bottom">
        <button 
          className={`nav-btn ${sidebarVisible ? 'active' : ''}`} 
          onClick={toggleSidebar} 
          title={sidebarVisible ? 'Close sidebar' : 'Open sidebar'}
        >
          <PanelLeft size={20} />
        </button>
        <button className="nav-btn" onClick={() => setSettingsOpen(true)} title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </aside>
  );
}
