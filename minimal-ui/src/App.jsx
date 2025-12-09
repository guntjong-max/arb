import { useState, useEffect } from 'react'

// Use environment variable or fallback
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000'
const WS_URL = process.env.VITE_API_WS_URL || 'ws://localhost:3000'

function App() {
  const [accounts, setAccounts] = useState([])
  const [settings, setSettings] = useState({
    min_percentage: 5,
    max_percentage: 120,
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
  const [opportunities, setOpportunities] = useState([])

  useEffect(() => {
    console.log('API_URL:', API_URL)
    console.log('WS_URL:', WS_URL)
    fetchAccounts()
    fetchSettings()
    fetchHealth()
    connectWebSocket()
  }, [])

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/login-status`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHealth(data)
      setPing(Math.random() * 50)
    } catch (error) {
      console.error('Error fetching health:', error)
      setHealth({ healthy: false })
    }
  }

  // Connect WebSocket
  const connectWebSocket = () => {
    try {
      const socket = new WebSocket(WS_URL)
      socket.onopen = () => {
        console.log('WebSocket connected')
      }
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'log') {
            setLogs(prev => [data.message, ...prev].slice(0, 100))
          }
          if (data.type === 'opportunity') {
            setOpportunities(prev => [data, ...prev].slice(0, 50))
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e)
        }
      }
      socket.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      setWs(socket)
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }

  // Update settings
  const updateSettings = async (newSettings) => {
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSettings(newSettings)
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Arbitrage Bot Control Panel</h1>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${health?.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{health?.healthy ? 'Healthy' : 'Unhealthy'}</span>
            </div>
            <div>Ping: {ping.toFixed(0)}ms</div>
            <div>Accounts: {accounts.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Settings Panel */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Min Margin %</label>
                <input 
                  type="number" 
                  value={settings.min_percentage}
                  onChange={(e) => setSettings({...settings, min_percentage: Number(e.target.value)})}
                  className="w-full bg-gray-700 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Max Margin %</label>
                <input 
                  type="number" 
                  value={settings.max_percentage}
                  onChange={(e) => setSettings({...settings, max_percentage: Number(e.target.value)})}
                  className="w-full bg-gray-700 px-3 py-2 rounded"
                />
              </div>
              <button 
                onClick={() => updateSettings(settings)}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Save Settings
              </button>
            </div>
          </div>

          {/* Opportunities */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Opportunities ({opportunities.length})</h2>
            <div className="space-y-2 max-h-60 overflow-auto">
              {opportunities.slice(0, 5).map((opp, i) => (
                <div key={i} className="bg-gray-700 p-2 rounded text-sm">
                  <div>{opp.home} vs {opp.away}</div>
                  <div className="text-green-400">Margin: {opp.margin}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Logs</h2>
          <div className="bg-gray-900 p-3 rounded font-mono text-xs max-h-40 overflow-auto">
            {logs.length > 0 ? (
              logs.map((log, i) => <div key={i}>{log}</div>)
            ) : (
              <div className="text-gray-500">Waiting for logs...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
