"""
Pair Bet Executor - Implements CRITICAL bet pair sequence logic
RULE: Execute positive odds FIRST → Wait for acceptance → Then execute negative odds
"""

import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class PairBetExecutor:
    """
    Handles bet pair execution with strict sequencing:
    1. Place positive odds bet first (e.g., 1.95)
    2. Wait for acceptance/confirmation
    3. Only if accepted → place negative odds bet (e.g., 0.25)
    4. If rejected → cancel pair, don't place negative bet
    """
    
    def __init__(self, browser_context):
        self.context = browser_context
        self.max_wait_seconds = 10  # Max time to wait for bet acceptance
    
    async def execute_pair(self, positive_bet: Dict[str, Any], negative_bet: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute bet pair with CRITICAL sequencing
        
        Args:
            positive_bet: First bet (odds > 1.0) - MUST execute first
            negative_bet: Second bet (odds < 1.0) - ONLY execute if positive accepted
            
        Returns:
            Result dict with status and details
        """
        logger.info(f"Starting PAIR execution: Positive odds={positive_bet['odds']}, Negative odds={negative_bet['odds']}")
        
        # STEP 1: Validate positive odds > 1.0
        if positive_bet['odds'] <= 1.0:
            logger.error(f"PAIR REJECTED: Positive bet odds {positive_bet['odds']} <= 1.0")
            return {
                'success': False,
                'error': 'Positive bet must have odds > 1.0',
                'positive_status': 'rejected',
                'negative_status': 'cancelled',
                'reason': 'Invalid positive odds'
            }
        
        # STEP 2: Execute POSITIVE odds bet FIRST
        logger.info(f"PAIR STEP 1: Executing POSITIVE bet (odds={positive_bet['odds']}, stake={positive_bet['stake']})")
        positive_result = await self._execute_bet(positive_bet)
        
        # STEP 3: Check if positive bet was ACCEPTED
        if not positive_result['accepted']:
            logger.warning(f"PAIR CANCELLED: Positive bet REJECTED - {positive_result.get('error', 'Unknown error')}")
            return {
                'success': False,
                'error': 'Positive bet rejected, pair cancelled',
                'positive_status': 'rejected',
                'negative_status': 'cancelled',
                'positive_details': positive_result,
                'reason': 'Positive bet not accepted'
            }
        
        logger.info(f"PAIR STEP 2: Positive bet ACCEPTED ✓ - Now executing NEGATIVE bet")
        
        # STEP 4: Positive ACCEPTED → Execute NEGATIVE odds bet
        logger.info(f"PAIR STEP 3: Executing NEGATIVE bet (odds={negative_bet['odds']}, stake={negative_bet['stake']})")
        negative_result = await self._execute_bet(negative_bet)
        
        # STEP 5: Return pair execution result
        both_accepted = positive_result['accepted'] and negative_result['accepted']
        
        result = {
            'success': both_accepted,
            'positive_status': 'accepted' if positive_result['accepted'] else 'rejected',
            'negative_status': 'accepted' if negative_result['accepted'] else 'rejected',
            'positive_details': positive_result,
            'negative_details': negative_result,
            'sequence_followed': True,  # Confirms positive was executed first
            'message': 'Both bets accepted' if both_accepted else 'Negative bet failed after positive accepted'
        }
        
        logger.info(f"PAIR COMPLETE: Positive={result['positive_status']}, Negative={result['negative_status']}")
        return result
    
    async def _execute_bet(self, bet: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a single bet and wait for acceptance
        
        Args:
            bet: Bet details (odds, stake, market_type, etc.)
            
        Returns:
            Result with 'accepted' status
        """
        try:
            # Round stake to nearest 0 or 5
            rounded_stake = round(bet['stake'] / 5) * 5
            
            logger.info(f"Executing bet: odds={bet['odds']}, stake={rounded_stake}, market={bet.get('market_type')}")
            
            # TODO: Replace with actual Playwright bet placement
            # For now, simulate bet execution
            page = self.context.new_page()
            
            # Simulate navigation to bet slip
            # await page.goto(bet['url'])
            # await page.fill('#stake-input', str(rounded_stake))
            # await page.click('#place-bet-button')
            
            # Wait for bet confirmation (CRITICAL for pair sequence)
            logger.info(f"Waiting up to {self.max_wait_seconds}s for bet acceptance...")
            
            # Simulate waiting for acceptance
            time.sleep(2)  # TODO: Replace with actual wait for bet confirmation element
            
            # TODO: Check actual bet status from sportsbook UI
            # For now, simulate 90% acceptance rate for positive odds
            accepted = bet['odds'] > 1.0  # Simulate: positive odds usually accepted
            
            if accepted:
                logger.info(f"✓ Bet ACCEPTED: odds={bet['odds']}, stake={rounded_stake}")
            else:
                logger.warning(f"✗ Bet REJECTED: odds={bet['odds']}, stake={rounded_stake}")
            
            page.close()
            
            return {
                'accepted': accepted,
                'odds': bet['odds'],
                'stake': rounded_stake,
                'bet_id': bet.get('bet_id'),
                'timestamp': time.time()
            }
            
        except Exception as e:
            logger.error(f"Bet execution error: {e}", exc_info=True)
            return {
                'accepted': False,
                'error': str(e),
                'odds': bet['odds'],
                'stake': bet['stake']
            }


def create_pair_executor(browser_context):
    """Factory function to create PairBetExecutor instance"""
    return PairBetExecutor(browser_context)
