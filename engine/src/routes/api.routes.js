// routes/api.routes.js - Simplified API endpoints for minimal UI
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * POST /api/login
 * Queue account login
 */
router.post('/login', async (req, res) => {
  try {
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ 
        success: false, 
        error: 'accountId is required' 
      });
    }

    // Get account details
    const accountQuery = 'SELECT * FROM sportsbook_accounts WHERE id = $1';
    const accountResult = await db.query(accountQuery, [accountId]);
    
    if (accountResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Account not found' 
      });
    }

    // Update status to logging_in
    await db.query(
      'UPDATE sportsbook_accounts SET status = $1, updated_at = NOW() WHERE id = $2',
      ['logging_in', accountId]
    );

    // TODO: Queue login job to worker via BullMQ
    logger.info('Login queued for account', { accountId });

    res.json({
      success: true,
      message: 'Login queued successfully',
      accountId
    });

  } catch (error) {
    logger.error('Login queue error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/login-status
 * Get account status for all accounts
 */
router.get('/login-status', async (req, res) => {
  try {
    const query = `
      SELECT id, sportsbook, url, username, status, balance, 
             balance_updated_at, last_checked
      FROM sportsbook_accounts
      ORDER BY id
    `;
    
    const result = await db.query(query);
    
    res.json(result.rows);

  } catch (error) {
    logger.error('Get login status error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/settings
 * Get current settings
 */
router.get('/settings', async (req, res) => {
  try {
    const { user_id = 1 } = req.query;

    // Get profit configuration
    const profitQuery = `
      SELECT min_profit_percentage, max_profit_percentage,
             max_minute_ht, max_minute_ft, match_filter, enabled_markets
      FROM profit_config
      WHERE user_id = $1 AND is_active = true
      LIMIT 1
    `;
    const profitResult = await db.query(profitQuery, [user_id]);

    if (profitResult.rows.length === 0) {
      // Return defaults if no config exists
      return res.json({
        min_percentage: 3.0,
        max_percentage: 10.0,
        ht_time_last_bet: 35,
        ft_time_last_bet: 75,
        match_filter: 'all',
        ft_hdp: true,
        ft_ou: true,
        ft_1x2: false,
        ht_hdp: true,
        ht_ou: true,
        ht_1x2: false
      });
    }

    const config = profitResult.rows[0];
    const enabledMarkets = config.enabled_markets || {};

    res.json({
      min_percentage: parseFloat(config.min_profit_percentage) || 3.0,
      max_percentage: parseFloat(config.max_profit_percentage) || 10.0,
      ht_time_last_bet: config.max_minute_ht || 35,
      ft_time_last_bet: config.max_minute_ft || 75,
      match_filter: config.match_filter || 'all',
      ft_hdp: enabledMarkets.ft_hdp !== false,
      ft_ou: enabledMarkets.ft_ou !== false,
      ft_1x2: enabledMarkets.ft_1x2 === true,
      ht_hdp: enabledMarkets.ht_hdp !== false,
      ht_ou: enabledMarkets.ht_ou !== false,
      ht_1x2: enabledMarkets.ht_1x2 === true
    });

  } catch (error) {
    logger.error('Get settings error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/settings
 * Save settings
 */
router.post('/settings', async (req, res) => {
  try {
    const { 
      user_id = 1,
      min_percentage,
      max_percentage,
      ht_time_last_bet,
      ft_time_last_bet,
      match_filter,
      ft_hdp,
      ft_ou,
      ft_1x2,
      ht_hdp,
      ht_ou,
      ht_1x2
    } = req.body;

    const enabledMarkets = {
      ft_hdp: ft_hdp !== false,
      ft_ou: ft_ou !== false,
      ft_1x2: ft_1x2 === true,
      ht_hdp: ht_hdp !== false,
      ht_ou: ht_ou !== false,
      ht_1x2: ht_1x2 === true
    };

    const query = `
      INSERT INTO profit_config (
        user_id, min_profit_percentage, max_profit_percentage,
        max_minute_ht, max_minute_ft, match_filter, enabled_markets, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (user_id)
      DO UPDATE SET
        min_profit_percentage = EXCLUDED.min_profit_percentage,
        max_profit_percentage = EXCLUDED.max_profit_percentage,
        max_minute_ht = EXCLUDED.max_minute_ht,
        max_minute_ft = EXCLUDED.max_minute_ft,
        match_filter = EXCLUDED.match_filter,
        enabled_markets = EXCLUDED.enabled_markets,
        updated_at = NOW()
      RETURNING *
    `;

    await db.query(query, [
      user_id,
      min_percentage,
      max_percentage,
      ht_time_last_bet,
      ft_time_last_bet,
      match_filter,
      JSON.stringify(enabledMarkets)
    ]);

    logger.info('Settings updated', { user_id });

    res.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    logger.error('Save settings error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/execute
 * Queue bet execution with PAIR SEQUENCE logic
 * CRITICAL RULE: Bet positive odds FIRST, wait for acceptance, then bet negative
 */
router.post('/execute', async (req, res) => {
  try {
    const { 
      accountId, 
      matchName, 
      marketType, 
      odds, 
      stake,
      pairBet = null // Optional: second bet in pair
    } = req.body;

    if (!accountId || !matchName || !marketType || !odds || !stake) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Validate: Only bet on positive odds (> 1.0)
    if (parseFloat(odds) <= 1.0) {
      return res.status(400).json({
        success: false,
        error: 'Only positive odds (> 1.0) are allowed'
      });
    }

    // Round stake to nearest 0 or 5
    const roundedStake = Math.round(stake / 5) * 5;

    // Insert bet record with pair metadata
    const insertQuery = `
      INSERT INTO bets (account_id, match_name, market_type, odds, stake, status, result, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())
      RETURNING id
    `;
    
    const pairMetadata = pairBet ? JSON.stringify({
      is_pair: true,
      pair_odds: pairBet.odds,
      pair_stake: Math.round(pairBet.stake / 5) * 5,
      sequence: 'positive_first' // CRITICAL: positive bet goes first
    }) : null;
    
    const result = await db.query(insertQuery, [
      accountId,
      matchName,
      marketType,
      odds,
      roundedStake,
      pairMetadata
    ]);

    const betId = result.rows[0].id;

    // Queue bet execution job to worker with pair sequence logic
    const jobPayload = {
      betId,
      accountId,
      matchName,
      marketType,
      odds: parseFloat(odds),
      stake: roundedStake,
      sequence: 'positive_first', // CRITICAL: Execute positive odds bet first
      pairBet: pairBet ? {
        odds: parseFloat(pairBet.odds),
        stake: Math.round(pairBet.stake / 5) * 5,
        marketType: pairBet.marketType,
        sequence: 'negative_second', // CRITICAL: Execute only after positive accepted
        dependsOn: betId // Wait for this bet to be ACCEPTED
      } : null
    };

    // TODO: Queue to BullMQ with pair sequence logic
    logger.info('Bet queued with pair sequence', { 
      betId, 
      accountId, 
      matchName, 
      stake: roundedStake,
      odds,
      isPair: !!pairBet,
      sequence: 'positive_first'
    });

    res.json({
      success: true,
      message: pairBet ? 'Bet pair queued (positive first, negative waits)' : 'Single bet queued',
      betId,
      stake: roundedStake,
      sequence: jobPayload.sequence,
      pairSequence: pairBet ? 'Negative bet will execute ONLY after positive is ACCEPTED' : null
    });

  } catch (error) {
    logger.error('Execute bet error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/bets
 * Get bet history
 */
router.get('/bets', async (req, res) => {
  try {
    const { limit = 50, status } = req.query;

    let query = `
      SELECT b.*, sa.sportsbook, sa.username
      FROM bets b
      LEFT JOIN sportsbook_accounts sa ON b.account_id = sa.id
    `;

    const params = [];
    if (status) {
      query += ' WHERE b.status = $1';
      params.push(status);
    }

    query += ' ORDER BY b.created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await db.query(query, params);

    res.json({
      success: true,
      bets: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Get bets error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/system-health
 * System health check
 */
router.get('/system-health', async (req, res) => {
  try {
    let dbHealthy = false;
    let redisHealthy = false;

    // Check database
    try {
      await db.query('SELECT 1');
      dbHealthy = true;
    } catch (dbError) {
      logger.error('Database health check failed', { error: dbError.message });
    }

    // Check Redis
    try {
      const redis = require('../config/redis');
      const redisClient = redis.getRedisClient();
      if (redisClient && redisClient.status === 'ready') {
        redisHealthy = true;
      }
    } catch (redisError) {
      logger.error('Redis health check failed', { error: redisError.message });
    }

    const healthy = dbHealthy && redisHealthy;

    res.json({
      status: healthy ? 'healthy' : 'unhealthy',
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

module.exports = router;
