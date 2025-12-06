import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching health:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 Arbitrage Bot</h1>
        <p>Frontend is running successfully!</p>
        
        {loading ? (
          <p>Loading API status...</p>
        ) : health ? (
          <div className="status">
            <p>✅ API Status: <strong>{health.status}</strong></p>
            <p>🕐 Server Time: {new Date().toLocaleString()}</p>
          </div>
        ) : (
          <p>⚠️ Unable to connect to API</p>
        )}
      </header>
    </div>
  );
}

export default App;
