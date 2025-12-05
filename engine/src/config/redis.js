// src/config/redis.js - Redis connection
const Redis = require('ioredis');
const logger = require('./logger');

let redisClient;
let redisPub;
let redisSub;

/**
 * Parse Redis URL to extract connection config
 * Format: redis://[:password@]host[:port][/db]
 */
function parseRedisUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const config = {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port) || 6379,
    };

    // Extract password (URL format: redis://:password@host:port)
    if (parsedUrl.password) {
      config.password = parsedUrl.password;
    } else if (parsedUrl.username) {
      // Handle format redis://password@host:port (username as password)
      config.password = parsedUrl.username;
    }

    // Extract database number if specified
    const dbMatch = parsedUrl.pathname.match(/^\/(\d+)$/);
    if (dbMatch) {
      config.db = parseInt(dbMatch[1]);
    }

    return config;
  } catch (error) {
    logger.error('Failed to parse REDIS_URL:', error.message);
    throw new Error(`Invalid REDIS_URL format: ${error.message}`);
  }
}

/**
 * Get Redis configuration from environment
 */
function getRedisConfig() {
  let config = {};

  // Option 1: Use REDIS_URL (preferred)
  if (process.env.REDIS_URL) {
    logger.info(`Using REDIS_URL: ${process.env.REDIS_URL.replace(/:[^:@]+@/, ':****@')}`);
    config = parseRedisUrl(process.env.REDIS_URL);
  } 
  // Option 2: Use individual environment variables
  else {
    logger.info('Using individual Redis environment variables');
    config = {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    };
    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }
  }

  // Add connection options
  config.retryStrategy = (times) => {
    if (times > 10) {
      logger.error(`Redis retry limit exceeded (${times} attempts)`);
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 3000); // Exponential backoff: 100ms, 200ms, 300ms... max 3s
    logger.warn(`Redis connection retry #${times} in ${delay}ms`);
    return delay;
  };

  config.maxRetriesPerRequest = 3;
  config.enableReadyCheck = true;
  config.connectTimeout = 10000; // 10 seconds
  config.lazyConnect = false; // Connect immediately

  // Log final config (mask password)
  const logConfig = { ...config };
  if (logConfig.password) {
    logConfig.password = '****';
  }
  logger.info('Redis config:', JSON.stringify(logConfig, null, 2));

  return config;
}

async function connectRedis() {
  try {
    logger.info('Initializing Redis connection...');
    const redisConfig = getRedisConfig();

    // Main Redis client
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('✓ Redis client connected to server');
    });

    redisClient.on('ready', () => {
      logger.info('✓ Redis client ready to handle commands');
    });

    redisClient.on('error', (err) => {
      if (err.message.includes('NOAUTH')) {
        logger.error('❌ Redis authentication failed! Check password in REDIS_URL');
      } else if (err.message.includes('ECONNREFUSED')) {
        logger.error('❌ Redis connection refused! Is Redis server running?');
      } else {
        logger.error('❌ Redis error:', err.message);
      }
    });

    redisClient.on('close', () => {
      logger.warn('⚠ Redis connection closed');
    });

    redisClient.on('reconnecting', (delay) => {
      logger.info(`⟳ Redis reconnecting in ${delay}ms...`);
    });

    // Test connection with timeout
    logger.info('Testing Redis connection with PING...');
    const pingResult = await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PING timeout after 5s')), 5000)
      )
    ]);
    logger.info(`✓ Redis PING successful: ${pingResult}`);

    // Create Pub/Sub clients
    logger.info('Creating Redis Pub/Sub clients...');
    redisPub = new Redis(redisConfig);
    redisSub = new Redis(redisConfig);

    redisPub.on('error', (err) => logger.error('Redis Pub error:', err.message));
    redisSub.on('error', (err) => logger.error('Redis Sub error:', err.message));

    // Verify Pub/Sub clients
    await redisPub.ping();
    await redisSub.ping();
    logger.info('✓ Redis Pub/Sub clients ready');

    return { redisClient, redisPub, redisSub };
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client closed');
  }
  if (redisPub) {
    await redisPub.quit();
  }
  if (redisSub) {
    await redisSub.quit();
  }
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

function getRedisPub() {
  if (!redisPub) {
    throw new Error('Redis pub client not initialized.');
  }
  return redisPub;
}

function getRedisSub() {
  if (!redisSub) {
    throw new Error('Redis sub client not initialized.');
  }
  return redisSub;
}

module.exports = {
  connectRedis,
  closeRedis,
  getRedisClient,
  getRedisPub,
  getRedisSub
};
