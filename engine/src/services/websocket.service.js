// src/services/websocket.service.js - Real-time WebSocket service
const WebSocket = require('ws');
const logger = require('../config/logger');
const { getPool } = require('../config/database');
const { getRedisClient } = require('../config/redis');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // clientId -> ws connection
    this.healthCheckInterval = null;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      
      logger.info(`WebSocket client connected: ${clientId}`);
      
      // Store client connection
      this.clients.set(clientId, {
        ws,
        subscriptions: new Set(),
        lastPing: Date.now(),
        metadata: {}
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      });

      // Handle messages from client
      ws.on('message', (message) => {
        this.handleClientMessage(clientId, message);
      });

      // Handle client disconnect
      ws.on('close', () => {
        logger.info(`WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Pong handler
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });

    // Start health check interval
    this.startHealthCheck();

    logger.info('WebSocket service initialized');
  }

  /**
   * Handle incoming messages from clients
   */
  handleClientMessage(clientId, message) {
    try {
      const data = JSON.parse(message.toString());
      const client = this.clients.get(clientId);
      
      if (!client) return;

      switch (data.type) {
        case 'subscribe':
          // Subscribe to specific channels
          if (data.channels && Array.isArray(data.channels)) {
            data.channels.forEach(channel => {
              client.subscriptions.add(channel);
            });
            this.sendToClient(clientId, {
              type: 'subscribed',
              channels: Array.from(client.subscriptions)
            });
          }
          break;

        case 'unsubscribe':
          // Unsubscribe from channels
          if (data.channels && Array.isArray(data.channels)) {
            data.channels.forEach(channel => {
              client.subscriptions.delete(channel);
            });
            this.sendToClient(clientId, {
              type: 'unsubscribed',
              channels: data.channels
            });
          }
          break;

        case 'ping':
          // Respond to ping
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          logger.warn(`Unknown message type from ${clientId}: ${data.type}`);
      }
    } catch (error) {
      logger.error(`Error handling message from ${clientId}:`, error);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
        return true;
      }
    } catch (error) {
      logger.error(`Error sending to client ${clientId}:`, error);
    }
    return false;
  }

  /**
   * Broadcast to all clients subscribed to a channel
   */
  broadcast(channel, data) {
    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel) || client.subscriptions.has('all')) {
        if (this.sendToClient(clientId, { channel, ...data })) {
          sentCount++;
        }
      }
    });

    return sentCount;
  }

  /**
   * Broadcast system health status
   */
  async broadcastSystemHealth() {
    try {
      const pool = getPool();
      const redis = getRedisClient();

      const health = {
        type: 'system_health',
        timestamp: new Date().toISOString(),
        status: {
          api: 'healthy',
          database: 'unknown',
          redis: 'unknown',
          workers: 'unknown'
        }
      };

      // Check database
      try {
        await pool.query('SELECT 1');
        health.status.database = 'healthy';
      } catch (error) {
        health.status.database = 'unhealthy';
      }

      // Check Redis
      try {
        await redis.ping();
        health.status.redis = 'healthy';
      } catch (error) {
        health.status.redis = 'unhealthy';
      }

      // Check workers (from Redis or database)
      try {
        const workerCount = await redis.get('workers:active_count');
        health.status.workers = parseInt(workerCount) > 0 ? 'healthy' : 'standby';
      } catch (error) {
        health.status.workers = 'unknown';
      }

      this.broadcast('system_health', health);
    } catch (error) {
      logger.error('Error broadcasting system health:', error);
    }
  }

  /**
   * Broadcast new opportunity
   */
  broadcastOpportunity(opportunity) {
    this.broadcast('opportunities', {
      type: 'new_opportunity',
      data: opportunity,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast bet status update
   */
  broadcastBetStatus(bet) {
    this.broadcast('bets', {
      type: 'bet_status_update',
      data: bet,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast scanner stats
   */
  broadcastScannerStats(stats) {
    this.broadcast('scanner_stats', {
      type: 'scanner_stats',
      data: stats,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast activity log
   */
  broadcastLog(log) {
    this.broadcast('logs', {
      type: 'activity_log',
      data: log,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast account balance update
   */
  broadcastBalanceUpdate(account) {
    this.broadcast('balances', {
      type: 'balance_update',
      data: account,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start health check interval
   */
  startHealthCheck() {
    // Ping all clients every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        // Check if client responded to ping in last 60 seconds
        if (now - client.lastPing > 60000) {
          logger.warn(`Client ${clientId} not responding, disconnecting`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        // Send ping
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });

      // Broadcast system health every 10 seconds
      if (now % 10000 < 30000) {
        this.broadcastSystemHealth();
      }
    }, 30000);
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connected clients count
   */
  getConnectedCount() {
    return this.clients.size;
  }

  /**
   * Shutdown WebSocket service
   */
  shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutting down');
    });

    if (this.wss) {
      this.wss.close();
    }

    logger.info('WebSocket service shut down');
  }
}

// Singleton instance
const wsService = new WebSocketService();

module.exports = wsService;
