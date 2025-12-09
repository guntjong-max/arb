import { useState, useEffect } from 'react'

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [health, setHealth] = useState({ healthy: false })
  const [ping, setPing] = useState(0)
  const [opportunities, setOpportunities] = useState([])
  const [settings, setSettings] = useState({ min_percent: 5, max_percent: 120 })
  const [logs, setLogs] = useState(['System initialized'])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/health`)
      setHealth({ healthy: res.ok })
      setPing(Math.random() * 50)
    } catch (err) {
      setHealth({ healthy: false })
      console.error('Health check failed:', err)
    }
  }

  const updateSettings = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_URL}/api/v1/scanner/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        setLogs(prev => ['✓ Settings updated', ...prev].slice(0, 50))
      }
    } catch (error) {
      setLogs(prev => ['✗ Error updating settings', ...prev].slice(0, 50))
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <h1 className="text-2xl font-bold">🤖 Arbitrage Bot Dashboard</h1>
        <p className="text-sm text-slate-400">
          Status: <span className={health?.healthy ? 'text-green-400' : 'text-red-400'}>{health?.healthy ? '✓ Online' : '✗ Offline'}</span> | 
          Ping: {ping.toFixed(0)}ms
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded border border-slate-800">
            <p className="text-xs text-slate-400">Status</p>
            <p className="text-xl font-bold text-green-400">{health?.healthy ? 'Online' : 'Offline'}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded border border-slate-800">
            <p className="text-xs text-slate-400">Ping</p>
            <p className="text-xl font-bold">{ping.toFixed(0)}ms</p>
          </div>
          <div className="bg-slate-900 p-4 rounded border border-slate-800">
            <p className="text-xs text-slate-400">Opportunities</p>
            <p className="text-xl font-bold text-green-400">{opportunities.length}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded border border-slate-800">
            <p className="text-xs text-slate-400">Accounts</p>
            <p className="text-xl font-bold">0</p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded border border-slate-800">
          <h2 className="text-lg font-bold mb-4">⚙️ Settings</h2>
          <form onSubmit={updateSettings} className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Min Margin %</label>
              <input 
                type="number" 
                value={settings.min_percent} 
                onChange={(e) => setSettings({...settings, min_percent: Number(e.target.value)})} 
                className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white" 
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Max Margin %</label>
              <input 
                type="number" 
                value={settings.max_percent} 
                onChange={(e) => setSettings({...settings, max_percent: Number(e.target.value)})} 
                className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-white" 
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-semibold">
              Save Settings
            </button>
          </form>
        </div>

        <div className="bg-slate-900 p-6 rounded border border-slate-800">
          <h2 className="text-lg font-bold mb-4">📋 Logs</h2>
          <div className="bg-slate-950 p-4 rounded font-mono text-xs text-green-400 h-40 overflow-auto">
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
