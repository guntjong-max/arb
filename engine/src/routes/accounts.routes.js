// src/routes/accounts.routes.js - Sportsbook account management
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const logger = require('../config/logger');

// GET /api/v1/accounts - List all sportsbook accounts
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, sportsbook, url, username, status, balance, currency,
              last_login_at, last_balance_update, created_at, updated_at
       FROM sportsbook_accounts
       ORDER BY sportsbook, username`
    );

    res.json({
      success: true,
      count: result.rows.length,
      accounts: result.rows
    });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/accounts/:id - Get single account
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT id, sportsbook, url, username, status, balance, currency,
              last_login_at, last_balance_update, created_at, updated_at
       FROM sportsbook_accounts
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({
      success: true,
      account: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/accounts - Create new account
router.post('/', async (req, res) => {
  try {
    const { user_id, sportsbook, url, username, password } = req.body;
    
    // Validation
    if (!sportsbook || !url || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sportsbook, url, username, password'
      });
    }

    const pool = getPool();
    
    // TODO: Encrypt password before storing
    // For now, storing as plain text (MUST BE ENCRYPTED IN PRODUCTION!)
    const password_encrypted = Buffer.from(password).toString('base64');
    
    const result = await pool.query(
      `INSERT INTO sportsbook_accounts 
       (user_id, sportsbook, url, username, password_encrypted)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sportsbook, url, username, status, created_at`,
      [user_id || null, sportsbook, url, username, password_encrypted]
    );

    logger.info(`New account created: ${sportsbook} - ${username}`);

    res.status(201).json({
      success: true,
      account: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating account:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Account already exists for this sportsbook and username'
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/accounts/:id - Update account
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { url, username, password } = req.body;
    const pool = getPool();
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (url) {
      updates.push(`url = $${paramCount++}`);
      values.push(url);
    }
    if (username) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (password) {
      const password_encrypted = Buffer.from(password).toString('base64');
      updates.push(`password_encrypted = $${paramCount++}`);
      values.push(password_encrypted);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE sportsbook_accounts 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, sportsbook, url, username, status, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    logger.info(`Account updated: ${id}`);

    res.json({
      success: true,
      account: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/accounts/:id - Delete account
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const result = await pool.query(
      'DELETE FROM sportsbook_accounts WHERE id = $1 RETURNING sportsbook, username',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    logger.info(`Account deleted: ${result.rows[0].sportsbook} - ${result.rows[0].username}`);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/accounts/:id/update-balance - Update account balance
router.post('/:id/update-balance', async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;
    const pool = getPool();
    
    const result = await pool.query(
      `UPDATE sportsbook_accounts 
       SET balance = $1, last_balance_update = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, sportsbook, username, balance, currency`,
      [balance, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({
      success: true,
      account: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/accounts/:id/update-status - Update account status
router.post('/:id/update-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const pool = getPool();
    
    const result = await pool.query(
      `UPDATE sportsbook_accounts 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, sportsbook, username, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({
      success: true,
      account: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
