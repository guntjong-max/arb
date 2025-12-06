// src/services/odds.service.js - Odds conversion and calculation utilities
const logger = require('../config/logger');

/**
 * Convert various odds formats to Decimal (European) odds
 */
class OddsService {
  /**
   * Convert Indonesian odds to Decimal
   * @param {number} indoOdds - Indonesian odds (e.g., -1.25, 0.85)
   * @returns {number} Decimal odds
   */
  static indonesianToDecimal(indoOdds) {
    if (indoOdds >= 0) {
      // Positive Indo odds
      return 1 + indoOdds;
    } else {
      // Negative Indo odds
      return 1 + (1 / Math.abs(indoOdds));
    }
  }

  /**
   * Convert Malay odds to Decimal
   * @param {number} malayOdds - Malay odds (e.g., -0.80, 0.75)
   * @returns {number} Decimal odds
   */
  static malayToDecimal(malayOdds) {
    if (malayOdds >= 0) {
      // Positive Malay odds
      return 1 + malayOdds;
    } else {
      // Negative Malay odds
      return 1 - (1 / malayOdds);
    }
  }

  /**
   * Convert Hong Kong odds to Decimal
   * @param {number} hkOdds - Hong Kong odds (e.g., 0.85)
   * @returns {number} Decimal odds
   */
  static hongKongToDecimal(hkOdds) {
    return 1 + hkOdds;
  }

  /**
   * Convert American odds to Decimal
   * @param {number} americanOdds - American odds (e.g., -150, +200)
   * @returns {number} Decimal odds
   */
  static americanToDecimal(americanOdds) {
    if (americanOdds > 0) {
      return 1 + (americanOdds / 100);
    } else {
      return 1 + (100 / Math.abs(americanOdds));
    }
  }

  /**
   * Auto-detect and convert odds to Decimal format
   * @param {number} odds - Odds value
   * @param {string} format - Format: 'decimal', 'indo', 'malay', 'hk', 'american'
   * @returns {number} Decimal odds
   */
  static toDecimal(odds, format = 'decimal') {
    const oddsNum = parseFloat(odds);
    
    if (isNaN(oddsNum)) {
      logger.error(`Invalid odds value: ${odds}`);
      throw new Error('Invalid odds value');
    }

    switch (format.toLowerCase()) {
      case 'decimal':
      case 'euro':
        return oddsNum;
      
      case 'indo':
      case 'indonesian':
        return this.indonesianToDecimal(oddsNum);
      
      case 'malay':
      case 'malaysian':
        return this.malayToDecimal(oddsNum);
      
      case 'hk':
      case 'hongkong':
        return this.hongKongToDecimal(oddsNum);
      
      case 'american':
      case 'us':
        return this.americanToDecimal(oddsNum);
      
      default:
        logger.warn(`Unknown odds format: ${format}, treating as decimal`);
        return oddsNum;
    }
  }

  /**
   * Calculate implied probability from decimal odds
   * @param {number} decimalOdds - Decimal odds
   * @returns {number} Probability (0-1)
   */
  static getImpliedProbability(decimalOdds) {
    return 1 / decimalOdds;
  }

  /**
   * Calculate arbitrage profit percentage
   * @param {number} oddsA - Decimal odds for side A
   * @param {number} oddsB - Decimal odds for side B
   * @returns {number} Profit percentage (e.g., 3.5 for 3.5% profit)
   */
  static calculateArbitrageProfit(oddsA, oddsB) {
    const probA = this.getImpliedProbability(oddsA);
    const probB = this.getImpliedProbability(oddsB);
    const totalProb = probA + probB;
    
    if (totalProb >= 1) {
      return 0; // No arbitrage opportunity
    }
    
    const profitPct = ((1 / totalProb) - 1) * 100;
    return parseFloat(profitPct.toFixed(2));
  }

  /**
   * Calculate optimal stakes for arbitrage
   * @param {number} oddsA - Decimal odds for side A
   * @param {number} oddsB - Decimal odds for side B
   * @param {number} totalStake - Total amount to stake
   * @returns {Object} { stakeA, stakeB, profit }
   */
  static calculateStakes(oddsA, oddsB, totalStake) {
    const probA = this.getImpliedProbability(oddsA);
    const probB = this.getImpliedProbability(oddsB);
    const totalProb = probA + probB;
    
    if (totalProb >= 1) {
      throw new Error('No arbitrage opportunity exists');
    }
    
    // Calculate optimal stakes
    const stakeA = (totalStake * probA) / totalProb;
    const stakeB = (totalStake * probB) / totalProb;
    
    // Calculate guaranteed profit
    const returnA = stakeA * oddsA;
    const returnB = stakeB * oddsB;
    const profit = Math.min(returnA, returnB) - totalStake;
    
    return {
      stakeA: parseFloat(stakeA.toFixed(2)),
      stakeB: parseFloat(stakeB.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      profitPct: parseFloat(((profit / totalStake) * 100).toFixed(2))
    };
  }

  /**
   * Round stake to nearest 0 or 5 (e.g., 153 -> 155, 152 -> 150)
   * IMPORTANT: Indonesian bookmakers reject "keriting" amounts
   * @param {number} amount - Amount to round
   * @returns {number} Rounded amount
   */
  static roundStake(amount) {
    const lastDigit = amount % 10;
    
    if (lastDigit === 0 || lastDigit === 5) {
      return amount; // Already rounded
    }
    
    // Round to nearest 0 or 5
    if (lastDigit < 3) {
      return Math.floor(amount / 5) * 5; // Round down to 0
    } else if (lastDigit < 8) {
      return Math.floor(amount / 5) * 5 + 5; // Round up to 5
    } else {
      return Math.ceil(amount / 10) * 10; // Round up to next 0
    }
  }

  /**
   * Validate if opportunity passes safety filters
   * @param {Object} opportunity - Opportunity object
   * @param {Object} config - System configuration
   * @returns {Object} { valid: boolean, reason: string }
   */
  static validateOpportunity(opportunity, config) {
    const { profit_pct, match } = opportunity;
    
    // Check profit range (anti-trap)
    if (profit_pct > config.max_profit_pct) {
      return {
        valid: false,
        reason: `Profit too high (${profit_pct}% > ${config.max_profit_pct}%) - Possible trap`
      };
    }
    
    if (profit_pct < config.min_profit_pct) {
      return {
        valid: false,
        reason: `Profit too low (${profit_pct}% < ${config.min_profit_pct}%)`
      };
    }
    
    // Check time filter (anti-ghost bet)
    if (match && match.match_type === 'live') {
      const currentMinute = match.current_minute || 0;
      const isFirstHalf = currentMinute <= 45;
      
      if (isFirstHalf && currentMinute > config.max_minute_ht) {
        return {
          valid: false,
          reason: `Match time too late in HT (${currentMinute}' > ${config.max_minute_ht}')`
        };
      }
      
      if (!isFirstHalf && currentMinute > config.max_minute_ft) {
        return {
          valid: false,
          reason: `Match time too late in FT (${currentMinute}' > ${config.max_minute_ft}')`
        };
      }
    }
    
    return { valid: true, reason: 'OK' };
  }

  /**
   * Calculate stakes with tier limits and rounding
   * @param {number} oddsA - Decimal odds for side A
   * @param {number} oddsB - Decimal odds for side B
   * @param {number} maxBet - Maximum bet for this tier
   * @returns {Object} { stakeA, stakeB, profit, profitPct }
   */
  static calculateRoundedStakes(oddsA, oddsB, maxBet) {
    // First calculate optimal stakes
    const optimal = this.calculateStakes(oddsA, oddsB, maxBet);
    
    // Round both stakes
    const stakeA = this.roundStake(optimal.stakeA);
    const stakeB = this.roundStake(optimal.stakeB);
    const totalStake = stakeA + stakeB;
    
    // Recalculate profit with rounded stakes
    const returnA = stakeA * oddsA;
    const returnB = stakeB * oddsB;
    const profit = Math.min(returnA, returnB) - totalStake;
    const profitPct = (profit / totalStake) * 100;
    
    return {
      stakeA,
      stakeB,
      profit: parseFloat(profit.toFixed(2)),
      profitPct: parseFloat(profitPct.toFixed(2))
    };
  }
}

module.exports = OddsService;
