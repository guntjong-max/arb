const express = require('express');
const router = express.Router();
const scraperService = require('../services/scraper.service');
const { getPool } = require('../config/database');
const logger = require('../config/logger');

router.post('/login/nova88', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    logger.info(`Nova88 login request for user: ${username}`);
    
    const result = await scraperService.loginNova88(username, password);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        bookmaker: 'nova88',
        username,
        balance: result.balance,
        duration: result.duration,
        message: 'Login successful'
      });
    } else {
      return res.status(401).json({
        success: false,
        error: result.error,
        errorType: result.errorType
      });
    }
  } catch (error) {
    logger.error('Nova88 login route error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login',
      message: error.message
    });
  }
});

router.post('/login/qq188', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    logger.info(`QQ188 login request for user: ${username}`);
    
    const result = await scraperService.loginQQ188(username, password);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        bookmaker: 'qq188',
        username,
        balance: result.balance,
        duration: result.duration,
        message: 'Login successful'
      });
    } else {
      return res.status(401).json({
        success: false,
        error: result.error,
        errorType: result.errorType
      });
    }
  } catch (error) {
    logger.error('QQ188 login route error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login',
      message: error.message
    });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const pool = getPool();
    
    const { bookmaker, status } = req.query;
    
    let query = 'SELECT id, bookmaker, username, balance, status, created_at, updated_at, expires_at FROM sessions WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (bookmaker) {
      query += ` AND bookmaker = $${paramCount}`;
      params.push(bookmaker);
      paramCount++;
    }
    
    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const result = await pool.query(query, params);
    
    return res.status(200).json({
      success: true,
      count: result.rows.length,
      sessions: result.rows
    });
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
      message: error.message
    });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    await pool.query(
      'UPDATE sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['expired', id]
    );
    
    logger.info(`Session ${id} marked as expired`);
    
    return res.status(200).json({
      success: true,
      message: 'Session expired successfully'
    });
  } catch (error) {
    logger.error('Error expiring session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to expire session',
      message: error.message
    });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool.query(
      'SELECT id, bookmaker, username, balance, status, created_at, updated_at, expires_at FROM sessions WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      session: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch session',
      message: error.message
    });
  }
});

module.exports = router;
