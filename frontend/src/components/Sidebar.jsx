import { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'jobs', icon: '📋', label: 'Jobs' },
    { id: 'workers', icon: '🤖', label: 'Workers' },
    { id: 'opportunities', icon: '💰', label: 'Opportunities' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>{isCollapsed ? 'ARB' : 'Arbitrage Bot'}</h2>
        <button 
          className="collapse-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
            onClick={() => setActiveMenu(item.id)}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="status-dot online"></span>
          {!isCollapsed && <span>System Online</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
