import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AccountPanel } from './components/AccountPanel';
import { Configuration } from './components/Configuration';
import { Monitoring } from './components/Monitoring';
import { Logs } from './components/Logs';
import { 
  ConnectionStatus,
  SystemHealth, 
  BetConfig, 
  LiveOpp, 
  BetHistory, 
  LogEntry 
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://engine:3000';

// HELPER FUNCTIONS
const generateRandomId = () => Math.random().toString(36).substr(2, 9);
const getTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

function App() {
  // --- STATE ---
  
  // 1. System Health
  const [health, setHealth] = useState({
    engineApi: ConnectionStatus.DISCONNECTED,
    database: ConnectionStatus.DISCONNECTED,
    redis: ConnectionStatus.DISCONNECTED,
    worker: ConnectionStatus.STANDBY
  });

  // 2. Account State (Dual Accounts)
  const [account1, setAccount1] = useState({ isRunning: false, ping: 0, balance: 0.00 });
  const [account2, setAccount2] = useState({ isRunning: false, ping: 0, balance: 0.00 });
  
  // 3. Configuration
  const [config, setConfig] = useState({
    tier1: 500,
    tier2: 1000,
    tier3: 2000,
    minProfit: 3,
    maxProfit: 12,
    maxMinuteHT: 35,
    maxMinuteFT: 75,
    matchFilter: 'LIVE',
    markets: {
      ftHdp: true,
      ftOu: true,
      ft1x2: false,
      htHdp: true,
      htOu: true,
      ht1x2: false
    }
  });

  // 4. Live Opportunities & History
  const [scannerData, setScannerData] = useState([]);
  const [historyData, setHistoryData] = useState([]);

  // 5. Logs
  const [logs, setLogs] = useState([
    { id: generateRandomId(), timestamp: getTime(), level: 'INFO', message: 'System initialized' }
  ]);

  // --- HELPER FUNCTIONS ---
  const addLog = useCallback((level, message) => {
    setLogs(prev => [{
      id: generateRandomId(),
      timestamp: getTime(),
      level,
      message
    }, ...prev].slice(0, 100));
  }, []);

  // --- API INTEGRATION ---
  
  // Health Check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/system-health`);
        if (res.ok) {
          const data = await res.json();
          setHealth({
            engineApi: data.backend?.healthy ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED,
            database: ConnectionStatus.CONNECTED, // Assume connected if backend is up
            redis: ConnectionStatus.CONNECTED,
            worker: data.workers?.some((w) => w.connected) 
              ? ConnectionStatus.CONNECTED 
              : ConnectionStatus.STANDBY
          });
          
          // Update worker ping from first connected worker
          const connectedWorker = data.workers?.find((w) => w.connected);
          if (connectedWorker) {
            setAccount1(prev => ({ ...prev, ping: connectedWorker.last_ping_ms || 0 }));
          }
        } else {
          setHealth({
            engineApi: ConnectionStatus.DISCONNECTED,
            database: ConnectionStatus.DISCONNECTED,
            redis: ConnectionStatus.DISCONNECTED,
            worker: ConnectionStatus.STANDBY
          });
        }
      } catch (err) {
        setHealth({
          engineApi: ConnectionStatus.ERROR,
          database: ConnectionStatus.ERROR,
          redis: ConnectionStatus.ERROR,
          worker: ConnectionStatus.STANDBY
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setConfig(prev => ({
            ...prev,
            minProfit: data.min_percent || prev.minProfit,
            maxProfit: data.max_percent || prev.maxProfit,
            maxMinuteHT: data.minute_limit_ht || prev.maxMinuteHT,
            maxMinuteFT: data.minute_limit_ft || prev.maxMinuteFT,
            matchFilter: data.match_filter === 'live_only' ? 'LIVE' : 'MIXED',
            markets: data.market_filter || prev.markets
          }));
          addLog('SUCCESS', 'Settings loaded from backend');
        }
      } catch (err) {
        addLog('WARN', 'Could not load settings from backend, using defaults');
      }
    };

    loadSettings();
  }, [addLog]);

  // Load Login Status & Account Balances
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/login-status`);
        if (res.ok) {
          const data = await res.json();
          if (data.workers && data.workers.length > 0) {
            const worker1 = data.workers[0];
            const worker2 = data.workers[1] || worker1;
            
            setAccount1(prev => ({
              ...prev,
              ping: worker1.ping_ms || 0,
              balance: worker1.balance || 0
            }));
            
            setAccount2(prev => ({
              ...prev,
              ping: worker2.ping_ms || 0,
              balance: worker2.balance || 0
            }));
          }
        }
      } catch (err) {
        // Silent fail - not critical
      }
    };

    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load Bet History
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/bets`);
        if (res.ok) {
          const data = await res.json();
          if (data.history && Array.isArray(data.history)) {
            const mapped = data.history.map((bet) => ({
              id: bet.pair_id || generateRandomId(),
              time: new Date(bet.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false }),
              match: `${bet.match_id}`,
              market: bet.market === 'full_time' ? 'FT HDP' : 'HT HDP',
              pick: bet.side === 'home' ? 'Home' : 'Away',
              odds: bet.odds,
              line: bet.line,
              stake: bet.stake,
              status: bet.result === 'accepted' ? 'ACCEPTED' : 'REJECTED',
              site: bet.provider || 'unknown',
              profit: bet.result === 'accepted' ? (bet.stake * bet.odds) : undefined
            }));
            setHistoryData(mapped);
          }
        }
      } catch (err) {
        // Silent fail
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 15000);
    return () => clearInterval(interval);
  }, []);

  // Save Settings to Backend
  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
    
    // Save to backend
    const saveSettings = async () => {
      try {
        await fetch(`${API_URL}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            min_percent: newConfig.minProfit,
            max_percent: newConfig.maxProfit,
            minute_limit_ht: newConfig.maxMinuteHT,
            minute_limit_ft: newConfig.maxMinuteFT,
            market_filter: newConfig.markets,
            match_filter: newConfig.matchFilter === 'LIVE' ? 'live_only' : 'all',
            round_off: 5
          })
        });
        addLog('SUCCESS', 'Configuration saved to backend');
      } catch (err) {
        addLog('ERROR', 'Failed to save configuration to backend');
      }
    };

    saveSettings();
  }, [addLog]);

  // Account Login/Start
  const toggleAccount1 = useCallback(() => {
    setAccount1(prev => {
      const newState = !prev.isRunning;
      addLog(newState ? 'SUCCESS' : 'WARN', newState ? '*** ACCOUNT 1 STARTED ***' : '*** ACCOUNT 1 STOPPED ***');
      
      // Trigger login if starting
      if (newState) {
        fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accounts: [{
              url: 'https://qq188.com',
              username: 'user1',
              password: 'pass1'
            }]
          })
        }).catch(() => addLog('ERROR', 'Login request failed'));
      }
      
      return { ...prev, isRunning: newState };
    });
  }, [addLog]);

  const toggleAccount2 = useCallback(() => {
    setAccount2(prev => {
      const newState = !prev.isRunning;
      addLog(newState ? 'SUCCESS' : 'WARN', newState ? '*** ACCOUNT 2 STARTED ***' : '*** ACCOUNT 2 STOPPED ***');
      
      // Trigger login if starting
      if (newState) {
        fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accounts: [{
              url: 'https://qq188.com',
              username: 'user2',
              password: 'pass2'
            }]
          })
        }).catch(() => addLog('ERROR', 'Login request failed'));
      }
      
      return { ...prev, isRunning: newState };
    });
  }, [addLog]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-gray-950 text-slate-200 font-sans pb-8">
      
      <Header health={health} totalBalance={account1.balance + account2.balance} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Accounts & Config (3 cols) */}
          <div className="lg:col-span-3 space-y-4 flex flex-col">
            {/* Account Panel 1 */}
            <AccountPanel 
              label="Account A (Soft)" 
              initialSportsbook="nova88/saba"
              balance={account1.balance}
              isConnected={health.engineApi === ConnectionStatus.CONNECTED} 
              isRunning={account1.isRunning} 
              ping={account1.ping}
              onToggleBot={toggleAccount1}
            />
            
            {/* Account Panel 2 */}
            <AccountPanel 
              label="Account B (Sharp)" 
              initialSportsbook="qq188/s bet"
              balance={account2.balance}
              isConnected={health.engineApi === ConnectionStatus.CONNECTED} 
              isRunning={account2.isRunning} 
              ping={account2.ping}
              onToggleBot={toggleAccount2}
            />
            
            <div className="flex-1">
              <Configuration config={config} onChange={handleConfigChange} />
            </div>
          </div>

          {/* Right Column: Monitoring & Logs (9 cols) */}
          <div className="lg:col-span-9 space-y-4 flex flex-col">
            <div className="flex-1">
              <Monitoring 
                scannerData={scannerData} 
                historyData={historyData}
                initialBalance={0}
                currentBalance={account1.balance + account2.balance}
              />
            </div>
            <div className="h-72">
              <Logs logs={logs} />
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

export default App
