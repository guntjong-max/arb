import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { LogEntry } from '../types';

interface LogsProps {
  logs: LogEntry[];
}

export const Logs: React.FC<LogsProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center">
          <Terminal className="w-4 h-4 mr-2 text-indigo-400" /> System Logs
        </h2>
        <span className="text-[10px] text-slate-500 font-mono">{logs.length} entries</span>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar bg-black/20">
        {logs.length === 0 && <div className="text-slate-600 text-center mt-10">Waiting for logs...</div>}
        {logs.map((log) => {
          let color = 'text-slate-400';
          if (log.level === 'INFO') color = 'text-blue-400';
          if (log.level === 'WARN') color = 'text-yellow-400';
          if (log.level === 'ERROR') color = 'text-red-400';
          if (log.level === 'SUCCESS') color = 'text-emerald-400';

          return (
            <div key={log.id} className="flex space-x-2 hover:bg-white/5 p-0.5 rounded">
              <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
              <span className={`font-bold shrink-0 w-14 ${color}`}>{log.level}</span>
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
};
