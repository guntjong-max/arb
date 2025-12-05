// src/config/redis.js
const Redis = require('ioredis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    this.client.on('ready', () => {
      logger.info('Redis ready');
    });
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, expirySeconds = null) {
    try {
      const stringValue = JSON.stringify(value);
      if (expirySeconds) {
        await this.client.setex(key, expirySeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', { key, error: error.message });
      return false;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis HGET error:', { key, field, error: error.message });
      return null;
    }
  }

  async hset(key, field, value) {
    try {
      const stringValue = JSON.stringify(value);
      await this.client.hset(key, field, stringValue);
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', { key, field, error: error.message });
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error: error.message });
      return false;
    }
  }

  async close() {
    await this.client.quit();
    logger.info('Redis connection closed');
  }

  // Helper methods for odds caching
  async getCachedOdds(marketId, selection) {
    const key = `odds:${marketId}:${selection}`;
    return await this.get(key);
  }

  async setCachedOdds(marketId, selection, oddsData, ttl = 300) {
    const key = `odds:${marketId}:${selection}`;
    return await this.set(key, oddsData, ttl);
  }

  async hasOddsChanged(marketId, selection, newOdds) {
    const cached = await this.getCachedOdds(marketId, selection);
    if (!cached) return { changed: true, previous: null };
    
    const changed = parseFloat(cached.oddsDecimal) !== parseFloat(newOdds);
    return { changed, previous: cached.oddsDecimal };
  }
}

module.exports = new RedisClient();
