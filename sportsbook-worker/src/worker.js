// src/worker.js - Main Worker Class
const puppeteer = require('puppeteer');
const logger = require('./config/logger');
const db = require('./config/database');
const redis = require('./config/redis');
const CryptoJS = require('crypto-js');

class SportsbookWorker {
  constructor(config) {
    this.workerName = config.workerName;
    this.sportsbookName = config.sportsbookName;
    this.scrapeInterval = config.scrapeInterval || 15000; // 15 seconds default
    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.sessionActive = false;
    this.workerId = null;
    this.credentials = null;
    this.scrapeCount = 0;
    this.errorCount = 0;
  }

  async start() {
    try {
      logger.info(`Starting worker: ${this.workerName} for ${this.sportsbookName}`);
      
      // Get worker info from database
      const worker = await db.getWorker(this.workerName);
      if (!worker) {
        throw new Error(`Worker ${this.workerName} not found in database`);
      }
      this.workerId = worker.id;

      // Update status to running
      await db.updateWorkerStatus(this.workerName, 'running');

      // Get credentials
      this.credentials = await db.getCredentials(this.sportsbookName);
      if (!this.credentials) {
        throw new Error(`No credentials found for ${this.sportsbookName}`);
      }

      // Initialize browser
      await this.initBrowser();

      // Login
      await this.login();

      // Start scraping loop
      this.isRunning = true;
      this.scrapeLoop();

    } catch (error) {
      logger.error('Worker start failed:', error);
      await db.updateWorkerStatus(this.workerName, 'error');
      await db.insertLog(this.workerId, 'error', 'Worker start failed', { error: error.message });
      throw error;
    }
  }

  async initBrowser() {
    try {
      logger.info('Initializing browser...');
      
      this.browser = await puppeteer.launch({
        headless: process.env.HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });

      this.page = await this.browser.newPage();

      // Set user agent to avoid detection
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Remove webdriver property
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
      });

      logger.info('Browser initialized successfully');
      
    } catch (error) {
      logger.error('Browser initialization failed:', error);
      throw error;
    }
  }

  async login() {
    try {
      logger.info(`Logging in to ${this.sportsbookName}...`);

      // Decrypt password
      const password = this.decryptPassword(this.credentials.encrypted_password);

      // Navigate to login page
      const loginUrl = this.credentials.login_url || this.getDefaultLoginUrl();
      await this.page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait a bit for page to stabilize
      await this.sleep(2000);

      // Call sportsbook-specific login handler
      const loginSuccess = await this.performLogin(this.credentials.username, password);

      if (loginSuccess) {
        this.sessionActive = true;
        await db.updateWorkerStatus(this.workerName, 'running', { session_active: true });
        await db.insertLog(this.workerId, 'info', 'Login successful', { sportsbook: this.sportsbookName });
        logger.info('Login successful');
      } else {
        throw new Error('Login failed');
      }

    } catch (error) {
      logger.error('Login failed:', error);
      await db.insertLog(this.workerId, 'error', 'Login failed', { error: error.message });
      throw error;
    }
  }

  async performLogin(username, password) {
    // This is a generic login template
    // In production, each sportsbook would have its own scraper implementation
    
    try {
      // Example login flow (customize per sportsbook)
      // This is a placeholder - real implementation would be specific to each site
      
      logger.info('Performing login sequence...');
      
      // Look for common username/email input selectors
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[id*="username"]',
        'input[id*="email"]',
        '#username',
        '#email'
      ];

      let usernameField = null;
      for (const selector of usernameSelectors) {
        try {
          usernameField = await this.page.$(selector);
          if (usernameField) {
            logger.info(`Found username field: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!usernameField) {
        logger.warn('Username field not found - login may need custom implementation');
        return false;
      }

      // Type username
      await usernameField.type(username, { delay: 100 });
      await this.sleep(500);

      // Look for password field
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[id*="password"]',
        '#password'
      ];

      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.$(selector);
          if (passwordField) {
            logger.info(`Found password field: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!passwordField) {
        logger.warn('Password field not found');
        return false;
      }

      // Type password
      await passwordField.type(password, { delay: 100 });
      await this.sleep(500);

      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Login")',
        'button:contains("Sign In")',
        'button:contains("Log In")',
        '.login-button',
        '#login-button'
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            logger.info(`Found submit button: ${selector}`);
            await button.click();
            submitted = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!submitted) {
        // Try pressing Enter
        await passwordField.press('Enter');
      }

      // Wait for navigation or dashboard
      await this.sleep(5000);

      // Check if login was successful (look for logged-in indicators)
      const loggedIn = await this.checkLoginStatus();
      
      return loggedIn;

    } catch (error) {
      logger.error('Login sequence error:', error);
      return false;
    }
  }

  async checkLoginStatus() {
    try {
      // Check for common logged-in indicators
      const loggedInSelectors = [
        '[class*="logout"]',
        '[id*="logout"]',
        '[class*="user-menu"]',
        '[class*="account-menu"]',
        '[class*="profile"]',
        'a[href*="logout"]',
        'button:contains("Logout")',
        'button:contains("Sign Out")'
      ];

      for (const selector of loggedInSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            logger.info(`Login verified with selector: ${selector}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      // Check URL for dashboard/account pages
      const currentUrl = this.page.url();
      if (currentUrl.includes('dashboard') || 
          currentUrl.includes('account') || 
          currentUrl.includes('my-account')) {
        logger.info('Login verified via URL');
        return true;
      }

      logger.warn('Could not verify login status');
      return false;

    } catch (error) {
      logger.error('Login status check error:', error);
      return false;
    }
  }

  async scrapeLoop() {
    logger.info('Starting scrape loop...');

    while (this.isRunning) {
      try {
        // Heartbeat
        await db.updateWorkerStatus(this.workerName, 'running');

        // Check session
        if (!this.sessionActive || !(await this.checkLoginStatus())) {
          logger.warn('Session expired, re-logging in...');
          await this.login();
        }

        // Perform scrape
        await this.scrape();

        // Update scrape count
        this.scrapeCount++;
        await db.updateWorkerStatus(this.workerName, 'running', { total_scrapes: true });

        // Wait for next interval
        await this.sleep(this.scrapeInterval);

      } catch (error) {
        logger.error('Scrape loop error:', error);
        this.errorCount++;
        await db.updateWorkerStatus(this.workerName, 'running', { total_errors: true });
        await db.insertLog(this.workerId, 'error', 'Scrape error', { error: error.message });
        
        // Wait a bit before retrying
        await this.sleep(5000);
      }
    }
  }

  async scrape() {
    try {
      logger.info('Starting odds scrape...');

      // Navigate to odds page (customize per sportsbook)
      const oddsUrl = this.getOddsPageUrl();
      await this.page.goto(oddsUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for odds to load
      await this.sleep(3000);

      // Extract odds data (this is a generic template)
      const oddsData = await this.extractOdds();

      // Process and save odds
      await this.processOddsData(oddsData);

      logger.info(`Scrape completed. Found ${oddsData.length} markets`);
      await db.query(
        'UPDATE workers SET last_scrape_at = NOW() WHERE worker_name = $1',
        [this.workerName]
      );

    } catch (error) {
      logger.error('Scrape failed:', error);
      throw error;
    }
  }

  async extractOdds() {
    // This is a placeholder - real implementation would be sportsbook-specific
    // Each sportsbook would have its own scraper in src/scrapers/
    
    try {
      logger.info('Extracting odds from page...');

      // Example: Extract all odds elements
      const odds = await this.page.evaluate(() => {
        // This is placeholder code - actual selectors depend on the sportsbook
        const matches = [];
        
        // Look for match containers
        const matchElements = document.querySelectorAll('[data-match], .match, .event');
        
        matchElements.forEach((matchEl, index) => {
          try {
            const match = {
              externalId: matchEl.getAttribute('data-match-id') || `match-${index}`,
              homeTeam: matchEl.querySelector('.home-team, .team-home')?.textContent?.trim() || 'Home Team',
              awayTeam: matchEl.querySelector('.away-team, .team-away')?.textContent?.trim() || 'Away Team',
              league: matchEl.querySelector('.league, .competition')?.textContent?.trim() || 'Unknown League',
              markets: []
            };

            // Look for odds
            const oddsElements = matchEl.querySelectorAll('.odds, .price, [data-odds]');
            if (oddsElements.length >= 3) {
              match.markets.push({
                type: '1X2',
                name: 'Full Time Result',
                odds: {
                  home: parseFloat(oddsElements[0]?.textContent || '0'),
                  draw: parseFloat(oddsElements[1]?.textContent || '0'),
                  away: parseFloat(oddsElements[2]?.textContent || '0')
                }
              });
            }

            if (match.markets.length > 0) {
              matches.push(match);
            }
          } catch (e) {
            console.error('Error parsing match:', e);
          }
        });

        return matches;
      });

      logger.info(`Extracted ${odds.length} matches`);
      return odds;

    } catch (error) {
      logger.error('Odds extraction failed:', error);
      return [];
    }
  }

  async processOddsData(oddsDataArray) {
    for (const matchData of oddsDataArray) {
      try {
        // Upsert match
        const match = await db.upsertMatch({
          sportsbookName: this.sportsbookName,
          externalMatchId: matchData.externalId,
          league: matchData.league,
          homeTeam: matchData.homeTeam,
          awayTeam: matchData.awayTeam,
          matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
          status: 'scheduled'
        });

        // Process each market
        for (const marketData of matchData.markets) {
          const market = await db.upsertMarket({
            matchId: match.id,
            marketType: marketData.type,
            marketName: marketData.name,
            marketParams: marketData.params || null
          });

          // Process odds for each selection
          for (const [selection, oddsDecimal] of Object.entries(marketData.odds)) {
            if (!oddsDecimal || oddsDecimal === 0) continue;

            // Check if odds changed
            const { changed, previous } = await redis.hasOddsChanged(market.id, selection, oddsDecimal);

            // Update odds in database
            await db.upsertOdds({
              marketId: market.id,
              selection: selection,
              oddsDecimal: oddsDecimal,
              available: true
            });

            // If changed, record history
            if (changed) {
              await db.insertOddsHistory({
                marketId: market.id,
                selection: selection,
                oddsDecimal: oddsDecimal,
                changeType: previous ? (oddsDecimal > previous ? 'increase' : 'decrease') : 'new',
                previousOdds: previous
              });

              logger.info(`Odds changed: ${matchData.homeTeam} vs ${matchData.awayTeam} - ${selection}: ${previous} → ${oddsDecimal}`);
            }

            // Update cache
            await redis.setCachedOdds(market.id, selection, { oddsDecimal }, 300);
          }
        }

      } catch (error) {
        logger.error('Error processing match data:', { match: matchData, error: error.message });
      }
    }
  }

  getOddsPageUrl() {
    // Default URLs for common sportsbooks
    const urls = {
      'Bet365': 'https://www.bet365.com/#/HO/',
      'Pinnacle': 'https://www.pinnacle.com/en/soccer',
      'Betfair': 'https://www.betfair.com/sport/football'
    };
    return urls[this.sportsbookName] || 'https://example.com';
  }

  getDefaultLoginUrl() {
    const urls = {
      'Bet365': 'https://www.bet365.com/',
      'Pinnacle': 'https://www.pinnacle.com/',
      'Betfair': 'https://www.betfair.com/'
    };
    return urls[this.sportsbookName] || 'https://example.com';
  }

  decryptPassword(encryptedPassword) {
    try {
      const key = process.env.SESSION_ENCRYPTION_KEY || 'default-key';
      const decrypted = CryptoJS.AES.decrypt(encryptedPassword, key).toString(CryptoJS.enc.Utf8);
      return decrypted || encryptedPassword; // Fallback if decryption fails
    } catch (error) {
      logger.warn('Password decryption failed, using as-is');
      return encryptedPassword;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    logger.info('Stopping worker...');
    this.isRunning = false;
    
    if (this.page) {
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }

    await db.updateWorkerStatus(this.workerName, 'stopped', { session_active: false });
    await db.insertLog(this.workerId, 'info', 'Worker stopped');
    
    logger.info('Worker stopped');
  }
}

module.exports = SportsbookWorker;
