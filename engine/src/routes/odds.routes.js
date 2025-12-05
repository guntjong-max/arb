// src/routes/odds.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../config/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/v1/odds/latest - Get latest odds
router.get('/latest', async (req, res) => {
  try {
    const { sportsbook, league, limit = 100 } = req.query;

    let query = `
      SELECT * FROM v_latest_odds
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (sportsbook) {
      query += ` AND sportsbook_name = $${paramCount}`;
      params.push(sportsbook);
      paramCount++;
    }

    if (league) {
      query += ` AND league ILIKE $${paramCount}`;
      params.push(`%${league}%`);
      paramCount++;
    }

    query += ` ORDER BY match_date ASC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching latest odds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch odds',
      message: error.message
    });
  }
});

// GET /api/v1/odds/history/:marketId - Get odds history for a market
router.get('/history/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params;
    const { limit = 50 } = req.query;

    const query = `
      SELECT * FROM odds_history
      WHERE market_id = $1
      ORDER BY changed_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [marketId, parseInt(limit)]);

    res.json({
      success: true,
      marketId,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching odds history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch odds history',
      message: error.message
    });
  }
});

module.exports = router;
