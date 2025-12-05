// src/routes/worker.routes.js - Worker management endpoints
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../config/logger');
const { metrics } = require('../utils/metrics');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/v1/workers/status - Get all worker statuses
router.get('/status', async (req, res) => {
  try {
    const query = 'SELECT * FROM v_worker_stats ORDER BY worker_name';
    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching worker status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch worker status',
      message: error.message
    });
  }
});

// POST /api/v1/workers/register - Register worker
router.post('/register', async (req, res) => {
  try {
    const { worker_name, sportsbook_name, scrape_interval_seconds = 15, config = {} } = req.body;

    if (!worker_name || !sportsbook_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: worker_name, sportsbook_name'
      });
    }

    const query = `
      INSERT INTO workers (worker_name, sportsbook_name, status, scrape_interval_seconds, config)
      VALUES ($1, $2, 'stopped', $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      worker_name,
      sportsbook_name,
      scrape_interval_seconds,
      JSON.stringify(config)
    ]);

    logger.info('Worker registered:', { worker_name, sportsbook_name });
    metrics.workerActiveCount.inc();

    res.status(201).json({
      success: true,
      message: 'Worker registered successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Worker registration error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Worker with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to register worker',
      message: error.message
    });
  }
});

// POST /api/v1/workers/:id/heartbeat - Worker heartbeat
router.post('/:id/heartbeat', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE workers 
      SET last_heartbeat = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    res.json({
      success: true,
      message: 'Heartbeat received',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process heartbeat',
      message: error.message
    });
  }
});

// GET /api/v1/workers - List workers
router.get('/', async (req, res) => {
  try {
    const { status, sportsbook } = req.query;

    let query = 'SELECT * FROM workers WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (sportsbook) {
      query += ` AND sportsbook_name = $${paramCount}`;
      params.push(sportsbook);
      paramCount++;
    }

    query += ' ORDER BY worker_name';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error listing workers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list workers',
      message: error.message
    });
  }
});

// GET /api/v1/workers/:id - Get worker details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM workers WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching worker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch worker',
      message: error.message
    });
  }
});

// POST /api/v1/workers/:id/control - Control worker (start/stop/restart)
router.post('/:id/control', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['start', 'stop', 'restart', 'pause'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be: start, stop, restart, or pause'
      });
    }

    // Get worker info
    const workerQuery = 'SELECT * FROM workers WHERE id = $1';
    const workerResult = await pool.query(workerQuery, [id]);

    if (workerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    const worker = workerResult.rows[0];

    // Update worker status based on action
    let newStatus = worker.status;
    switch (action) {
      case 'start':
        newStatus = 'running';
        break;
      case 'stop':
        newStatus = 'stopped';
        break;
      case 'pause':
        newStatus = 'paused';
        break;
      case 'restart':
        newStatus = 'running';
        break;
    }

    const updateQuery = `
      UPDATE workers 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const updateResult = await pool.query(updateQuery, [newStatus, id]);

    // Log the action
    const logQuery = `
      INSERT INTO logs (worker_id, level, message, details)
      VALUES ($1, 'info', $2, $3)
    `;
    await pool.query(logQuery, [
      id,
      `Worker ${action} command received`,
      JSON.stringify({ action, previous_status: worker.status, new_status: newStatus })
    ]);

    logger.info(`Worker control: ${worker.worker_name} - ${action}`);

    res.json({
      success: true,
      message: `Worker ${action} command sent successfully`,
      data: updateResult.rows[0]
    });

  } catch (error) {
    logger.error('Error controlling worker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to control worker',
      message: error.message
    });
  }
});

module.exports = router;
