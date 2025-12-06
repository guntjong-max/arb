// src/server.js - Express server setup
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./config/logger');
const { register: metricsRegister } = require('./utils/metrics');

// Routes
const healthRoutes = require('./routes/health.routes');
const jobRoutes = require('./routes/job.routes');
const workerRoutes = require('./routes/worker.routes');
const accountsRoutes = require('./routes/accounts.routes');
const configRoutes = require('./routes/config.routes');
const scannerRoutes = require('./routes/scanner.routes');
const historyRoutes = require('./routes/history.routes');

async function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  });

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api/v1/jobs', jobRoutes);
  app.use('/api/v1/workers', workerRoutes);
  app.use('/api/v1/accounts', accountsRoutes);
  app.use('/api/v1/config', configRoutes);
  app.use('/api/v1/scanner', scannerRoutes);
  app.use('/api/v1/history', historyRoutes);

  // Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', metricsRegister.contentType);
      res.end(await metricsRegister.metrics());
    } catch (error) {
      res.status(500).end(error.message);
    }
  });

  // API documentation (basic)
  app.get('/api/docs', (req, res) => {
    res.json({
      name: 'Arbitrage Bot Engine API',
      version: '1.0.0',
      endpoints: {
        health: {
          'GET /health': 'System health check',
          'GET /health/detailed': 'Detailed health check'
        },
        jobs: {
          'POST /api/v1/jobs': 'Submit new job',
          'GET /api/v1/jobs/:id': 'Get job status',
          'GET /api/v1/jobs': 'List jobs',
          'DELETE /api/v1/jobs/:id': 'Cancel job'
        },
        workers: {
          'POST /api/v1/workers/register': 'Register worker',
          'POST /api/v1/workers/:id/heartbeat': 'Worker heartbeat',
          'GET /api/v1/workers': 'List workers',
          'GET /api/v1/workers/:id': 'Get worker details'
        },
        accounts: {
          'GET /api/v1/accounts': 'List accounts',
          'POST /api/v1/accounts': 'Create account',
          'GET /api/v1/accounts/:id': 'Get account',
          'PUT /api/v1/accounts/:id': 'Update account',
          'DELETE /api/v1/accounts/:id': 'Delete account'
        },
        config: {
          'GET /api/v1/config': 'Get configuration',
          'PUT /api/v1/config': 'Update configuration',
          'POST /api/v1/config/emergency-stop': 'Emergency stop',
          'POST /api/v1/config/auto-trading': 'Toggle auto trading'
        },
        scanner: {
          'GET /api/v1/scanner/opportunities': 'Get opportunities',
          'GET /api/v1/scanner/live-feed': 'Live feed',
          'GET /api/v1/scanner/stats': 'Scanner stats'
        },
        history: {
          'GET /api/v1/history/bets': 'Bet history',
          'GET /api/v1/history/logs': 'Activity logs',
          'GET /api/v1/history/profit-summary': 'Profit summary',
          'GET /api/v1/history/performance': 'Performance metrics'
        },
        metrics: {
          'GET /metrics': 'Prometheus metrics'
        }
      }
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      error: err.name || 'Error',
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}

module.exports = { createServer };
