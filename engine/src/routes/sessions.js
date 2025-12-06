// src/routes/sessions.js - Real Puppeteer login for sportsbooks
const express = require('express');
const puppeteer = require('puppeteer');
const logger = require('../config/logger');
const { getPool } = require('../config/database');

const router = express.Router();

/**
 * Real Puppeteer login to NovaSport
 * Scrapes balance and live odds from the sportsbook
 */
async function loginNovaSport(username, password) {
  let browser = null;
  
  try {
    logger.info('Launching Puppeteer for NovaSport login...');
    
    // Launch browser with Alpine-friendly settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    logger.info(`Navigating to NovaSport login page...`);
    
    // Navigate to login page
    await page.goto('https://novasport.com/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    logger.info('Filling login credentials...');
    
    // Fill login form
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.type('#username', username);
    await page.type('#password', password);
    
    // Click login button
    logger.info('Clicking login button...');
    await page.click('#login-button');
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    logger.info('Logged in successfully, scraping data...');
    
    // Scrape balance
    const balance = await page.evaluate(() => {
      const balanceElement = document.querySelector('.balance');
      return balanceElement ? balanceElement.textContent.trim() : '0.00';
    });
    
    // Scrape top 10 odds
    const oddsData = await page.evaluate(() => {
      const oddsRows = Array.from(document.querySelectorAll('.odds-row')).slice(0, 10);
      
      return oddsRows.map(row => {
        const matchName = row.querySelector('.match-name')?.textContent.trim() || 'Unknown Match';
        const homeOdds = row.querySelector('.home-odds')?.textContent.trim() || '0.00';
        const awayOdds = row.querySelector('.away-odds')?.textContent.trim() || '0.00';
        
        return {
          match: matchName,
          home: parseFloat(homeOdds) || 0.00,
          away: parseFloat(awayOdds) || 0.00
        };
      });
    });
    
    logger.info(`Scraped balance: ${balance}, odds count: ${oddsData.length}`);
    
    await browser.close();
    
    return {
      balance: balance,
      odds_sample: oddsData,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Puppeteer login error:', error);
    
    if (browser) {
      await browser.close().catch(err => logger.error('Error closing browser:', err));
    }
    
    throw error;
  }
}

/**
 * POST /api/v1/sessions
 * Create new sportsbook session with real login
 */
router.post('/', async (req, res, next) => {
  try {
    const { sportsbook_name, username, password } = req.body;
    
    // Validation
    if (!sportsbook_name || !username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: sportsbook_name, username, password'
      });
    }
    
    logger.info(`Creating session for ${sportsbook_name} user: ${username}`);
    
    let sessionData;
    
    // Route to appropriate sportsbook login
    if (sportsbook_name.toLowerCase() === 'novasport') {
      sessionData = await loginNovaSport(username, password);
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Unsupported sportsbook: ${sportsbook_name}. Supported: novasport`
      });
    }
    
    // Save session to database
    const pool = getPool();
    const query = `
      INSERT INTO sportsbook_sessions 
        (sportsbook_name, username, balance, odds_sample, last_login, status) 
      VALUES 
        ($1, $2, $3, $4, NOW(), 'active')
      ON CONFLICT (sportsbook_name, username) 
      DO UPDATE SET 
        balance = EXCLUDED.balance,
        odds_sample = EXCLUDED.odds_sample,
        last_login = NOW(),
        status = 'active'
      RETURNING id, sportsbook_name, username, balance, odds_sample, last_login, status
    `;
    
    const values = [
      sportsbook_name,
      username,
      sessionData.balance,
      JSON.stringify(sessionData.odds_sample)
    ];
    
    const result = await pool.query(query, values);
    const savedSession = result.rows[0];
    
    logger.info(`Session saved to DB: ${savedSession.id}`);
    
    // Return response
    res.status(200).json({
      success: true,
      session_id: savedSession.id,
      sportsbook_name: savedSession.sportsbook_name,
      username: savedSession.username,
      balance: savedSession.balance,
      odds_sample: savedSession.odds_sample,
      last_login: savedSession.last_login,
      status: savedSession.status
    });
    
  } catch (error) {
    logger.error('Session creation error:', error);
    next(error);
  }
});

/**
 * GET /api/v1/sessions
 * List all active sessions
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, sportsbook_name, username, balance, odds_sample, last_login, status
      FROM sportsbook_sessions
      ORDER BY last_login DESC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      sessions: result.rows
    });
    
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    next(error);
  }
});

/**
 * GET /api/v1/sessions/:id
 * Get specific session details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool.query(
      'SELECT * FROM sportsbook_sessions WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Session ${id} not found`
      });
    }
    
    res.json({
      success: true,
      session: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error fetching session:', error);
    next(error);
  }
});

module.exports = router;
