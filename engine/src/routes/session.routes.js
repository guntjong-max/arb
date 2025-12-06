// src/routes/session.routes.js - Sportsbook session management endpoints
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const logger = require('../config/logger');

// POST /api/v1/sessions - Record new sportsbook session
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      sportsbook,
      session_data,
      consent_id,
      expires_at
    } = req.body;

    // Validate required fields
    if (!user_id || !sportsbook || !session_data || !consent_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'sportsbook', 'session_data', 'consent_id']
      });
    }

    const pool = getPool();

    // Verify consent exists and is valid
    const consentCheck = await pool.query(
      `SELECT id, consent_given, expires_at, revoked_at 
       FROM user_consents 
       WHERE id = $1 AND user_id = $2`,
      [consent_id, user_id]
    );

    if (consentCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Consent not found',
        message: 'No valid consent found for this user and consent_id'
      });
    }

    const consent = consentCheck.rows[0];

    // Check if consent is valid
    if (!consent.consent_given) {
      return res.status(403).json({
        error: 'Consent not granted',
        message: 'User has not granted consent for session usage'
      });
    }

    if (consent.revoked_at) {
      return res.status(403).json({
        error: 'Consent revoked',
        message: 'User consent has been revoked'
      });
    }

    if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
      return res.status(403).json({
        error: 'Consent expired',
        message: 'User consent has expired'
      });
    }

    // Insert session record
    const result = await pool.query(
      `INSERT INTO sportsbook_sessions 
       (user_id, sportsbook, session_data, consent_id, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, user_id, sportsbook, status, created_at, expires_at`,
      [user_id, sportsbook, session_data, consent_id, expires_at || null]
    );

    const session = result.rows[0];

    // Log audit event
    await pool.query(
      `INSERT INTO audit_logs 
       (event_type, entity_type, entity_id, user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'session_created',
        'sportsbook_session',
        session.id,
        user_id,
        'create_session',
        JSON.stringify({ sportsbook, consent_id }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('Sportsbook session created', {
      session_id: session.id,
      user_id,
      sportsbook
    });

    res.status(201).json({
      message: 'Session created successfully',
      session: {
        id: session.id,
        user_id: session.user_id,
        sportsbook: session.sportsbook,
        status: session.status,
        created_at: session.created_at,
        expires_at: session.expires_at
      }
    });
  } catch (error) {
    logger.error('Session creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /api/v1/sessions - List sessions
router.get('/', async (req, res) => {
  try {
    const { user_id, sportsbook, status } = req.query;
    const pool = getPool();

    let query = `
      SELECT 
        id, user_id, sportsbook, status, 
        last_used_at, usage_count, expires_at, 
        created_at, updated_at
      FROM sportsbook_sessions
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (user_id) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (sportsbook) {
      query += ` AND sportsbook = $${paramIndex}`;
      params.push(sportsbook);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await pool.query(query, params);

    logger.info('Sessions listed', {
      count: result.rows.length,
      filters: { user_id, sportsbook, status }
    });

    res.status(200).json({
      sessions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Session list error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /api/v1/sessions/:id - Get session details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        s.id, s.user_id, s.sportsbook, s.status,
        s.last_used_at, s.usage_count, s.expires_at,
        s.created_at, s.updated_at, s.consent_id,
        c.consent_given, c.consent_version
       FROM sportsbook_sessions s
       LEFT JOIN user_consents c ON s.consent_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const session = result.rows[0];

    // Don't return session_data for security
    logger.info('Session details retrieved', { session_id: id });

    res.status(200).json({
      session: {
        id: session.id,
        user_id: session.user_id,
        sportsbook: session.sportsbook,
        status: session.status,
        last_used_at: session.last_used_at,
        usage_count: session.usage_count,
        expires_at: session.expires_at,
        created_at: session.created_at,
        updated_at: session.updated_at,
        consent: {
          id: session.consent_id,
          granted: session.consent_given,
          version: session.consent_version
        }
      }
    });
  } catch (error) {
    logger.error('Session details error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// PATCH /api/v1/sessions/:id - Update session status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'expired', 'revoked', 'invalid'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: validStatuses
      });
    }

    const pool = getPool();

    const result = await pool.query(
      `UPDATE sportsbook_sessions 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, user_id, sportsbook, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const session = result.rows[0];

    // Log audit event
    await pool.query(
      `INSERT INTO audit_logs 
       (event_type, entity_type, entity_id, user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'session_updated',
        'sportsbook_session',
        session.id,
        session.user_id,
        'update_status',
        JSON.stringify({ old_status: status, new_status: status }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('Session status updated', {
      session_id: session.id,
      status
    });

    res.status(200).json({
      message: 'Session updated successfully',
      session
    });
  } catch (error) {
    logger.error('Session update error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// DELETE /api/v1/sessions/:id - Revoke session
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE sportsbook_sessions 
       SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, user_id, sportsbook, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const session = result.rows[0];

    // Log audit event
    await pool.query(
      `INSERT INTO audit_logs 
       (event_type, entity_type, entity_id, user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'session_revoked',
        'sportsbook_session',
        session.id,
        session.user_id,
        'revoke_session',
        JSON.stringify({ sportsbook: session.sportsbook }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('Session revoked', {
      session_id: session.id
    });

    res.status(200).json({
      message: 'Session revoked successfully',
      session
    });
  } catch (error) {
    logger.error('Session revoke error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;
