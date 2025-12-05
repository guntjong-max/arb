// src/config/redis.js - Redis connection
const Redis = require('ioredis');
const logger = require('./logger');

let redisClient;
let redisPub;
let redisSub;

/**
 * Parse Redis URL or use individual environment variables
 * Supports format: redis://[:password]@host:port[/db]
 */
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  
  // CRITICAL DEBUG: Log environment variables
  console.log('\n=== REDIS CONFIG DEBUG ===');
  console.log('REDIS_URL:', redisUrl || '(not set)');
  console.log('REDIS_HOST:', process.env.REDIS_HOST || '(not set)');
  console.log('REDIS_PORT:', process.env.REDIS_PORT || '(not set)');
  console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '***SET***' : '(not set)');
  
  let config = {
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 5000);
      logger.info(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
    lazyConnect: false
  };

  // Parse REDIS_URL if provided
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      config.host = url.hostname;
      config.port = parseInt(url.port) || 6379;
      
      // CRITICAL DEBUG: Show URL components
      console.log('URL parsed components:');
      console.log('  hostname:', url.hostname);
      console.log('  port:', url.port);
      console.log('  username:', JSON.stringify(url.username));
      console.log('  password:', JSON.stringify(url.password));
      
      // Extract password from URL (format: redis://:password@host or redis://user:password@host)
      if (url.password) {
        config.password = url.password;
        console.log('  ✅ Password extracted from url.password:', config.password);
      } else if (url.username && !url.password) {
        // Handle format redis://:password@host where password is in username field
        config.password = url.username;
        console.log('  ⚠️  Password extracted from url.username:', config.password);
      } else {
        console.log('  ❌ NO PASSWORD FOUND IN URL!');
      }
      
      // Extract database number if specified
      if (url.pathname && url.pathname.length > 1) {
        const db = parseInt(url.pathname.substring(1));
        if (!isNaN(db)) {
          config.db = db;
        }
      }
      
      console.log('Final parsed config:', {
        host: config.host,
        port: config.port,
        password: config.password ? `***${config.password.length} chars***` : null,
        db: config.db || 0
      });
      console.log('=== END REDIS CONFIG DEBUG ===\n');
      
      logger.info('Redis config parsed from REDIS_URL', {
        host: config.host,
        port: config.port,
        hasPassword: !!config.password,
        passwordLength: config.password ? config.password.length : 0,
        db: config.db || 0
      });
    } catch (error) {
      logger.error('Failed to parse REDIS_URL, falling back to individual env vars', error);
      // Fall through to individual env var parsing
    }
  }
  
  // Fallback to individual environment variables if REDIS_URL not parsed
  if (!config.host) {
    config.host = process.env.REDIS_HOST || 'redis';
    config.port = parseInt(process.env.REDIS_PORT) || 6379;
    config.password = process.env.REDIS_PASSWORD;
    
    logger.info('Redis config from individual env vars', {
      host: config.host,
      port: config.port,
      hasPassword: !!config.password
    });
  }

  return config;
}

async function connectRedis() {
  try {
    logger.info('Initializing Redis connection...');
    const redisConfig = getRedisConfig();

    // Main Redis client
    logger.info('Creating main Redis client...');
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis main client connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis main client ready to accept commands');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis main client error:', {
        message: err.message,
        code: err.code,
        command: err.command
      });
    });

    redisClient.on('close', () => {
      logger.warn('Redis main client connection closed');
    });

    redisClient.on('reconnecting', (delay) => {
      logger.info(`Redis main client reconnecting in ${delay}ms`);
    });

    // Pub/Sub clients
    logger.info('Creating Redis Pub/Sub clients...');
    redisPub = new Redis(redisConfig);
    redisSub = new Redis(redisConfig);

    redisPub.on('error', (err) => {
      logger.error('Redis pub client error:', err.message);
    });

    redisSub.on('error', (err) => {
      logger.error('Redis sub client error:', err.message);
    });

    // Test connection with retry
    logger.info('Testing Redis connection with PING...');
    let retries = 5;
    let lastError;
    
    while (retries > 0) {
      try {
        await redisClient.ping();
        logger.info('Redis PING successful - connection established');
        break;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          logger.warn(`Redis PING failed, ${retries} retries remaining...`, error.message);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (retries === 0) {
      throw lastError;
    }

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
