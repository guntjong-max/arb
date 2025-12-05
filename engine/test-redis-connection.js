#!/usr/bin/env node
/**
 * COMPREHENSIVE REDIS CONNECTION TEST
 * Run inside Docker: docker compose exec engine node test-redis-connection.js
 */

const Redis = require('ioredis');

console.log('\n========================================');
console.log('  REDIS CONNECTION DIAGNOSTIC TEST');
console.log('========================================\n');

// Step 1: Check Environment Variables
console.log('STEP 1: Environment Variables');
console.log('─────────────────────────────────────');
console.log('REDIS_URL:', process.env.REDIS_URL || '(not set)');
console.log('REDIS_HOST:', process.env.REDIS_HOST || '(not set)');
console.log('REDIS_PORT:', process.env.REDIS_PORT || '(not set)');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '***SET***' : '(not set)');
console.log('');

// Step 2: Parse REDIS_URL
console.log('STEP 2: URL Parsing Test');
console.log('─────────────────────────────────────');
const redisUrl = process.env.REDIS_URL || 'redis://:Menang123@redis:6379';
console.log('Parsing URL:', redisUrl);

let parsedConfig = null;
try {
  const url = new URL(redisUrl);
  console.log('  protocol:', url.protocol);
  console.log('  hostname:', url.hostname);
  console.log('  port:', url.port || '6379 (default)');
  console.log('  username:', JSON.stringify(url.username));
  console.log('  password:', JSON.stringify(url.password));
  
  // Extract password
  let password = null;
  if (url.password) {
    password = url.password;
    console.log('  ✅ Password from url.password:', password);
  } else if (url.username && !url.password) {
    password = url.username;
    console.log('  ⚠️  Password from url.username:', password);
  } else {
    console.log('  ❌ NO PASSWORD FOUND IN URL!');
  }
  
  parsedConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: password,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 5000);
      console.log(`  Retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000
  };
  
  console.log('\nParsed Config:');
  console.log(JSON.stringify({
    host: parsedConfig.host,
    port: parsedConfig.port,
    password: parsedConfig.password ? `***${parsedConfig.password.length} chars***` : null
  }, null, 2));
  
} catch (error) {
  console.error('❌ URL parsing failed:', error.message);
  process.exit(1);
}
console.log('');

// Step 3: Test Connection with Explicit Password
console.log('STEP 3: Direct Connection Test (Explicit Config)');
console.log('─────────────────────────────────────');

async function testExplicitConnection() {
  const testConfig = {
    host: 'redis',
    port: 6379,
    password: 'Menang123',
    retryStrategy: (times) => Math.min(times * 100, 2000),
    maxRetriesPerRequest: 3,
    connectTimeout: 5000
  };
  
  console.log('Testing with explicit config:');
  console.log(JSON.stringify({
    host: testConfig.host,
    port: testConfig.port,
    password: '***SET***'
  }, null, 2));
  
  const client = new Redis(testConfig);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.disconnect();
      reject(new Error('Connection timeout after 10 seconds'));
    }, 10000);
    
    client.on('error', (err) => {
      console.error('  ❌ Redis error:', err.message);
      clearTimeout(timeout);
      client.disconnect();
      reject(err);
    });
    
    client.on('ready', async () => {
      console.log('  ✅ Connected! Testing PING...');
      try {
        const result = await client.ping();
        console.log('  ✅ PING result:', result);
        clearTimeout(timeout);
        client.disconnect();
        resolve(true);
      } catch (err) {
        console.error('  ❌ PING failed:', err.message);
        clearTimeout(timeout);
        client.disconnect();
        reject(err);
      }
    });
  });
}

// Step 4: Test Connection with Parsed Config
async function testParsedConnection() {
  console.log('STEP 4: Parsed URL Connection Test');
  console.log('─────────────────────────────────────');
  console.log('Testing with parsed URL config...');
  
  const client = new Redis(parsedConfig);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.disconnect();
      reject(new Error('Connection timeout after 10 seconds'));
    }, 10000);
    
    client.on('error', (err) => {
      console.error('  ❌ Redis error:', err.message);
      clearTimeout(timeout);
      client.disconnect();
      reject(err);
    });
    
    client.on('ready', async () => {
      console.log('  ✅ Connected! Testing PING...');
      try {
        const result = await client.ping();
        console.log('  ✅ PING result:', result);
        
        // Test SET/GET
        await client.set('test:key', 'test-value');
        const value = await client.get('test:key');
        console.log('  ✅ SET/GET test:', value);
        await client.del('test:key');
        
        clearTimeout(timeout);
        client.disconnect();
        resolve(true);
      } catch (err) {
        console.error('  ❌ Command failed:', err.message);
        clearTimeout(timeout);
        client.disconnect();
        reject(err);
      }
    });
  });
}

// Run Tests
(async () => {
  try {
    console.log('');
    await testExplicitConnection();
    console.log('');
    await testParsedConnection();
    
    console.log('\n========================================');
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('========================================\n');
    process.exit(0);
    
  } catch (error) {
    console.log('\n========================================');
    console.log('  ❌ TEST FAILED!');
    console.log('========================================');
    console.error('\nError:', error.message);
    console.error('\nStack:', error.stack);
    console.log('');
    process.exit(1);
  }
})();
