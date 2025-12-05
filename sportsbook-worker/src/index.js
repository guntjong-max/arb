// src/index.js - Main entry point
require('dotenv').config();
const logger = require('./config/logger');
const SportsbookWorker = require('./worker');

async function main() {
  console.log('='.repeat(60));
  console.log('Sportsbook Worker - Browser Automation');
  console.log('='.repeat(60));
  console.log();

  const workerName = process.env.WORKER_NAME || 'worker-bet365-1';
  const sportsbookName = process.env.SPORTSBOOK_NAME || 'Bet365';
  const scrapeInterval = parseInt(process.env.SCRAPE_INTERVAL || '15000');

  logger.info('Worker configuration:', {
    workerName,
    sportsbookName,
    scrapeInterval
  });

  const worker = new SportsbookWorker({
    workerName,
    sportsbookName,
    scrapeInterval
  });

  // Graceful shutdown handlers
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start worker
  try {
    await worker.start();
  } catch (error) {
    logger.error('Worker failed to start:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
