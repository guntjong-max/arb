import React, { useState } from 'react';
import { configAPI } from '../services/api';

export const ConfigPanel = ({ config, onUpdate }) => {
  const [formData, setFormData] = useState({
    max_bet_tier1: config?.max_bet_tier1 || 5000000,
    max_bet_tier2: config?.max_bet_tier2 || 2000000,
    max_bet_tier3: config?.max_bet_tier3 || 500000,
    min_profit_pct: config?.min_profit_pct || 3.00,
    max_profit_pct: config?.max_profit_pct || 10.00,
    max_minute_ht: config?.max_minute_ht || 35,
    max_minute_ft: config?.max_minute_ft || 85,
    match_filter: config?.match_filter || 'all',
    enabled_markets: config?.enabled_markets || ['ft_hdp', 'ft_ou', 'ht_hdp', 'ht_ou']
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await configAPI.update(formData);
      alert('Configuration updated successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Failed to update configuration');
    }
  };

  const handleMarketToggle = (market) => {
    setFormData(prev => ({
      ...prev,
      enabled_markets: prev.enabled_markets.includes(market)
        ? prev.enabled_markets.filter(m => m !== market)
        : [...prev.enabled_markets, market]
    }));
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold text-white">Configuration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tier Management */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Tier Management</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Max Bet Tier 1 (Big Leagues)
              </label>
              <input
                type="number"
                value={formData.max_bet_tier1}
                onChange={(e) => setFormData({...formData, max_bet_tier1: Number(e.target.value)})}
                className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Max Bet Tier 2 (Mid Leagues)
              </label>
              <input
                type="number"
                value={formData.max_bet_tier2}
                onChange={(e) => setFormData({...formData, max_bet_tier2: Number(e.target.value)})}
                className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Max Bet Tier 3 (Small Leagues)
              </label>
              <input
                type="number"
                value={formData.max_bet_tier3}
                onChange={(e) => setFormData({...formData, max_bet_tier3: Number(e.target.value)})}
                className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
              />
            </div>
          </div>
        </div>

        {/* Profit Settings */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Profit Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Min Profit % (Default: 3%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.min_profit_pct}
                onChange={(e) => setFormData({...formData, min_profit_pct: Number(e.target.value)})}
                className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Max Profit % (Default: 10%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.max_profit_pct}
                onChange={(e) => setFormData({...formData, max_profit_pct: Number(e.target.value)})}
                className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
              />
            </div>
          </div>
        </div>

        {/* Time Filter */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Time Filter</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Max Minute HT (Default: 35)
              </label>
              <input
                type="number"
                value={formData.max_minute_ht}
                onChange={(e) => setFormData({...formData, max_minute_ht: Number(e.target.value)})}
                className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Max Minute FT (Default: 85)
              </label>
              <input
                type="number"
                value={formData.max_minute_ft}
                onChange={(e) => setFormData({...formData, max_minute_ft: Number(e.target.value)})}
                className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
              />
            </div>
          </div>
        </div>

        {/* Match Filter */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Match Filter</h3>
          <div className="flex gap-4">
            {['prematch', 'live', 'all'].map(filter => (
              <label key={filter} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="match_filter"
                  value={filter}
                  checked={formData.match_filter === filter}
                  onChange={(e) => setFormData({...formData, match_filter: e.target.value})}
                  className="form-radio text-blue-600"
                />
                <span className="text-dark-text capitalize">{filter}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Market Filter */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Market Filter</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'ft_hdp', label: 'FT HDP' },
              { id: 'ft_ou', label: 'FT O/U' },
              { id: 'ft_1x2', label: 'FT 1X2' },
              { id: 'ht_hdp', label: 'HT HDP' },
              { id: 'ht_ou', label: 'HT O/U' },
              { id: 'ht_1x2', label: 'HT 1X2' }
            ].map(market => (
              <label key={market.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled_markets.includes(market.id)}
                  onChange={() => handleMarketToggle(market.id)}
                  className="form-checkbox text-blue-600 rounded"
                />
                <span className="text-dark-text">{market.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
};
