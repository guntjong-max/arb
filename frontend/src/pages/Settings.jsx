import './Jobs.css';

const Settings = () => {
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>
      
      <div className="settings-content">
        <div className="empty-state">
          <span className="empty-icon">⚙️</span>
          <h3>System Settings</h3>
          <p>Configure your arbitrage bot settings</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
