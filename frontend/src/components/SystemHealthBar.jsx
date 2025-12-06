// System Health Status Bar Component
import React from 'react';

const StatusIndicator = ({ status, label }) => {
  const getColor = () => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-500';
      case 'standby':
      case 'ready':
        return 'bg-yellow-500';
      case 'unhealthy':
      case 'offline':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${getColor()}`}></div>
        <div className={`absolute inset-0 w-3 h-3 rounded-full ${getColor()} animate-ping opacity-75`}></div>
      </div>
      <span className="text-sm font-medium text-dark-text">{label}</span>
      <span className="text-xs text-dark-textMuted capitalize">{status || 'unknown'}</span>
    </div>
  );
};

export const SystemHealthBar = ({ systemHealth }) => {
  const health = systemHealth?.status || {
    api: 'unknown',
    database: 'unknown',
    redis: 'unknown',
    workers: 'unknown'
  };

  return (
    <div className="bg-dark-card border-b border-dark-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h2 className="text-lg font-bold text-dark-text">System Status</h2>
          <div className="flex items-center gap-6">
            <StatusIndicator status={health.api} label="ENGINE API" />
            <StatusIndicator status={health.database} label="DATABASE" />
            <StatusIndicator status={health.redis} label="REDIS" />
            <StatusIndicator status={health.workers} label="WORKER/BROWSER" />
          </div>
        </div>
        
        <div className="text-xs text-dark-textMuted">
          Last updated: {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString() : 'N/A'}
        </div>
      </div>
    </div>
  );
};
