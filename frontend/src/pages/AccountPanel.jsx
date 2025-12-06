import React, { useState, useEffect } from 'react';
import { accountsAPI } from '../services/api';

export const AccountPanel = () => {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sportsbook: 'nova88',
    url: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    loadAccounts();
    // Refresh balances every 30 seconds
    const interval = setInterval(loadAccounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await accountsAPI.getAll();
      if (response.data.success) {
        setAccounts(response.data.accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await accountsAPI.create(formData);
      setShowForm(false);
      setFormData({ sportsbook: 'nova88', url: '', username: '', password: '' });
      loadAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountsAPI.delete(id);
        loadAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-500/20';
      case 'offline': return 'text-gray-400 bg-gray-500/20';
      case 'error': return 'text-red-400 bg-red-500/20';
      case 'suspended': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Account Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Account'}
        </button>
      </div>

      {/* Add Account Form */}
      {showForm && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Add New Account</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Sportsbook
                </label>
                <select
                  value={formData.sportsbook}
                  onChange={(e) => setFormData({...formData, sportsbook: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
                  required
                >
                  <option value="nova88">Nova88</option>
                  <option value="qq188">QQ188</option>
                  <option value="sbobet">SBOBET</option>
                  <option value="maxbet">Maxbet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
                  placeholder="https://..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-dark-text"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
            >
              Create Account
            </button>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map(account => (
          <div key={account.id} className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {account.sportsbook.toUpperCase()}
                </h3>
                <p className="text-sm text-dark-textMuted">@{account.username}</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(account.status)}`}>
                {account.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-textMuted">Balance:</span>
                <span className="text-white font-bold">
                  {account.currency} {account.balance?.toLocaleString() || '0.00'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-textMuted">Last Update:</span>
                <span className="text-dark-text">
                  {account.last_balance_update ? new Date(account.last_balance_update).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(account.id)}
                className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && !showForm && (
        <div className="text-center py-12 text-dark-textMuted">
          <p>No accounts configured. Click "Add Account" to get started.</p>
        </div>
      )}
    </div>
  );
};
