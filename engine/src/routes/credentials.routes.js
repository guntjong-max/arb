// src/routes/credentials.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../config/logger');
const CryptoJS = require('crypto-js');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/v1/credentials - Get all credentials (without passwords)
router.get('/', async (req, res) => {
  try {
    const { sportsbook, active } = req.query;

    let query = `
      SELECT 
        id, 
        sportsbook_name, 
        username, 
        active, 
        created_at, 
        updated_at, 
        last_login_at,
        login_url,
        notes
      FROM credentials
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (sportsbook) {
      query += ` AND sportsbook_name = $${paramCount}`;
      params.push(sportsbook);
      paramCount++;
    }

    if (active !== undefined) {
      query += ` AND active = $${paramCount}`;
      params.push(active === 'true');
      paramCount++;
    }

    query += ` ORDER BY sportsbook_name, username`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credentials',
      message: error.message
    });
  }
});

// GET /api/v1/credentials/:id - Get single credential
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, 
        sportsbook_name, 
        username, 
        active, 
        created_at, 
        updated_at, 
        last_login_at,
        login_url,
        notes
      FROM credentials
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credential',
      message: error.message
    });
  }
});

// POST /api/v1/credentials - Create new credential
router.post('/', async (req, res) => {
  try {
    const { sportsbook_name, username, password, login_url, notes, active = true } = req.body;

    // Validation
    if (!sportsbook_name || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sportsbook_name, username, password'
      });
    }

    // Encrypt password
    const encryptionKey = process.env.SESSION_ENCRYPTION_KEY || 'default-key';
    const encryptedPassword = CryptoJS.AES.encrypt(password, encryptionKey).toString();

    const query = `
      INSERT INTO credentials (sportsbook_name, username, encrypted_password, active, login_url, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, sportsbook_name, username, active, created_at, login_url, notes
    `;

    const result = await pool.query(query, [
      sportsbook_name,
      username,
      encryptedPassword,
      active,
      login_url || null,
      notes || null
    ]);

    logger.info('Credential created:', { id: result.rows[0].id, sportsbook: sportsbook_name, username });

    res.status(201).json({
      success: true,
      message: 'Credential created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error creating credential:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Credential already exists for this sportsbook and username'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create credential',
      message: error.message
    });
  }
});

// PUT /api/v1/credentials/:id - Update credential
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, login_url, notes, active } = req.body;

    const updates = [];
    const params = [id];
    let paramCount = 2;

    if (password) {
      const encryptionKey = process.env.SESSION_ENCRYPTION_KEY || 'default-key';
      const encryptedPassword = CryptoJS.AES.encrypt(password, encryptionKey).toString();
      updates.push(`encrypted_password = $${paramCount}`);
      params.push(encryptedPassword);
      paramCount++;
    }

    if (login_url !== undefined) {
      updates.push(`login_url = $${paramCount}`);
      params.push(login_url);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
      paramCount++;
    }

    if (active !== undefined) {
      updates.push(`active = $${paramCount}`);
      params.push(active);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const query = `
      UPDATE credentials
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING id, sportsbook_name, username, active, updated_at, login_url, notes
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
    }

    logger.info('Credential updated:', { id });

    res.json({
      success: true,
      message: 'Credential updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error updating credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update credential',
      message: error.message
    });
  }
});

// DELETE /api/v1/credentials/:id - Delete credential
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM credentials WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
    }

    logger.info('Credential deleted:', { id });

    res.json({
      success: true,
      message: 'Credential deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting credential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete credential',
      message: error.message
    });
  }
});

module.exports = router;
