#!/usr/bin/env node
/**
 * CRITICAL DEBUG: Test URL parsing for redis://:Menang123@redis:6379
 * This will show EXACTLY what Node.js URL parser extracts
 */

console.log('\n=== CRITICAL REDIS URL PARSING DEBUG ===\n');

const testUrl = 'redis://:Menang123@redis:6379';
console.log('Testing URL:', testUrl);
console.log('');

try {
  const url = new URL(testUrl);
  
  console.log('URL Components:');
  console.log('  protocol:', url.protocol);
  console.log('  hostname:', url.hostname);
  console.log('  port:', url.port);
  console.log('  username:', JSON.stringify(url.username));
  console.log('  password:', JSON.stringify(url.password));
  console.log('  pathname:', JSON.stringify(url.pathname));
  console.log('');
  
  console.log('CRITICAL FINDINGS:');
  console.log('  url.password =', JSON.stringify(url.password));
  console.log('  url.username =', JSON.stringify(url.username));
  console.log('');
  
  // This is what the current code does
  let extractedPassword = null;
  if (url.password) {
    extractedPassword = url.password;
    console.log('  ✅ Extracted from url.password:', extractedPassword);
  } else if (url.username && !url.password) {
    extractedPassword = url.username;
    console.log('  ⚠️  Extracted from url.username:', extractedPassword);
  } else {
    console.log('  ❌ NO PASSWORD EXTRACTED!');
  }
  
  console.log('');
  console.log('Final Configuration Would Be:');
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: extractedPassword
  };
  console.log(JSON.stringify(config, null, 2));
  
  console.log('');
  console.log('=== TEST RESULT ===');
  if (extractedPassword === 'Menang123') {
    console.log('✅ SUCCESS: Password correctly extracted as "Menang123"');
  } else {
    console.log('❌ FAILURE: Expected "Menang123", got:', JSON.stringify(extractedPassword));
  }
  
} catch (error) {
  console.error('❌ ERROR parsing URL:', error.message);
}

console.log('\n=== END DEBUG ===\n');
