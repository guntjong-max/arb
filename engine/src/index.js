// src/index.js - Entry point for Arbitrage Bot Engine
require('dotenv').config();
const logger = require('./config/logger');
const { createServer } = require('./server');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeMetrics } = require('./utils/metrics');

let server;
let httpServer;

// Retry helper function
async function retryConnection(fn, name, maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fn();
      logger.info(`${name} connected successfully`);
      return;
    } catch (error) {
      logger.warn(`${name} connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt === maxRetries) {
        logger.error(`${name} connection failed after ${maxRetries} attempts`);
        throw error;
      }
      logger.info(`Retrying ${name} connection in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function start() {
  try {
    logger.info('Starting Arbitrage Bot Engine...');
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Paper Trading Mode: ${process.env.PAPER_TRADING_MODE}`);

    // Initialize metrics
    initializeMetrics();
    logger.info('Metrics initialized');

    // Connect to databases with retry
    await retryConnection(connectDatabase, 'PostgreSQL', 10, 3000);
    logger.info('PostgreSQL connected');

    await retryConnection(connectRedis, 'Redis', 10, 3000);
    logger.info('Redis connected');

    // Create and start server
    const app = await createServer();
    const PORT = process.env.PORT || 3000;
    
    httpServer = app.listen(PORT, () => {
      logger.info(`Engine HTTP Server listening on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/docs`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Close HTTP server
      if (httpServer) {
        httpServer.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close database connections
      const { closeDatabase } = require('./config/database');
      const { closeRedis } = require('./config/redis');
      
      try {
        await closeDatabase();
        logger.info('Database connection closed');
        
        await closeRedis();
        logger.info('Redis connection closed');
        
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    logger.error('Failed to start engine:', error);
    process.exit(1);
  }
}

// Start the engine
start();
