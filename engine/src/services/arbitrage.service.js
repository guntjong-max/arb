// src/services/arbitrage.service.js - Core arbitrage betting logic
const logger = require('../config/logger');
const OddsService = require('./odds.service');
const { getPool } = require('../config/database');
const { getRedisClient } = require('../config/redis');

/**
 * Sure-bet execution engine with safety mechanisms
 */
class ArbitrageService {
  /**
   * Execute sure-bet with proper sequencing (Value bet first, then Hedge)
   * @param {Object} opportunity - Arbitrage opportunity
   * @param {Object} config - System configuration
   * @returns {Promise<Object>} Execution result
   */
  static async executeSureBet(opportunity, config) {
    const pool = getPool();
    const redis = getRedisClient();
    
    logger.info(`Executing sure-bet opportunity ${opportunity.id}`);
    
    try {
      // Step 1: Validate opportunity
      const validation = OddsService.validateOpportunity(opportunity, config);
      if (!validation.valid) {
        logger.warn(`Opportunity validation failed: ${validation.reason}`);
        return {
          success: false,
          reason: validation.reason,
          stage: 'validation'
        };
      }
      
      // Step 2: Check emergency stop
      if (config.emergency_stop) {
        logger.warn('Emergency stop is active - aborting execution');
        return {
          success: false,
          reason: 'Emergency stop activated',
          stage: 'pre_check'
        };
      }
      
      // Step 3: Place VALUE BET first (positive value side)
      logger.info('Step 1: Placing value bet (leg A)');
      const valueBetResult = await this.placeValueBet(opportunity);
      
      if (!valueBetResult.success) {
        logger.error('Value bet placement failed', valueBetResult);
        await this.logBetFailure(opportunity, 'value', valueBetResult.error);
        return {
          success: false,
          reason: 'Value bet failed',
          stage: 'value_bet',
          error: valueBetResult.error
        };
      }
      
      // Step 4: Wait for value bet status (ACCEPTED or RUNNING)
      logger.info('Step 2: Waiting for value bet confirmation...');
      const valueBetStatus = await this.waitForBetStatus(
        valueBetResult.bet_id,
        ['accepted', 'running'],
        30000 // 30 seconds timeout
      );
      
      if (!valueBetStatus.confirmed) {
        logger.error('Value bet not confirmed - aborting hedge', valueBetStatus);
        
        // If REJECTED, don't place hedge
        if (valueBetStatus.status === 'rejected') {
          logger.warn('Value bet REJECTED - sure-bet aborted');
          await this.updateOpportunityStatus(opportunity.id, 'failed', 'Value bet rejected');
          return {
            success: false,
            reason: 'Value bet rejected',
            stage: 'value_confirmation',
            valueBet: valueBetResult
          };
        }
        
        // If timeout, still might place hedge (risky)
        logger.warn('Value bet status timeout - proceeding with caution');
      }
      
      // Step 5: Place HEDGE BET (lawan/opposite side)
      logger.info('Step 3: Placing hedge bet (leg B)');
      const hedgeBetResult = await this.placeHedgeBet(opportunity);
      
      if (!hedgeBetResult.success) {
        logger.error('Hedge bet placement failed - partial execution!', hedgeBetResult);
        await this.logBetFailure(opportunity, 'hedge', hedgeBetResult.error);
        
        // Critical: Value bet placed but hedge failed
        await this.handlePartialExecution(opportunity, valueBetResult);
        
        return {
          success: false,
          reason: 'Hedge bet failed (partial execution)',
          stage: 'hedge_bet',
          valueBet: valueBetResult,
          error: hedgeBetResult.error
        };
      }
      
      // Step 6: Mark opportunity as completed
      await this.updateOpportunityStatus(opportunity.id, 'completed', 'Both legs executed successfully');
      
      logger.info(`Sure-bet executed successfully: ${opportunity.id}`);
      
      return {
        success: true,
        reason: 'Sure-bet executed successfully',
        stage: 'completed',
        valueBet: valueBetResult,
        hedgeBet: hedgeBetResult,
        expectedProfit: opportunity.profit_amount
      };
      
    } catch (error) {
      logger.error('Sure-bet execution error:', error);
      await this.updateOpportunityStatus(opportunity.id, 'failed', error.message);
      
      return {
        success: false,
        reason: 'Execution error',
        stage: 'error',
        error: error.message
      };
    }
  }

  /**
   * Place value bet (leg A - positive value side)
   * @param {Object} opportunity
   * @returns {Promise<Object>}
   */
  static async placeValueBet(opportunity) {
    const pool = getPool();
    
    try {
      // Round the stake
      const roundedStake = OddsService.roundStake(opportunity.stake_a);
      
      // Create bet record
      const result = await pool.query(
        `INSERT INTO bets (
          opportunity_id, account_id, match_id, bet_type, market_type,
          pick, odds, stake, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          opportunity.id,
          opportunity.account_id_a,
          opportunity.match_id_a,
          'value',
          opportunity.market_type,
          opportunity.pick_a,
          opportunity.odds_a,
          roundedStake,
          'pending'
        ]
      );
      
      const betId = result.rows[0].id;
      
      // Queue job for worker to execute
      await this.queueBetJob({
        bet_id: betId,
        account_id: opportunity.account_id_a,
        pick: opportunity.pick_a,
        odds: opportunity.odds_a,
        stake: roundedStake,
        market_type: opportunity.market_type
      });
      
      return {
        success: true,
        bet_id: betId,
        stake: roundedStake
      };
      
    } catch (error) {
      logger.error('Value bet placement error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Place hedge bet (leg B - opposite side)
   * @param {Object} opportunity
   * @returns {Promise<Object>}
   */
  static async placeHedgeBet(opportunity) {
    const pool = getPool();
    
    try {
      // Round the stake
      const roundedStake = OddsService.roundStake(opportunity.stake_b);
      
      // Create bet record
      const result = await pool.query(
        `INSERT INTO bets (
          opportunity_id, account_id, match_id, bet_type, market_type,
          pick, odds, stake, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          opportunity.id,
          opportunity.account_id_b,
          opportunity.match_id_b,
          'hedge',
          opportunity.market_type,
          opportunity.pick_b,
          opportunity.odds_b,
          roundedStake,
          'pending'
        ]
      );
      
      const betId = result.rows[0].id;
      
      // Queue job for worker to execute
      await this.queueBetJob({
        bet_id: betId,
        account_id: opportunity.account_id_b,
        pick: opportunity.pick_b,
        odds: opportunity.odds_b,
        stake: roundedStake,
        market_type: opportunity.market_type
      });
      
      return {
        success: true,
        bet_id: betId,
        stake: roundedStake
      };
      
    } catch (error) {
      logger.error('Hedge bet placement error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Wait for bet status confirmation
   * @param {string} betId - Bet ID
   * @param {Array} acceptedStatuses - Accepted status values
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>}
   */
  static async waitForBetStatus(betId, acceptedStatuses, timeout = 30000) {
    const pool = getPool();
    const startTime = Date.now();
    const pollInterval = 1000; // Check every 1 second
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await pool.query(
          'SELECT status FROM bets WHERE id = $1',
          [betId]
        );
        
        if (result.rows.length === 0) {
          return { confirmed: false, status: 'not_found' };
        }
        
        const status = result.rows[0].status;
        
        if (acceptedStatuses.includes(status)) {
          return { confirmed: true, status };
        }
        
        if (status === 'rejected') {
          return { confirmed: false, status: 'rejected' };
        }
        
        // Still pending, wait and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        logger.error('Error checking bet status:', error);
        return { confirmed: false, status: 'error', error: error.message };
      }
    }
    
    return { confirmed: false, status: 'timeout' };
  }

  /**
   * Handle partial execution (value bet placed, hedge failed)
   * @param {Object} opportunity
   * @param {Object} valueBetResult
   */
  static async handlePartialExecution(opportunity, valueBetResult) {
    logger.critical('PARTIAL EXECUTION DETECTED!', {
      opportunity_id: opportunity.id,
      value_bet_id: valueBetResult.bet_id
    });
    
    // Log to activity logs
    await this.logActivity('error', 'betting', 
      `Partial execution: Value bet placed but hedge failed for opportunity ${opportunity.id}`,
      { opportunity_id: opportunity.id, value_bet_id: valueBetResult.bet_id }
    );
    
    // Mark opportunity as partial
    await this.updateOpportunityStatus(opportunity.id, 'failed', 'Partial execution - manual intervention required');
    
    // TODO: Send alert notification (Telegram/Email)
  }

  /**
   * Queue bet job for worker execution
   * @param {Object} betData
   */
  static async queueBetJob(betData) {
    const redis = getRedisClient();
    
    const job = {
      job_id: `bet_${betData.bet_id}_${Date.now()}`,
      type: 'place_bet',
      payload: betData,
      created_at: new Date().toISOString()
    };
    
    await redis.rpush('jobs:queue', JSON.stringify(job));
    logger.info(`Bet job queued: ${job.job_id}`);
  }

  /**
   * Update opportunity status
   */
  static async updateOpportunityStatus(opportunityId, status, message = null) {
    const pool = getPool();
    
    await pool.query(
      `UPDATE opportunities SET status = $1, 
       ${status === 'completed' ? 'completed_at = NOW(),' : ''} 
       ${status === 'executing' ? 'executed_at = NOW(),' : ''}
       updated_at = NOW()
       WHERE id = $2`,
      [status, opportunityId]
    );
    
    if (message) {
      await this.logActivity('info', 'betting', message, { opportunity_id: opportunityId });
    }
  }

  /**
   * Log bet failure
   */
  static async logBetFailure(opportunity, betType, error) {
    await this.logActivity('error', 'betting',
      `Bet placement failed: ${betType} for opportunity ${opportunity.id}`,
      { opportunity_id: opportunity.id, bet_type: betType, error }
    );
  }

  /**
   * Log activity
   */
  static async logActivity(level, category, message, metadata = {}) {
    const pool = getPool();
    
    await pool.query(
      `INSERT INTO activity_logs (level, category, message, metadata)
       VALUES ($1, $2, $3, $4)`,
      [level, category, message, JSON.stringify(metadata)]
    );
  }

  /**
   * Prioritize opportunities by tier (Tier 1 > Tier 2 > Tier 3)
   * @param {Array} opportunities - List of opportunities
   * @returns {Array} Sorted opportunities
   */
  static prioritizeByTier(opportunities) {
    return opportunities.sort((a, b) => {
      // First sort by tier (lower tier number = higher priority)
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      // Then by profit percentage (higher profit = higher priority)
      return b.profit_pct - a.profit_pct;
    });
  }
}

module.exports = ArbitrageService;
