// src/index.js - Entry point for Arbitrage Bot Engine

// === CRITICAL ERROR HANDLERS (BEFORE ANY IMPORTS) ===
// These catch crashes that happen before logger is initialized
console.log('=== ENGINE PROCESS START ===');
console.log('PID:', process.pid);
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

// Catch uncaught exceptions EARLY
process.on('uncaughtException', (err) => {
  console.error('!!! FATAL: UNCAUGHT EXCEPTION !!!');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('Exiting with code 1');
  process.exit(1);
});

// Catch unhandled rejections EARLY
process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! FATAL: UNHANDLED REJECTION !!!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Exiting with code 1');
  process.exit(1);
});

console.log('Early error handlers registered');
console.log('=================================');

// Early console logging before logger init
console.log('[STARTUP] Loading environment...');
require('dotenv').config();
console.log('[STARTUP] Environment loaded. NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('[STARTUP] REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');

const logger = require('./config/logger');
const { createServer } = require('./server');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeMetrics } = require('./utils/metrics');

let server;
let httpServer;

async function start() {
  try {
    logger.info('Starting Arbitrage Bot Engine...');
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Paper Trading Mode: ${process.env.PAPER_TRADING_MODE}`);

    // Initialize metrics
    initializeMetrics();
    logger.info('Metrics initialized');

    // Connect to databases
    await connectDatabase();
    logger.info('PostgreSQL connected');

    await connectRedis();
    logger.info('Redis connected');

    // Create and start server
    const app = await createServer();
    const PORT = process.env.PORT || 3000;
    const HOST = '0.0.0.0';  // Bind to all interfaces for Docker
    
    httpServer = app.listen(PORT, HOST, () => {
      logger.info(`Engine HTTP Server listening on ${HOST}:${PORT}`);
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
