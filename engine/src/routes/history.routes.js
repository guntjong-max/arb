// src/routes/history.routes.js - Execution history and logs
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const logger = require('../config/logger');

// GET /api/v1/history/bets - Get bet execution history
router.get('/bets', async (req, res) => {
  try {
    const { 
      status, 
      account_id, 
      limit = 100, 
      offset = 0,
      date_from,
      date_to
    } = req.query;
    
    const pool = getPool();
    
    // Build query dynamically
    let query = `
      SELECT 
        b.id,
        b.bet_type,
        b.market_type,
        b.pick,
        b.handicap,
        b.odds,
        b.stake,
        b.status,
        b.ticket_id,
        b.placed_at,
        b.settled_at,
        b.payout,
        b.error_message,
        m.home_team || ' vs ' || m.away_team as match,
        m.league,
        sa.sportsbook,
        sa.username as account_username
      FROM bets b
      LEFT JOIN matches m ON b.match_id = m.id
      LEFT JOIN sportsbook_accounts sa ON b.account_id = sa.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND b.status = $${paramCount++}`;
      params.push(status);
    }
    
    if (account_id) {
      query += ` AND b.account_id = $${paramCount++}`;
      params.push(account_id);
    }
    
    if (date_from) {
      query += ` AND b.placed_at >= $${paramCount++}`;
      params.push(date_from);
    }
    
    if (date_to) {
      query += ` AND b.placed_at <= $${paramCount++}`;
      params.push(date_to);
    }
    
    query += ` ORDER BY b.placed_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      bets: result.rows
    });
  } catch (error) {
    logger.error('Error fetching bet history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/history/logs - Get activity logs
router.get('/logs', async (req, res) => {
  try {
    const { 
      level, 
      category, 
      limit = 500, 
      offset = 0 
    } = req.query;
    
    const pool = getPool();
    
    let query = `
      SELECT 
        id,
        level,
        category,
        message,
        metadata,
        created_at
      FROM activity_logs
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (level) {
      query += ` AND level = $${paramCount++}`;
      params.push(level);
    }
    
    if (category) {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      logs: result.rows
    });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/history/profit-summary - Get profit summary
router.get('/profit-summary', async (req, res) => {
  try {
    const { period = 'today' } = req.query; // today, week, month, all
    const pool = getPool();
    
    let interval;
    switch (period) {
      case 'today':
        interval = '24 hours';
        break;
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
      default:
        interval = '1000 years'; // All time
    }
    
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_bets,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_bets,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_bets,
        COUNT(*) FILTER (WHERE status = 'running') as running_bets,
        COUNT(*) FILTER (WHERE status = 'won') as won_bets,
        COUNT(*) FILTER (WHERE status = 'lost') as lost_bets,
        COALESCE(SUM(stake), 0) as total_staked,
        COALESCE(SUM(payout) FILTER (WHERE status IN ('won', 'half_won')), 0) as total_payout,
        COALESCE(SUM(payout) FILTER (WHERE status IN ('won', 'half_won')), 0) - 
        COALESCE(SUM(stake) FILTER (WHERE status IN ('won', 'lost', 'half_won', 'half_lost')), 0) as net_profit
      FROM bets
      WHERE placed_at >= NOW() - INTERVAL '${interval}'
    `);
    
    // Get account balances
    const balances = await pool.query(`
      SELECT 
        sportsbook,
        SUM(balance) as total_balance,
        currency
      FROM sportsbook_accounts
      WHERE status = 'online'
      GROUP BY sportsbook, currency
    `);

    res.json({
      success: true,
      period,
      summary: result.rows[0],
      balances: balances.rows
    });
  } catch (error) {
    logger.error('Error fetching profit summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/history/performance - Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const pool = getPool();
    
    const result = await pool.query(`
      SELECT
        DATE(placed_at) as date,
        COUNT(*) as bets_count,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COALESCE(SUM(stake), 0) as total_staked,
        COALESCE(SUM(payout) FILTER (WHERE status = 'won'), 0) - 
        COALESCE(SUM(stake) FILTER (WHERE status IN ('won', 'lost')), 0) as daily_profit
      FROM bets
      WHERE placed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(placed_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      performance: result.rows
    });
  } catch (error) {
    logger.error('Error fetching performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
