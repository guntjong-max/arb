import React, { useState, useEffect } from 'react';
import { historyAPI, scannerAPI } from '../services/api';

export const MonitoringCenter = ({ opportunities, bets, logs }) => {
  const [historyBets, setHistoryBets] = useState([]);
  const [profitSummary, setProfitSummary] = useState(null);
  const [scannerStats, setScannerStats] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [betsRes, profitRes, statsRes] = await Promise.all([
        historyAPI.getBets({ limit: 50 }),
        historyAPI.getProfitSummary('today'),
        scannerAPI.getStats()
      ]);
      
      if (betsRes.data.success) setHistoryBets(betsRes.data.bets);
      if (profitRes.data.success) setProfitSummary(profitRes.data.summary);
      if (statsRes.data.success) setScannerStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'text-green-400';
      case 'running': return 'text-yellow-400';
      case 'rejected': return 'text-red-400';
      case 'won': return 'text-green-500 font-bold';
      case 'lost': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': case 'critical': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="text-dark-textMuted text-sm mb-1">Detected Today</div>
          <div className="text-2xl font-bold text-white">{scannerStats?.detected_count || 0}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="text-dark-textMuted text-sm mb-1">Executing</div>
          <div className="text-2xl font-bold text-yellow-400">{scannerStats?.executing_count || 0}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="text-dark-textMuted text-sm mb-1">Completed Today</div>
          <div className="text-2xl font-bold text-green-400">{scannerStats?.completed_today || 0}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <div className="text-dark-textMuted text-sm mb-1">Profit Today</div>
          <div className="text-2xl font-bold text-green-500">
            IDR {(profitSummary?.net_profit || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Live Scanner Table */}
      <div className="bg-dark-card border border-dark-border rounded-lg">
        <div className="p-4 border-b border-dark-border">
          <h3 className="text-lg font-bold text-white">Live Scanner - Detected Opportunities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-bg">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Match</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Market</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Odds A</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Odds B</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Profit %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Sites</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {opportunities.slice(0, 20).map((opp, idx) => (
                <tr key={idx} className="hover:bg-dark-bg/50">
                  <td className="px-4 py-3 text-sm text-dark-text">{opp.match || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-dark-text">{opp.market_type?.toUpperCase()}</td>
                  <td className="px-4 py-3 text-sm text-dark-text">{opp.odds_a?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-dark-text">{opp.odds_b?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-400">{opp.profit_pct?.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-xs text-dark-textMuted">
                    {opp.sportsbook_a} / {opp.sportsbook_b}
                  </td>
                  <td className="px-4 py-3 text-xs text-dark-textMuted">
                    {new Date(opp.detected_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {opportunities.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-dark-textMuted">
                    No opportunities detected yet. Waiting for scanner...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="bg-dark-card border border-dark-border rounded-lg">
        <div className="p-4 border-b border-dark-border">
          <h3 className="text-lg font-bold text-white">Execution History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-bg">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Match</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Pick</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Odds</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Stake</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-textMuted uppercase">Site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {historyBets.slice(0, 20).map((bet) => (
                <tr key={bet.id} className="hover:bg-dark-bg/50">
                  <td className="px-4 py-3 text-xs text-dark-textMuted">
                    {new Date(bet.placed_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-text">{bet.match || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-dark-text">{bet.pick}</td>
                  <td className="px-4 py-3 text-sm text-dark-text">{bet.odds?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-dark-text">{bet.stake?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-medium ${getStatusColor(bet.status)}`}>
                      {bet.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-dark-textMuted">{bet.sportsbook?.toUpperCase()}</td>
                </tr>
              ))}
              {historyBets.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-dark-textMuted">
                    No bet history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs Window */}
      <div className="bg-dark-card border border-dark-border rounded-lg">
        <div className="p-4 border-b border-dark-border">
          <h3 className="text-lg font-bold text-white">Activity Logs</h3>
        </div>
        <div className="p-4 h-64 overflow-y-auto font-mono text-xs">
          {logs.slice(0, 100).map((log, idx) => (
            <div key={idx} className={`mb-1 ${getLevelColor(log.level)}`}>
              <span className="text-dark-textMuted">
                [{new Date(log.created_at || log.timestamp).toLocaleTimeString()}]
              </span>
              {' '}
              <span className="font-bold">[{log.level?.toUpperCase()}]</span>
              {' '}
              {log.message}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center text-dark-textMuted py-8">
              No logs available. System is starting...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
