// src/config/database.js
const { Pool } = require('pg');
const logger = require('./logger');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error:', err);
    });

    this.pool.on('connect', () => {
      logger.info('Database connection established');
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Database query error:', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.query();
  }

  async close() {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  // Helper methods for worker operations
  async getCredentials(sportsbookName) {
    const query = `
      SELECT id, sportsbook_name, username, encrypted_password, login_url, active
      FROM credentials
      WHERE sportsbook_name = $1 AND active = true
      LIMIT 1
    `;
    const result = await this.query(query, [sportsbookName]);
    return result.rows[0];
  }

  async updateWorkerStatus(workerName, status, extraData = {}) {
    const query = `
      UPDATE workers 
      SET status = $1, 
          last_heartbeat = NOW(),
          ${extraData.session_active !== undefined ? 'session_active = $3,' : ''}
          ${extraData.total_scrapes !== undefined ? 'total_scrapes = total_scrapes + 1,' : ''}
          ${extraData.total_errors !== undefined ? 'total_errors = total_errors + 1,' : ''}
          updated_at = NOW()
      WHERE worker_name = $2
      RETURNING *
    `;
    const params = [status, workerName];
    if (extraData.session_active !== undefined) params.push(extraData.session_active);
    
    const result = await this.query(query, params);
    return result.rows[0];
  }

  async insertLog(workerId, level, message, details = {}) {
    const query = `
      INSERT INTO logs (worker_id, level, message, details)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const result = await this.query(query, [workerId, level, message, details]);
    return result.rows[0];
  }

  async upsertMatch(matchData) {
    const query = `
      INSERT INTO matches (sportsbook_name, external_match_id, league, home_team, away_team, match_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (sportsbook_name, external_match_id) 
      DO UPDATE SET 
        league = EXCLUDED.league,
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        match_date = EXCLUDED.match_date,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await this.query(query, [
      matchData.sportsbookName,
      matchData.externalMatchId,
      matchData.league,
      matchData.homeTeam,
      matchData.awayTeam,
      matchData.matchDate,
      matchData.status || 'scheduled'
    ]);
    return result.rows[0];
  }

  async upsertMarket(marketData) {
    const query = `
      INSERT INTO markets (match_id, market_type, market_name, market_params, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (match_id, market_type, market_name) 
      DO UPDATE SET 
        market_params = EXCLUDED.market_params,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `;
    // Note: Need to add unique constraint to markets table for this to work
    const result = await this.query(query, [
      marketData.matchId,
      marketData.marketType,
      marketData.marketName,
      marketData.marketParams || null,
      marketData.status || 'active'
    ]);
    return result.rows[0];
  }

  async upsertOdds(oddsData) {
    const query = `
      INSERT INTO odds (market_id, selection, odds_decimal, odds_fractional, odds_american, available)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (market_id, selection) 
      DO UPDATE SET 
        odds_decimal = EXCLUDED.odds_decimal,
        odds_fractional = EXCLUDED.odds_fractional,
        odds_american = EXCLUDED.odds_american,
        available = EXCLUDED.available,
        last_updated = NOW()
      RETURNING *
    `;
    const result = await this.query(query, [
      oddsData.marketId,
      oddsData.selection,
      oddsData.oddsDecimal,
      oddsData.oddsFractional || null,
      oddsData.oddsAmerican || null,
      oddsData.available !== false
    ]);
    return result.rows[0];
  }

  async insertOddsHistory(historyData) {
    const query = `
      INSERT INTO odds_history (market_id, selection, odds_decimal, odds_fractional, odds_american, change_type, previous_odds)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const result = await this.query(query, [
      historyData.marketId,
      historyData.selection,
      historyData.oddsDecimal,
      historyData.oddsFractional || null,
      historyData.oddsAmerican || null,
      historyData.changeType,
      historyData.previousOdds || null
    ]);
    return result.rows[0];
  }

  async getWorker(workerName) {
    const query = 'SELECT * FROM workers WHERE worker_name = $1';
    const result = await this.query(query, [workerName]);
    return result.rows[0];
  }
}

module.exports = new Database();
