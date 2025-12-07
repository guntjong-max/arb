import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:3001'

function App() {
  const [accounts, setAccounts] = useState([])
  const [settings, setSettings] = useState({
    min_percentage: 3,
    max_percentage: 10,
    ht_time_last_bet: 35,
    ft_time_last_bet: 75,
    match_filter: 'all',
    ft_hdp: true,
    ft_ou: true,
    ft_1x2: false,
    ht_hdp: true,
    ht_ou: true,
    ht_1x2: false
  })
  const [health, setHealth] = useState({ healthy: false })
  const [ping, setPing] = useState(0)
  const [logs, setLogs] = useState([])
  const [ws, setWs] = useState(null)

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/login-status`)
      const data = await res.json()
      setAccounts(data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`)
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  // Fetch health
  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/system-health`)
      const data = await res.json()
      setHealth(data)
    } catch (error) {
      console.error('Error fetching health:', error)
    }
  }

  // Handle login
  const handleLogin = async (accountId) => {
    try {
      await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      })
      addLog(`Login queued for account ${accountId}`)
    } catch (error) {
      console.error('Error logging in:', error)
    }
  }

  // Handle settings update
  const handleUpdateSettings = async () => {
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      addLog('Settings updated')
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  // Start scanning
  const handleStartScan = async () => {
    try {
      await fetch(`${API_URL}/api/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      addLog('Scanning started')
    } catch (error) {
      console.error('Error starting scan:', error)
    }
  }

  // Add log
  const addLog = (message) => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      message
    }, ...prev].slice(0, 20))
  }

  // WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:3001')
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      addLog('WebSocket connected')
    }
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.event === 'ping') {
          setPing(data.data.ms)
        } else if (data.event === 'login') {
          addLog(`Account ${data.data.accountId}: ${data.data.status}`)
          fetchAccounts()
        } else if (data.event === 'scan') {
          addLog(`Scan: Found ${data.data.count} opportunities`)
        } else if (data.event === 'bet_queued') {
          addLog(`Bet queued: ${data.data.matchName} - Stake: ${data.data.stake}`)
        } else if (data.event === 'bet_executed') {
          addLog(`Bet executed: ${data.data.matchName} - Stake: ${data.data.stake}`)
        }
      } catch (error) {
        console.error('WebSocket message error:', error)
      }
    }
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected')
      addLog('WebSocket disconnected')
    }
    
    setWs(websocket)
    
    return () => {
      websocket.close()
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchAccounts()
    fetchSettings()
    fetchHealth()
    
    const interval = setInterval(() => {
      fetchAccounts()
      fetchHealth()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sportsbook Automation - Minimal</h1>
        
        {/* Status Bar */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${health.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">Backend: {health.healthy ? 'Healthy' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">Ping: {ping}ms</span>
            </div>
          </div>
          <button
            onClick={handleStartScan}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Start Scanning
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Account Login Panel */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Panel Login</h2>
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Account {account.id}</span>
                      <div className={`px-2 py-1 rounded text-xs ${
                        account.status === 'online' ? 'bg-green-600' : 
                        account.status === 'logging_in' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}>
                        {account.status}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300 mb-2">
                      <div>Username: {account.username}</div>
                      <div>Balance: ${account.balance}</div>
                    </div>
                    <button
                      onClick={() => handleLogin(account.id)}
                      disabled={account.status === 'online' || account.status === 'logging_in'}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded text-sm w-full"
                    >
                      Login
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Parameter Settings */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Parameter Settings</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Min % (default 3)</label>
                    <input
                      type="number"
                      value={settings.min_percentage}
                      onChange={(e) => setSettings({...settings, min_percentage: parseFloat(e.target.value)})}
                      className="w-full bg-slate-700 rounded px-3 py-2"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Max % (default 10)</label>
                    <input
                      type="number"
                      value={settings.max_percentage}
                      onChange={(e) => setSettings({...settings, max_percentage: parseFloat(e.target.value)})}
                      className="w-full bg-slate-700 rounded px-3 py-2"
                      step="0.1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">HT Time Last Bet (default 35)</label>
                    <input
                      type="number"
                      value={settings.ht_time_last_bet}
                      onChange={(e) => setSettings({...settings, ht_time_last_bet: parseInt(e.target.value)})}
                      className="w-full bg-slate-700 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">FT Time Last Bet (default 75)</label>
                    <input
                      type="number"
                      value={settings.ft_time_last_bet}
                      onChange={(e) => setSettings({...settings, ft_time_last_bet: parseInt(e.target.value)})}
                      className="w-full bg-slate-700 rounded px-3 py-2"
                    />
                  </div>
                </div>
                <button
                  onClick={handleUpdateSettings}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded w-full mt-2"
                >
                  Update Settings
                </button>
              </div>
            </div>

            {/* Match Filter */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Match Filter</h2>
              <div className="space-y-2">
                {['prematch', 'live', 'all'].map((filter) => (
                  <label key={filter} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="match_filter"
                      value={filter}
                      checked={settings.match_filter === filter}
                      onChange={(e) => setSettings({...settings, match_filter: e.target.value})}
                      className="w-4 h-4"
                    />
                    <span className="capitalize">{filter}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Market Filter */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Market Filter</h2>
              <div className="space-y-2">
                {[
                  { key: 'ft_hdp', label: 'FT HDP' },
                  { key: 'ft_ou', label: 'FT O/U' },
                  { key: 'ft_1x2', label: 'FT 1X2' },
                  { key: 'ht_hdp', label: 'HT HDP' },
                  { key: 'ht_ou', label: 'HT O/U' },
                  { key: 'ht_1x2', label: 'HT 1X2' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => setSettings({...settings, [key]: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Live Feed */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Live Feed</h2>
              <div className="bg-slate-900 rounded p-4 h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-slate-400 text-sm">No logs yet...</div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="text-slate-400">[{log.time}]</span>{' '}
                        <span className="text-green-400">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
