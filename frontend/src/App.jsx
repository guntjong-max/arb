import React, { useState, useEffect } from 'react';
import { SystemHealthBar } from './components/SystemHealthBar';
import { AccountPanel } from './pages/AccountPanel';
import { ConfigPanel } from './pages/ConfigPanel';
import { MonitoringCenter } from './pages/MonitoringCenter';
import { useWebSocket } from './hooks/useWebSocket';
import { configAPI } from './services/api';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [config, setConfig] = useState(null);
  const [autoTrading, setAutoTrading] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);
  
  const { 
    isConnected, 
    systemHealth, 
    opportunities, 
    bets, 
    logs 
  } = useWebSocket();

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await configAPI.get();
      if (response.data.success) {
        setConfig(response.data.config);
        setAutoTrading(response.data.config.auto_trading_enabled || false);
        setEmergencyStop(response.data.config.emergency_stop || false);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleToggleAutoTrading = async () => {
    try {
      const newState = !autoTrading;
      await configAPI.toggleAutoTrading(newState);
      setAutoTrading(newState);
    } catch (error) {
      console.error('Error toggling auto trading:', error);
    }
  };

  const handleEmergencyStop = async () => {
    if (window.confirm('Are you sure you want to activate EMERGENCY STOP? This will immediately stop all trading activities.')) {
      try {
        await configAPI.toggleEmergencyStop(true);
        setEmergencyStop(true);
        setAutoTrading(false);
      } catch (error) {
        console.error('Error activating emergency stop:', error);
      }
    }
  };

  const tabs = [
    { id: 'monitoring', label: 'Monitoring Center', icon: '📊' },
    { id: 'accounts', label: 'Account Panel', icon: '👤' },
    { id: 'config', label: 'Configuration', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-dark-bg dark">
      {/* Header */}
      <header className="bg-dark-card border-b border-dark-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">
                ⚡ Arbitrage Bot System
              </h1>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                    ● Live
                  </span>
                ) : (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                    ● Disconnected
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auto Trading Toggle */}
              <button
                onClick={handleToggleAutoTrading}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  autoTrading
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {autoTrading ? '● Auto Trading ON' : '○ Auto Trading OFF'}
              </button>
              
              {/* Emergency Stop */}
              <button
                onClick={handleEmergencyStop}
                disabled={emergencyStop}
                className={`px-4 py-2 rounded font-bold transition-colors ${
                  emergencyStop
                    ? 'bg-red-900 text-red-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {emergencyStop ? '⛔ STOPPED' : '🛑 EMERGENCY STOP'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* System Health Bar */}
      <SystemHealthBar systemHealth={systemHealth} />

      {/* Navigation Tabs */}
      <div className="bg-dark-card border-b border-dark-border">
        <div className="px-6">
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-blue-500 bg-dark-bg'
                    : 'text-dark-textMuted hover:text-dark-text hover:bg-dark-bg/50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'monitoring' && (
          <MonitoringCenter 
            opportunities={opportunities} 
            bets={bets} 
            logs={logs}
          />
        )}
        {activeTab === 'accounts' && (
          <AccountPanel />
        )}
        {activeTab === 'config' && (
          <ConfigPanel config={config} onUpdate={loadConfig} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-dark-card border-t border-dark-border px-6 py-3 mt-auto">
        <div className="flex items-center justify-between text-sm text-dark-textMuted">
          <span>© 2024 Arbitrage Bot System - For Educational Use Only</span>
          <span>Version 1.0.0</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
