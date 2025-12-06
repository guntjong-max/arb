// src/routes/config.routes.js - System configuration management
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const logger = require('../config/logger');

// GET /api/v1/config - Get current configuration
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM system_config 
       WHERE is_active = true 
       ORDER BY updated_at DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default config if none exists
      return res.json({
        success: true,
        config: {
          auto_trading_enabled: false,
          emergency_stop: false,
          max_bet_tier1: 5000000,
          max_bet_tier2: 2000000,
          max_bet_tier3: 500000,
          min_profit_pct: 3.00,
          max_profit_pct: 10.00,
          max_minute_ht: 35,
          max_minute_ft: 85,
          match_filter: 'all',
          enabled_markets: ['ft_hdp', 'ft_ou', 'ht_hdp', 'ht_ou']
        }
      });
    }

    res.json({
      success: true,
      config: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/config - Update configuration
router.put('/', async (req, res) => {
  try {
    const {
      auto_trading_enabled,
      emergency_stop,
      max_bet_tier1,
      max_bet_tier2,
      max_bet_tier3,
      min_profit_pct,
      max_profit_pct,
      max_minute_ht,
      max_minute_ft,
      match_filter,
      enabled_markets,
      league_tiers
    } = req.body;

    const pool = getPool();
    
    // Get current config ID
    const currentConfig = await pool.query(
      'SELECT id FROM system_config WHERE is_active = true LIMIT 1'
    );

    let result;
    
    if (currentConfig.rows.length === 0) {
      // Create new config
      result = await pool.query(
        `INSERT INTO system_config (
          auto_trading_enabled, emergency_stop,
          max_bet_tier1, max_bet_tier2, max_bet_tier3,
          min_profit_pct, max_profit_pct,
          max_minute_ht, max_minute_ft,
          match_filter, enabled_markets, league_tiers
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          auto_trading_enabled ?? false,
          emergency_stop ?? false,
          max_bet_tier1 ?? 5000000,
          max_bet_tier2 ?? 2000000,
          max_bet_tier3 ?? 500000,
          min_profit_pct ?? 3.00,
          max_profit_pct ?? 10.00,
          max_minute_ht ?? 35,
          max_minute_ft ?? 85,
          match_filter ?? 'all',
          JSON.stringify(enabled_markets ?? ['ft_hdp', 'ft_ou', 'ht_hdp', 'ht_ou']),
          JSON.stringify(league_tiers ?? {})
        ]
      );
    } else {
      // Update existing config
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (auto_trading_enabled !== undefined) {
        updates.push(`auto_trading_enabled = $${paramCount++}`);
        values.push(auto_trading_enabled);
      }
      if (emergency_stop !== undefined) {
        updates.push(`emergency_stop = $${paramCount++}`);
        values.push(emergency_stop);
      }
      if (max_bet_tier1) {
        updates.push(`max_bet_tier1 = $${paramCount++}`);
        values.push(max_bet_tier1);
      }
      if (max_bet_tier2) {
        updates.push(`max_bet_tier2 = $${paramCount++}`);
        values.push(max_bet_tier2);
      }
      if (max_bet_tier3) {
        updates.push(`max_bet_tier3 = $${paramCount++}`);
        values.push(max_bet_tier3);
      }
      if (min_profit_pct) {
        updates.push(`min_profit_pct = $${paramCount++}`);
        values.push(min_profit_pct);
      }
      if (max_profit_pct) {
        updates.push(`max_profit_pct = $${paramCount++}`);
        values.push(max_profit_pct);
      }
      if (max_minute_ht) {
        updates.push(`max_minute_ht = $${paramCount++}`);
        values.push(max_minute_ht);
      }
      if (max_minute_ft) {
        updates.push(`max_minute_ft = $${paramCount++}`);
        values.push(max_minute_ft);
      }
      if (match_filter) {
        updates.push(`match_filter = $${paramCount++}`);
        values.push(match_filter);
      }
      if (enabled_markets) {
        updates.push(`enabled_markets = $${paramCount++}`);
        values.push(JSON.stringify(enabled_markets));
      }
      if (league_tiers) {
        updates.push(`league_tiers = $${paramCount++}`);
        values.push(JSON.stringify(league_tiers));
      }
      
      values.push(currentConfig.rows[0].id);
      
      result = await pool.query(
        `UPDATE system_config 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );
    }

    logger.info('Configuration updated successfully');

    res.json({
      success: true,
      config: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/config/emergency-stop - Toggle emergency stop
router.post('/emergency-stop', async (req, res) => {
  try {
    const { enabled } = req.body;
    const pool = getPool();
    
    const result = await pool.query(
      `UPDATE system_config 
       SET emergency_stop = $1, updated_at = NOW()
       WHERE is_active = true
       RETURNING emergency_stop`,
      [enabled ?? true]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }

    logger.warn(`EMERGENCY STOP ${enabled ? 'ACTIVATED' : 'DEACTIVATED'}`);

    res.json({
      success: true,
      emergency_stop: result.rows[0].emergency_stop
    });
  } catch (error) {
    logger.error('Error toggling emergency stop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/config/auto-trading - Toggle auto trading
router.post('/auto-trading', async (req, res) => {
  try {
    const { enabled } = req.body;
    const pool = getPool();
    
    const result = await pool.query(
      `UPDATE system_config 
       SET auto_trading_enabled = $1, updated_at = NOW()
       WHERE is_active = true
       RETURNING auto_trading_enabled`,
      [enabled ?? false]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }

    logger.info(`Auto trading ${enabled ? 'ENABLED' : 'DISABLED'}`);

    res.json({
      success: true,
      auto_trading_enabled: result.rows[0].auto_trading_enabled
    });
  } catch (error) {
    logger.error('Error toggling auto trading:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
