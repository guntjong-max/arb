/**
 * Test script to verify Redis configuration parsing
 * Run: node test-redis-config.js
 */

// Mock logger
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

/**
 * Parse Redis URL or use individual environment variables
 * Supports format: redis://[:password]@host:port[/db]
 */
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  
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
      
      // Extract password from URL (format: redis://:password@host or redis://user:password@host)
      if (url.password) {
        config.password = url.password;
      } else if (url.username && !url.password) {
        // Handle format redis://:password@host where password is in username field
        config.password = url.username;
      }
      
      // Extract database number if specified
      if (url.pathname && url.pathname.length > 1) {
        const db = parseInt(url.pathname.substring(1));
        if (!isNaN(db)) {
          config.db = db;
        }
      }
      
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

// Test cases
console.log('=== REDIS CONFIG PARSER TEST ===\n');

console.log('Test 1: REDIS_URL with password in URL format');
process.env.REDIS_URL = 'redis://:Menang123@redis:6379';
let config1 = getRedisConfig();
console.log('Result:', JSON.stringify({
  host: config1.host,
  port: config1.port,
  password: config1.password,
  hasPassword: !!config1.password
}, null, 2));
console.log('✅ PASS:', config1.password === 'Menang123', '\n');

console.log('Test 2: REDIS_URL with database number');
process.env.REDIS_URL = 'redis://:Menang123@redis:6379/2';
let config2 = getRedisConfig();
console.log('Result:', JSON.stringify({
  host: config2.host,
  port: config2.port,
  password: config2.password,
  db: config2.db
}, null, 2));
console.log('✅ PASS:', config2.password === 'Menang123' && config2.db === 2, '\n');

console.log('Test 3: Individual env vars (fallback)');
delete process.env.REDIS_URL;
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380';
process.env.REDIS_PASSWORD = 'TestPass123';
let config3 = getRedisConfig();
console.log('Result:', JSON.stringify({
  host: config3.host,
  port: config3.port,
  password: config3.password
}, null, 2));
console.log('✅ PASS:', config3.password === 'TestPass123' && config3.host === 'localhost', '\n');

console.log('Test 4: REDIS_URL with user:password format');
process.env.REDIS_URL = 'redis://user:SecretPass@redis:6379';
let config4 = getRedisConfig();
console.log('Result:', JSON.stringify({
  host: config4.host,
  port: config4.port,
  password: config4.password
}, null, 2));
console.log('✅ PASS:', config4.password === 'SecretPass', '\n');

console.log('=== ALL TESTS COMPLETED ===');
