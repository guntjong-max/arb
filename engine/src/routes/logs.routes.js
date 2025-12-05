// src/routes/logs.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../config/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/v1/logs - Get logs
router.get('/', async (req, res) => {
  try {
    const { level, worker_id, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (level) {
      query += ` AND level = $${paramCount}`;
      params.push(level);
      paramCount++;
    }

    if (worker_id) {
      query += ` AND worker_id = $${paramCount}`;
      params.push(worker_id);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
      message: error.message
    });
  }
});

module.exports = router;
