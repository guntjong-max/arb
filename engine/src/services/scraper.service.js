const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../config/logger');
const { getPool } = require('../config/database');

puppeteer.use(StealthPlugin());

class ScraperService {
  constructor() {
    this.browsers = new Map();
    this.defaultOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };
  }

  async getBrowser(bookmaker) {
    if (!this.browsers.has(bookmaker)) {
      const browser = await puppeteer.launch(this.defaultOptions);
      this.browsers.set(bookmaker, browser);
    }
    return this.browsers.get(bookmaker);
  }

  async closeBrowser(bookmaker) {
    const browser = this.browsers.get(bookmaker);
    if (browser) {
      await browser.close();
      this.browsers.delete(bookmaker);
    }
  }

  async loginNova88(username, password) {
    let page;
    const startTime = Date.now();
    
    try {
      logger.info(`Starting Nova88 login for user: ${username}`);
      
      const browser = await this.getBrowser('nova88');
      page = await browser.newPage();
      
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setDefaultNavigationTimeout(30000);
      
      await page.goto('https://www.nova88.com', { waitUntil: 'networkidle2' });
      
      await page.waitForSelector('input[name="username"], input#username, input[type="text"]', { timeout: 10000 });
      
      const usernameSelector = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const usernameInput = inputs.find(input => 
          input.name === 'username' || 
          input.id === 'username' || 
          input.placeholder?.toLowerCase().includes('username') ||
          input.placeholder?.toLowerCase().includes('user')
        );
        return usernameInput ? `#${usernameInput.id}` : 'input[name="username"]';
      });
      
      await page.type(usernameSelector, username, { delay: 100 });
      logger.info('Username entered');
      
      await page.waitForSelector('input[name="password"], input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', password, { delay: 100 });
      logger.info('Password entered');
      
      const loginButtonSelector = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
        const loginButton = buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('login') ||
          btn.textContent?.toLowerCase().includes('sign in') ||
          btn.value?.toLowerCase().includes('login')
        );
        return loginButton ? loginButton.tagName.toLowerCase() + (loginButton.id ? `#${loginButton.id}` : '') : 'button[type="submit"]';
      });
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click(loginButtonSelector)
      ]);
      
      await page.waitForTimeout(3000);
      
      const loginSuccess = await page.evaluate(() => {
        return !document.querySelector('input[type="password"]') && 
               (document.querySelector('.balance') || 
                document.querySelector('[class*="balance"]') || 
                document.querySelector('[id*="balance"]'));
      });
      
      if (!loginSuccess) {
        throw new Error('Login failed - credentials may be incorrect or CAPTCHA present');
      }
      
      const balance = await page.evaluate(() => {
        const balanceElement = document.querySelector('.balance, [class*="balance"], [id*="balance"]');
        if (balanceElement) {
          const text = balanceElement.textContent.trim();
          const match = text.match(/[\d,]+\.?\d*/);
          return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
        }
        return 0;
      });
      
      const cookies = await page.cookies();
      const sessionData = {
        cookies,
        userAgent: await page.evaluate(() => navigator.userAgent),
        loginTime: new Date().toISOString()
      };
      
      await this.saveSession('nova88', username, balance, sessionData);
      
      await page.close();
      
      const duration = Date.now() - startTime;
      logger.info(`Nova88 login successful for ${username} in ${duration}ms. Balance: ${balance}`);
      
      return {
        success: true,
        balance,
        sessionData,
        duration
      };
      
    } catch (error) {
      logger.error(`Nova88 login failed for ${username}:`, error.message);
      
      if (page) {
        try {
          await page.screenshot({ path: `/tmp/nova88_error_${Date.now()}.png` });
        } catch (screenshotError) {
          logger.error('Failed to capture error screenshot:', screenshotError);
        }
        await page.close();
      }
      
      return {
        success: false,
        error: error.message,
        errorType: this.classifyError(error.message)
      };
    }
  }

  async loginQQ188(username, password) {
    let page;
    const startTime = Date.now();
    
    try {
      logger.info(`Starting QQ188 login for user: ${username}`);
      
      const browser = await this.getBrowser('qq188');
      page = await browser.newPage();
      
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setDefaultNavigationTimeout(30000);
      
      await page.goto('https://www.qq188.com', { waitUntil: 'networkidle2' });
      
      await page.waitForTimeout(2000);
      
      const popupClosed = await page.evaluate(() => {
        const popups = document.querySelectorAll('[class*="popup"], [class*="modal"], [id*="popup"], [id*="modal"]');
        popups.forEach(popup => {
          const closeBtn = popup.querySelector('[class*="close"], button, .btn');
          if (closeBtn) closeBtn.click();
        });
        return popups.length > 0;
      });
      
      if (popupClosed) {
        logger.info('QQ188 pop-ups closed');
        await page.waitForTimeout(1000);
      }
      
      await page.waitForSelector('input[name="username"], input#username, input[type="text"]', { timeout: 10000 });
      
      const usernameSelector = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const usernameInput = inputs.find(input => 
          input.name === 'username' || 
          input.id === 'username' || 
          input.placeholder?.toLowerCase().includes('username')
        );
        return usernameInput ? `#${usernameInput.id}` : 'input[name="username"]';
      });
      
      await page.type(usernameSelector, username, { delay: 100 });
      logger.info('Username entered');
      
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', password, { delay: 100 });
      logger.info('Password entered');
      
      const loginButtonSelector = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const loginButton = buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('login') ||
          btn.value?.toLowerCase().includes('login')
        );
        return loginButton ? loginButton.tagName.toLowerCase() + (loginButton.id ? `#${loginButton.id}` : '') : 'button[type="submit"]';
      });
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click(loginButtonSelector)
      ]);
      
      await page.waitForTimeout(3000);
      
      const loginSuccess = await page.evaluate(() => {
        return !document.querySelector('input[type="password"]');
      });
      
      if (!loginSuccess) {
        throw new Error('Login failed - credentials may be incorrect or CAPTCHA present');
      }
      
      const balance = await page.evaluate(() => {
        const balanceElement = document.querySelector('.balance, [class*="balance"], [id*="balance"]');
        if (balanceElement) {
          const text = balanceElement.textContent.trim();
          const match = text.match(/[\d,]+\.?\d*/);
          return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
        }
        return 0;
      });
      
      const cookies = await page.cookies();
      const sessionData = {
        cookies,
        userAgent: await page.evaluate(() => navigator.userAgent),
        loginTime: new Date().toISOString()
      };
      
      await this.saveSession('qq188', username, balance, sessionData);
      
      await page.close();
      
      const duration = Date.now() - startTime;
      logger.info(`QQ188 login successful for ${username} in ${duration}ms. Balance: ${balance}`);
      
      return {
        success: true,
        balance,
        sessionData,
        duration
      };
      
    } catch (error) {
      logger.error(`QQ188 login failed for ${username}:`, error.message);
      
      if (page) {
        try {
          await page.screenshot({ path: `/tmp/qq188_error_${Date.now()}.png` });
        } catch (screenshotError) {
          logger.error('Failed to capture error screenshot:', screenshotError);
        }
        await page.close();
      }
      
      return {
        success: false,
        error: error.message,
        errorType: this.classifyError(error.message)
      };
    }
  }

  async saveSession(bookmaker, username, balance, sessionData) {
    const pool = getPool();
    
    await pool.query(`
      INSERT INTO sessions (bookmaker, username, balance, session_data, status, expires_at)
      VALUES ($1, $2, $3, $4, 'active', NOW() + INTERVAL '24 hours')
      ON CONFLICT (bookmaker, username)
      DO UPDATE SET 
        balance = $3,
        session_data = $4,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP,
        expires_at = NOW() + INTERVAL '24 hours'
    `, [bookmaker, username, balance, JSON.stringify(sessionData)]);
    
    logger.info(`Session saved for ${bookmaker}/${username}`);
  }

  classifyError(errorMessage) {
    if (errorMessage.includes('timeout') || errorMessage.includes('waiting')) {
      return 'TIMEOUT';
    }
    if (errorMessage.includes('selector') || errorMessage.includes('element')) {
      return 'SELECTOR_CHANGED';
    }
    if (errorMessage.includes('credentials') || errorMessage.includes('incorrect')) {
      return 'INVALID_CREDENTIALS';
    }
    if (errorMessage.includes('CAPTCHA')) {
      return 'CAPTCHA_DETECTED';
    }
    return 'UNKNOWN';
  }

  async cleanup() {
    logger.info('Cleaning up scraper service...');
    for (const [bookmaker, browser] of this.browsers) {
      try {
        await browser.close();
        logger.info(`Closed browser for ${bookmaker}`);
      } catch (error) {
        logger.error(`Error closing browser for ${bookmaker}:`, error);
      }
    }
    this.browsers.clear();
  }
}

module.exports = new ScraperService();
