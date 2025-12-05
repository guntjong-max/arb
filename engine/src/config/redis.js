// src/config/redis.js - Redis connection
const Redis = require('ioredis');
const logger = require('./logger');

let redisClient;
let redisPub;
let redisSub;

async function connectRedis() {
  try {
    let redisConfig;
    
    // Check if REDIS_URL is provided (Docker/production)
    if (process.env.REDIS_URL) {
      logger.info('Using REDIS_URL for connection');
      redisConfig = process.env.REDIS_URL;
    } else {
      // Fallback to individual config (local development)
      logger.info('Using individual Redis config parameters');
      redisConfig = {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3
      };
    }

    // Main Redis client
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    // Pub/Sub clients
    redisPub = new Redis(redisConfig);
    redisSub = new Redis(redisConfig);
    
    // Add error handlers for pub/sub clients to prevent crashes
    redisPub.on('error', (err) => {
      logger.error('Redis pub client error:', err);
    });
    
    redisSub.on('error', (err) => {
      logger.error('Redis sub client error:', err);
    });

    // Test connection
    await redisClient.ping();
    logger.info('Redis PING successful');

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
