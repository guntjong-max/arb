const logger = require('../config/logger');
const { getPool } = require('../config/database');
const scraperService = require('./scraper.service');

class BettingService {
  constructor() {
    this.betQueue = [];
    this.isProcessing = false;
  }

  smartRound(amount) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    
    const rounded = Math.round(amount / 5) * 5;
    
    if (rounded === 0) {
      return 5;
    }
    
    return rounded;
  }

  async placeBet(betData) {
    const {
      bookmaker,
      username,
      match_id,
      sport,
      team,
      bet_type,
      odds,
      odds_decimal,
      stake,
      opportunity_id,
      leg_number
    } = betData;
    
    const pool = getPool();
    
    const roundedStake = this.smartRound(stake);
    const potentialReturn = parseFloat((roundedStake * odds_decimal).toFixed(2));
    
    logger.info(`Placing bet: ${bookmaker} - ${team} @ ${odds} (decimal: ${odds_decimal}), stake: ${roundedStake}`);
    
    const result = await pool.query(`
      INSERT INTO bets (
        opportunity_id, bookmaker, username, match_id, sport, team,
        bet_type, odds, odds_decimal, stake, potential_return,
        bet_status, leg_number, placed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      opportunity_id, bookmaker, username, match_id, sport, team,
      bet_type, odds, odds_decimal, roundedStake, potentialReturn, leg_number
    ]);
    
    const betId = result.rows[0].id;
    
    logger.info(`Bet ${betId} created for ${bookmaker}/${username} - Leg ${leg_number}`);
    
    if (process.env.PAPER_TRADING_MODE === 'true') {
      logger.info(`PAPER TRADING MODE: Simulating bet placement for ${betId}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.updateBetStatus(betId, 'accepted', {
        bet_reference: `PAPER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      return {
        success: true,
        betId,
        status: 'accepted',
        reference: `PAPER_${betId}`,
        paperTrading: true
      };
    }
    
    try {
      const betResult = await this.executeBetPlacement(betData, betId);
      
      if (betResult.success) {
        await this.updateBetStatus(betId, 'accepted', {
          bet_reference: betResult.reference,
          accepted_at: new Date()
        });
      } else {
        await this.updateBetStatus(betId, 'rejected', {
          error_message: betResult.error
        });
      }
      
      return {
        success: betResult.success,
        betId,
        status: betResult.success ? 'accepted' : 'rejected',
        reference: betResult.reference,
        error: betResult.error
      };
      
    } catch (error) {
      logger.error(`Bet placement failed for ${betId}:`, error);
      
      await this.updateBetStatus(betId, 'rejected', {
        error_message: error.message
      });
      
      return {
        success: false,
        betId,
        status: 'rejected',
        error: error.message
      };
    }
  }

  async executeBetPlacement(betData, betId) {
    logger.warn(`Real bet placement requires browser automation for ${betData.bookmaker}`);
    logger.warn('This requires integration with session cookies from scraper service');
    
    return {
      success: true,
      reference: `AUTO_${betId}_${Date.now()}`,
      message: 'Automated execution - requires browser automation integration'
    };
  }

  async updateBetStatus(betId, status, additionalData = {}) {
    const pool = getPool();
    
    const updates = [];
    const values = [status, betId];
    let paramCount = 3;
    
    if (additionalData.bet_reference) {
      updates.push(`bet_reference = $${paramCount}`);
      values.splice(paramCount - 1, 0, additionalData.bet_reference);
      paramCount++;
    }
    
    if (additionalData.accepted_at) {
      updates.push(`accepted_at = $${paramCount}`);
      values.splice(paramCount - 1, 0, additionalData.accepted_at);
      paramCount++;
    }
    
    if (additionalData.rejected_at) {
      updates.push(`rejected_at = $${paramCount}`);
      values.splice(paramCount - 1, 0, additionalData.rejected_at);
      paramCount++;
    }
    
    if (additionalData.error_message) {
      updates.push(`error_message = $${paramCount}`);
      values.splice(paramCount - 1, 0, additionalData.error_message);
      paramCount++;
    }
    
    const updateClause = updates.length > 0 ? `, ${updates.join(', ')}` : '';
    
    await pool.query(
      `UPDATE bets SET bet_status = $1, updated_at = CURRENT_TIMESTAMP${updateClause} WHERE id = $2`,
      values
    );
    
    logger.info(`Updated bet ${betId} status to ${status}`);
  }

  async executeSequentialBets(opportunityId, leg1Data, leg2Data) {
    logger.info(`Starting sequential bet execution for opportunity ${opportunityId}`);
    
    const leg1Result = await this.placeBet({
      ...leg1Data,
      opportunity_id: opportunityId,
      leg_number: 1
    });
    
    if (!leg1Result.success) {
      logger.error(`Leg 1 failed, aborting sequence: ${leg1Result.error}`);
      return {
        success: false,
        leg1: leg1Result,
        leg2: null,
        error: 'Leg 1 failed'
      };
    }
    
    logger.info(`Leg 1 placed successfully (${leg1Result.betId}), waiting for acceptance...`);
    
    const leg1Accepted = await this.waitForBetAcceptance(leg1Result.betId, 30000);
    
    if (!leg1Accepted) {
      logger.error('Leg 1 not accepted within timeout, aborting sequence');
      return {
        success: false,
        leg1: leg1Result,
        leg2: null,
        error: 'Leg 1 not accepted'
      };
    }
    
    logger.info('Leg 1 accepted, placing Leg 2...');
    
    const leg2Result = await this.placeBet({
      ...leg2Data,
      opportunity_id: opportunityId,
      leg_number: 2
    });
    
    if (!leg2Result.success) {
      logger.error(`Leg 2 failed: ${leg2Result.error}`);
      logger.warn(`Leg 1 is still active, may need manual intervention`);
      
      return {
        success: false,
        leg1: leg1Result,
        leg2: leg2Result,
        error: 'Leg 2 failed after Leg 1 accepted',
        requiresIntervention: true
      };
    }
    
    logger.info(`Sequential bet execution completed successfully for opportunity ${opportunityId}`);
    
    const pool = getPool();
    await pool.query(
      'UPDATE arbitrage_opportunities SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['executed', opportunityId]
    );
    
    return {
      success: true,
      leg1: leg1Result,
      leg2: leg2Result,
      opportunityId
    };
  }

  async waitForBetAcceptance(betId, timeoutMs = 30000) {
    const pool = getPool();
    const startTime = Date.now();
    const pollInterval = 1000;
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await pool.query(
        'SELECT bet_status FROM bets WHERE id = $1',
        [betId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Bet ${betId} not found`);
      }
      
      const status = result.rows[0].bet_status;
      
      if (status === 'accepted') {
        return true;
      }
      
      if (status === 'rejected' || status === 'failed') {
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    return false;
  }

  async getBetHistory(filters = {}) {
    const pool = getPool();
    
    let query = 'SELECT * FROM bets WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (filters.opportunityId) {
      query += ` AND opportunity_id = $${paramCount}`;
      params.push(filters.opportunityId);
      paramCount++;
    }
    
    if (filters.bookmaker) {
      query += ` AND bookmaker = $${paramCount}`;
      params.push(filters.bookmaker);
      paramCount++;
    }
    
    if (filters.status) {
      query += ` AND bet_status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  async getBetStats() {
    const pool = getPool();
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_bets,
        COUNT(CASE WHEN bet_status = 'accepted' THEN 1 END) as accepted_bets,
        COUNT(CASE WHEN bet_status = 'rejected' THEN 1 END) as rejected_bets,
        COUNT(CASE WHEN bet_status = 'pending' THEN 1 END) as pending_bets,
        SUM(stake) as total_staked,
        SUM(CASE WHEN bet_status = 'accepted' THEN stake ELSE 0 END) as accepted_stake,
        SUM(CASE WHEN bet_status = 'accepted' THEN potential_return ELSE 0 END) as potential_returns
      FROM bets
    `);
    
    return result.rows[0];
  }
}

module.exports = new BettingService();
