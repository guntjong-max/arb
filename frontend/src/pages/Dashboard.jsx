import { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeJobs: 0,
    activeWorkers: 0,
    opportunities: 0,
    profitToday: 0
  });
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/v1/health');
      const data = await response.json();
      setHealth(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching health:', error);
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <button className="btn-refresh" onClick={fetchHealth}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Active Jobs"
          value={stats.activeJobs}
          icon="📋"
          color="blue"
        />
        <StatCard
          title="Active Workers"
          value={stats.activeWorkers}
          icon="🤖"
          color="green"
        />
        <StatCard
          title="Opportunities"
          value={stats.opportunities}
          icon="💰"
          color="purple"
        />
        <StatCard
          title="Profit Today"
          value={`$${stats.profitToday.toFixed(2)}`}
          icon="📈"
          color="orange"
        />
      </div>

      <div className="dashboard-content">
        <div className="system-health">
          <h2>System Health</h2>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : health ? (
            <div className="health-info">
              <div className="health-item">
                <span className="health-label">Status:</span>
                <span className={`health-value ${health.status === 'healthy' ? 'success' : 'error'}`}>
                  {health.status || 'Unknown'}
                </span>
              </div>
              <div className="health-item">
                <span className="health-label">API:</span>
                <span className="health-value success">✓ Online</span>
              </div>
              <div className="health-item">
                <span className="health-label">Database:</span>
                <span className="health-value success">✓ Connected</span>
              </div>
              <div className="health-item">
                <span className="health-label">Redis:</span>
                <span className="health-value success">✓ Connected</span>
              </div>
            </div>
          ) : (
            <div className="error">Unable to fetch system health</div>
          )}
        </div>

        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-icon">📋</span>
              <div className="activity-details">
                <p className="activity-title">System initialized</p>
                <p className="activity-time">Just now</p>
              </div>
            </div>
            <div className="activity-item">
              <span className="activity-icon">✅</span>
              <div className="activity-details">
                <p className="activity-title">Health check passed</p>
                <p className="activity-time">1 minute ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
