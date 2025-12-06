// src/routes/scanner.routes.js - Live scanner and opportunities
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const logger = require('../config/logger');

// GET /api/v1/scanner/opportunities - Get active arbitrage opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const { status = 'detected', limit = 50 } = req.query;
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT 
        o.id,
        o.market_type,
        o.pick_a,
        o.odds_a,
        o.stake_a,
        o.pick_b,
        o.odds_b,
        o.stake_b,
        o.profit_pct,
        o.profit_amount,
        o.status,
        o.detected_at,
        ma.home_team || ' vs ' || ma.away_team as match_a,
        ma.league as league_a,
        ma.tier,
        mb.home_team || ' vs ' || mb.away_team as match_b,
        sa.sportsbook as sportsbook_a,
        sb.sportsbook as sportsbook_b
       FROM opportunities o
       LEFT JOIN matches ma ON o.match_id_a = ma.id
       LEFT JOIN matches mb ON o.match_id_b = mb.id
       LEFT JOIN sportsbook_accounts sa ON o.account_id_a = sa.id
       LEFT JOIN sportsbook_accounts sb ON o.account_id_b = sb.id
       WHERE o.status = $1
       ORDER BY o.detected_at DESC
       LIMIT $2`,
      [status, limit]
    );

    res.json({
      success: true,
      count: result.rows.length,
      opportunities: result.rows
    });
  } catch (error) {
    logger.error('Error fetching opportunities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/scanner/live-feed - Real-time feed (use with WebSocket for best results)
router.get('/live-feed', async (req, res) => {
  try {
    const pool = getPool();
    
    // Get recent opportunities (last 5 minutes)
    const result = await pool.query(
      `SELECT 
        o.id,
        o.market_type,
        o.pick_a,
        o.odds_a,
        o.pick_b,
        o.odds_b,
        o.profit_pct,
        o.status,
        o.detected_at,
        ma.home_team || ' vs ' || ma.away_team as match,
        ma.league,
        ma.tier,
        ma.current_minute,
        sa.sportsbook as sportsbook_a,
        sb.sportsbook as sportsbook_b
       FROM opportunities o
       LEFT JOIN matches ma ON o.match_id_a = ma.id
       LEFT JOIN sportsbook_accounts sa ON o.account_id_a = sa.id
       LEFT JOIN sportsbook_accounts sb ON o.account_id_b = sb.id
       WHERE o.detected_at >= NOW() - INTERVAL '5 minutes'
       ORDER BY o.detected_at DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: result.rows.length,
      feed: result.rows
    });
  } catch (error) {
    logger.error('Error fetching live feed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/scanner/stats - Scanner statistics
router.get('/stats', async (req, res) => {
  try {
    const pool = getPool();
    
    // Get various statistics
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM opportunities WHERE status = 'detected') as detected_count,
        (SELECT COUNT(*) FROM opportunities WHERE status = 'executing') as executing_count,
        (SELECT COUNT(*) FROM opportunities WHERE status = 'completed' 
         AND detected_at >= NOW() - INTERVAL '24 hours') as completed_today,
        (SELECT COUNT(*) FROM opportunities WHERE status = 'failed' 
         AND detected_at >= NOW() - INTERVAL '24 hours') as failed_today,
        (SELECT COALESCE(SUM(profit_amount), 0) FROM opportunities 
         WHERE status = 'completed' AND detected_at >= NOW() - INTERVAL '24 hours') as profit_today,
        (SELECT COUNT(*) FROM matches WHERE status = 'live') as live_matches_count
    `);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: stats.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching scanner stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
