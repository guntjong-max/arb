import React from 'react';

interface StatusLedProps {
  healthy?: boolean;
  label?: string;
}

export const StatusLed: React.FC<StatusLedProps> = ({ healthy = false, label = 'Status' }) => {
  const colorClass = healthy ? 'bg-green-500' : 'bg-red-500';
  const pulseClass = healthy ? 'animate-pulse' : '';

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${colorClass} ${pulseClass}`} />
      <span className="text-xs font-bold text-gray-300">{label}</span>
    </div>
  );
};

export default StatusLed;
