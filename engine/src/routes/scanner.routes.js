const express = require('express');
const router = express.Router();
const arbitrageService = require('../services/arbitrage.service');
const bettingService = require('../services/betting.service');
const logger = require('../config/logger');

router.post('/scan', async (req, res) => {
  try {
    const oddsData = req.body;
    
    if (!oddsData.oddsA || !oddsData.oddsB) {
      return res.status(400).json({
        success: false,
        error: 'oddsA and oddsB are required'
      });
    }
    
    const arbResult = arbitrageService.calculateArb(
      oddsData.oddsA,
      oddsData.oddsB,
      oddsData.oddsTypeA || 'indo',
      oddsData.oddsTypeB || 'indo'
    );
    
    if (arbResult.recommended) {
      const opportunityData = {
        match_id: oddsData.match_id || `match_${Date.now()}`,
        sport: oddsData.sport || 'soccer',
        league: oddsData.league || 'Unknown',
        home_team: oddsData.home_team || 'Team A',
        away_team: oddsData.away_team || 'Team B',
        match_time: oddsData.match_time || 0,
        bookmaker_a: oddsData.bookmaker_a || 'nova88',
        bookmaker_b: oddsData.bookmaker_b || 'qq188',
        odds_a: oddsData.oddsA,
        odds_b: oddsData.oddsB,
        odds_a_decimal: arbResult.oddsADecimal,
        odds_b_decimal: arbResult.oddsBDecimal,
        profit_margin: arbResult.profitMargin,
        bet_type: oddsData.bet_type || '1x2'
      };
      
      const opportunityId = await arbitrageService.saveOpportunity(opportunityData);
      
      return res.status(200).json({
        success: true,
        arbitrage: arbResult,
        opportunityId,
        saved: true
      });
    } else {
      return res.status(200).json({
        success: true,
        arbitrage: arbResult,
        saved: false,
        reason: arbResult.profitMargin < 3 ? 'Profit too low' : 'Profit too high (likely error)'
      });
    }
  } catch (error) {
    logger.error('Scan error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process scan',
      message: error.message
    });
  }
});

router.get('/opportunities', async (req, res) => {
  try {
    const filters = {
      minProfit: req.query.minProfit ? parseFloat(req.query.minProfit) : 3,
      maxProfit: req.query.maxProfit ? parseFloat(req.query.maxProfit) : 10,
      sport: req.query.sport
    };
    
    const opportunities = await arbitrageService.getActiveOpportunities(filters);
    
    return res.status(200).json({
      success: true,
      count: opportunities.length,
      opportunities
    });
  } catch (error) {
    logger.error('Error fetching opportunities:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities',
      message: error.message
    });
  }
});

router.get('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await arbitrageService.analyzeOpportunity(id);
    
    return res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    logger.error('Error analyzing opportunity:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze opportunity',
      message: error.message
    });
  }
});

router.post('/opportunities/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { bankroll, sessions } = req.body;
    
    if (!bankroll || !sessions || !sessions.bookmakerA || !sessions.bookmakerB) {
      return res.status(400).json({
        success: false,
        error: 'bankroll and sessions (bookmakerA, bookmakerB) are required'
      });
    }
    
    const analysis = await arbitrageService.analyzeOpportunity(id);
    
    if (analysis.shouldIgnore) {
      return res.status(400).json({
        success: false,
        error: 'Opportunity should not be executed',
        reason: analysis.reason
      });
    }
    
    const stakes = arbitrageService.calculateOptimalStakes(
      bankroll,
      analysis.opportunity.odds_a_decimal,
      analysis.opportunity.odds_b_decimal
    );
    
    const leg1Data = {
      bookmaker: analysis.opportunity.bookmaker_a,
      username: sessions.bookmakerA.username,
      match_id: analysis.opportunity.match_id,
      sport: analysis.opportunity.sport,
      team: analysis.opportunity.home_team,
      bet_type: analysis.opportunity.bet_type,
      odds: analysis.opportunity.odds_a,
      odds_decimal: analysis.opportunity.odds_a_decimal,
      stake: stakes.stakeA
    };
    
    const leg2Data = {
      bookmaker: analysis.opportunity.bookmaker_b,
      username: sessions.bookmakerB.username,
      match_id: analysis.opportunity.match_id,
      sport: analysis.opportunity.sport,
      team: analysis.opportunity.away_team,
      bet_type: analysis.opportunity.bet_type,
      odds: analysis.opportunity.odds_b,
      odds_decimal: analysis.opportunity.odds_b_decimal,
      stake: stakes.stakeB
    };
    
    const result = await bettingService.executeSequentialBets(id, leg1Data, leg2Data);
    
    return res.status(200).json({
      success: result.success,
      execution: result,
      stakes
    });
  } catch (error) {
    logger.error('Error executing opportunity:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute opportunity',
      message: error.message
    });
  }
});

router.get('/bets', async (req, res) => {
  try {
    const filters = {
      opportunityId: req.query.opportunityId,
      bookmaker: req.query.bookmaker,
      status: req.query.status
    };
    
    const bets = await bettingService.getBetHistory(filters);
    
    return res.status(200).json({
      success: true,
      count: bets.length,
      bets
    });
  } catch (error) {
    logger.error('Error fetching bets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bets',
      message: error.message
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await bettingService.getBetStats();
    
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

module.exports = router;
