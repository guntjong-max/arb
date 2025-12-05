// src/routes/matches.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../config/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/v1/matches - Get all matches with markets and odds
router.get('/', async (req, res) => {
  try {
    const { sportsbook, league, status = 'scheduled,live', limit = 50 } = req.query;

    let query = `
      SELECT 
        m.id as match_id,
        m.sportsbook_name,
        m.league,
        m.home_team,
        m.away_team,
        m.match_date,
        m.status as match_status,
        json_agg(
          json_build_object(
            'market_id', mk.id,
            'market_type', mk.market_type,
            'market_name', mk.market_name,
            'market_params', mk.market_params,
            'odds', (
              SELECT json_agg(
                json_build_object(
                  'selection', o.selection,
                  'odds_decimal', o.odds_decimal,
                  'odds_fractional', o.odds_fractional,
                  'odds_american', o.odds_american,
                  'available', o.available,
                  'last_updated', o.last_updated
                )
              )
              FROM odds o
              WHERE o.market_id = mk.id
            )
          )
        ) as markets
      FROM matches m
      LEFT JOIN markets mk ON mk.match_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (sportsbook) {
      query += ` AND m.sportsbook_name = $${paramCount}`;
      params.push(sportsbook);
      paramCount++;
    }

    if (league) {
      query += ` AND m.league ILIKE $${paramCount}`;
      params.push(`%${league}%`);
      paramCount++;
    }

    if (status) {
      const statuses = status.split(',');
      query += ` AND m.status = ANY($${paramCount})`;
      params.push(statuses);
      paramCount++;
    }

    query += `
      GROUP BY m.id
      ORDER BY m.match_date ASC
      LIMIT $${paramCount}
    `;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      message: error.message
    });
  }
});

// GET /api/v1/matches/:id - Get single match with details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        m.*,
        json_agg(
          json_build_object(
            'market_id', mk.id,
            'market_type', mk.market_type,
            'market_name', mk.market_name,
            'market_params', mk.market_params,
            'odds', (
              SELECT json_agg(
                json_build_object(
                  'selection', o.selection,
                  'odds_decimal', o.odds_decimal,
                  'available', o.available,
                  'last_updated', o.last_updated
                )
              )
              FROM odds o
              WHERE o.market_id = mk.id
            )
          )
        ) as markets
      FROM matches m
      LEFT JOIN markets mk ON mk.match_id = m.id
      WHERE m.id = $1
      GROUP BY m.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match',
      message: error.message
    });
  }
});

module.exports = router;
