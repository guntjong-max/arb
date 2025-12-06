// WebSocket hook for real-time updates
import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (url = 'ws://localhost:3000/ws') => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [bets, setBets] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const subscribers = useRef(new Map());

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Subscribe to all channels
        ws.current.send(JSON.stringify({
          type: 'subscribe',
          channels: ['system_health', 'opportunities', 'bets', 'logs', 'balances', 'scanner_stats']
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'system_health':
              setSystemHealth(data);
              break;
            
            case 'new_opportunity':
              setOpportunities(prev => [data.data, ...prev].slice(0, 100));
              break;
            
            case 'bet_status_update':
              setBets(prev => {
                const index = prev.findIndex(b => b.id === data.data.id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = data.data;
                  return updated;
                }
                return [data.data, ...prev].slice(0, 100);
              });
              break;
            
            case 'activity_log':
              setLogs(prev => [data.data, ...prev].slice(0, 500));
              break;
            
            default:
              // Generic message
              setMessages(prev => [data, ...prev].slice(0, 100));
          }
          
          // Notify subscribers
          const channel = data.channel || data.type;
          if (subscribers.current.has(channel)) {
            subscribers.current.get(channel).forEach(callback => callback(data));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt reconnect after 5 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
    }
  }, []);

  const send = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const subscribe = useCallback((channel, callback) => {
    if (!subscribers.current.has(channel)) {
      subscribers.current.set(channel, new Set());
    }
    subscribers.current.get(channel).add(callback);
    
    // Return unsubscribe function
    return () => {
      if (subscribers.current.has(channel)) {
        subscribers.current.get(channel).delete(callback);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    messages,
    systemHealth,
    opportunities,
    bets,
    logs,
    send,
    subscribe,
    reconnect: connect
  };
};
