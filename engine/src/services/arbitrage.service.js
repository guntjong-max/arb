const logger = require('../config/logger');
const { getPool } = require('../config/database');

class ArbitrageService {
  convertIndoToDecimal(oddsIndo) {
    if (oddsIndo >= 0) {
      return 1 + (oddsIndo / 100);
    } else {
      return 1 + (100 / Math.abs(oddsIndo));
    }
  }

  convertMalayToDecimal(oddsMalay) {
    if (oddsMalay > 0) {
      return 1 + oddsMalay;
    } else {
      return 1 + (1 / Math.abs(oddsMalay));
    }
  }

  convertToDecimal(odds, oddsType = 'indo') {
    if (typeof odds === 'number') {
      if (odds >= 1.01) {
        return odds;
      }
      
      if (oddsType === 'indo' || oddsType === 'indonesian') {
        return this.convertIndoToDecimal(odds);
      } else if (oddsType === 'malay' || oddsType === 'malaysian') {
        return this.convertMalayToDecimal(odds);
      }
    }
    
    throw new Error(`Invalid odds format: ${odds} (type: ${oddsType})`);
  }

  calculateProfitMargin(oddsADecimal, oddsBDecimal) {
    const impliedProbA = 1 / oddsADecimal;
    const impliedProbB = 1 / oddsBDecimal;
    const totalImpliedProb = impliedProbA + impliedProbB;
    
    const profitMargin = ((1 - totalImpliedProb) / totalImpliedProb) * 100;
    
    return parseFloat(profitMargin.toFixed(4));
  }

  calculateArb(oddsA, oddsB, oddsTypeA = 'indo', oddsTypeB = 'indo') {
    try {
      const oddsADecimal = this.convertToDecimal(oddsA, oddsTypeA);
      const oddsBDecimal = this.convertToDecimal(oddsB, oddsTypeB);
      
      logger.info(`Converting odds: A=${oddsA} (${oddsTypeA}) -> ${oddsADecimal}, B=${oddsB} (${oddsTypeB}) -> ${oddsBDecimal}`);
      
      const profitMargin = this.calculateProfitMargin(oddsADecimal, oddsBDecimal);
      
      const impliedProbA = 1 / oddsADecimal;
      const impliedProbB = 1 / oddsBDecimal;
      
      const stakeA = impliedProbA / (impliedProbA + impliedProbB);
      const stakeB = impliedProbB / (impliedProbA + impliedProbB);
      
      return {
        oddsADecimal: parseFloat(oddsADecimal.toFixed(4)),
        oddsBDecimal: parseFloat(oddsBDecimal.toFixed(4)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        stakeDistribution: {
          teamA: parseFloat((stakeA * 100).toFixed(2)),
          teamB: parseFloat((stakeB * 100).toFixed(2))
        },
        isArbitrage: profitMargin > 0,
        recommended: profitMargin >= 3 && profitMargin <= 10
      };
    } catch (error) {
      logger.error('Error calculating arbitrage:', error);
      throw error;
    }
  }

  shouldIgnoreOpportunity(opportunity) {
    const { profitMargin, match_time, status } = opportunity;
    
    if (profitMargin < 3 || profitMargin > 10) {
      logger.info(`Ignoring opportunity: profit margin ${profitMargin}% outside 3-10% range`);
      return true;
    }
    
    if (match_time > 35 && match_time <= 45) {
      logger.info(`Ignoring opportunity: match in HT period (${match_time} min)`);
      return true;
    }
    
    if (match_time > 85) {
      logger.info(`Ignoring opportunity: match near end (${match_time} min)`);
      return true;
    }
    
    if (status && status !== 'pending') {
      logger.info(`Ignoring opportunity: status is ${status}`);
      return true;
    }
    
    return false;
  }

  async saveOpportunity(opportunityData) {
    const pool = getPool();
    
    const {
      match_id,
      sport,
      league,
      home_team,
      away_team,
      match_time,
      bookmaker_a,
      bookmaker_b,
      odds_a,
      odds_b,
      odds_a_decimal,
      odds_b_decimal,
      profit_margin,
      bet_type
    } = opportunityData;
    
    const result = await pool.query(`
      INSERT INTO arbitrage_opportunities (
        match_id, sport, league, home_team, away_team, match_time,
        bookmaker_a, bookmaker_b, odds_a, odds_b,
        odds_a_decimal, odds_b_decimal, profit_margin, bet_type, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
      RETURNING id
    `, [
      match_id, sport, league, home_team, away_team, match_time,
      bookmaker_a, bookmaker_b, odds_a, odds_b,
      odds_a_decimal, odds_b_decimal, profit_margin, bet_type
    ]);
    
    const opportunityId = result.rows[0].id;
    logger.info(`Saved arbitrage opportunity ${opportunityId} with ${profit_margin}% profit`);
    
    return opportunityId;
  }

  async getActiveOpportunities(filters = {}) {
    const pool = getPool();
    
    let query = `
      SELECT * FROM arbitrage_opportunities
      WHERE status = 'pending'
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.minProfit) {
      query += ` AND profit_margin >= $${paramCount}`;
      params.push(filters.minProfit);
      paramCount++;
    }
    
    if (filters.maxProfit) {
      query += ` AND profit_margin <= $${paramCount}`;
      params.push(filters.maxProfit);
      paramCount++;
    }
    
    if (filters.sport) {
      query += ` AND sport = $${paramCount}`;
      params.push(filters.sport);
      paramCount++;
    }
    
    query += ` ORDER BY profit_margin DESC, created_at DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  async updateOpportunityStatus(opportunityId, status) {
    const pool = getPool();
    
    await pool.query(
      'UPDATE arbitrage_opportunities SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, opportunityId]
    );
    
    logger.info(`Updated opportunity ${opportunityId} status to ${status}`);
  }

  calculateOptimalStakes(totalBankroll, oddsADecimal, oddsBDecimal) {
    const impliedProbA = 1 / oddsADecimal;
    const impliedProbB = 1 / oddsBDecimal;
    const totalImpliedProb = impliedProbA + impliedProbB;
    
    const stakeA = totalBankroll * (impliedProbA / totalImpliedProb);
    const stakeB = totalBankroll * (impliedProbB / totalImpliedProb);
    
    const potentialReturnA = stakeA * oddsADecimal;
    const potentialReturnB = stakeB * oddsBDecimal;
    
    const profit = Math.min(potentialReturnA, potentialReturnB) - totalBankroll;
    const actualProfitMargin = (profit / totalBankroll) * 100;
    
    return {
      stakeA: parseFloat(stakeA.toFixed(2)),
      stakeB: parseFloat(stakeB.toFixed(2)),
      potentialReturnA: parseFloat(potentialReturnA.toFixed(2)),
      potentialReturnB: parseFloat(potentialReturnB.toFixed(2)),
      guaranteedProfit: parseFloat(profit.toFixed(2)),
      actualProfitMargin: parseFloat(actualProfitMargin.toFixed(2))
    };
  }

  async analyzeOpportunity(opportunityId) {
    const pool = getPool();
    
    const result = await pool.query(
      'SELECT * FROM arbitrage_opportunities WHERE id = $1',
      [opportunityId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Opportunity ${opportunityId} not found`);
    }
    
    const opportunity = result.rows[0];
    
    const shouldIgnore = this.shouldIgnoreOpportunity(opportunity);
    
    const stakes = this.calculateOptimalStakes(
      1000,
      opportunity.odds_a_decimal,
      opportunity.odds_b_decimal
    );
    
    return {
      opportunity,
      shouldIgnore,
      reason: shouldIgnore ? this.getIgnoreReason(opportunity) : null,
      optimalStakes: stakes,
      recommended: !shouldIgnore && opportunity.profit_margin >= 3 && opportunity.profit_margin <= 10
    };
  }

  getIgnoreReason(opportunity) {
    if (opportunity.profit_margin < 3) {
      return 'Profit margin too low (< 3%)';
    }
    if (opportunity.profit_margin > 10) {
      return 'Profit margin too high (> 10%) - likely odds error';
    }
    if (opportunity.match_time > 35 && opportunity.match_time <= 45) {
      return 'Match in halftime period';
    }
    if (opportunity.match_time > 85) {
      return 'Match near end (> 85 min)';
    }
    return 'Unknown reason';
  }
}

module.exports = new ArbitrageService();
