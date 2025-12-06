const arbitrageService = require('../services/arbitrage.service');
const bettingService = require('../services/betting.service');

async function testArbitrageService() {
  console.log('=== Testing Arbitrage Service ===\n');
  
  console.log('1. Testing Indonesian Odds Conversion:');
  const indoPositive = arbitrageService.convertIndoToDecimal(100);
  const indoNegative = arbitrageService.convertIndoToDecimal(-150);
  console.log(`  Indo +100 → Decimal ${indoPositive}`);
  console.log(`  Indo -150 → Decimal ${indoNegative}`);
  
  console.log('\n2. Testing Malaysian Odds Conversion:');
  const malayPositive = arbitrageService.convertMalayToDecimal(0.5);
  const malayNegative = arbitrageService.convertMalayToDecimal(-0.75);
  console.log(`  Malay +0.5 → Decimal ${malayPositive}`);
  console.log(`  Malay -0.75 → Decimal ${malayNegative}`);
  
  console.log('\n3. Testing Arbitrage Calculation:');
  const arbResult = arbitrageService.calculateArb(-110, 110, 'indo', 'indo');
  console.log(`  Odds: -110 vs +110`);
  console.log(`  Decimal: ${arbResult.oddsADecimal} vs ${arbResult.oddsBDecimal}`);
  console.log(`  Profit Margin: ${arbResult.profitMargin}%`);
  console.log(`  Stake Distribution: ${arbResult.stakeDistribution.teamA}% / ${arbResult.stakeDistribution.teamB}%`);
  console.log(`  Is Arbitrage: ${arbResult.isArbitrage}`);
  console.log(`  Recommended: ${arbResult.recommended}`);
  
  console.log('\n4. Testing Filter Logic:');
  const opportunity1 = { profitMargin: 2.5, match_time: 20 };
  const opportunity2 = { profitMargin: 5.0, match_time: 40 };
  const opportunity3 = { profitMargin: 4.5, match_time: 86 };
  console.log(`  Profit 2.5%, Time 20min: Ignore = ${arbitrageService.shouldIgnoreOpportunity(opportunity1)}`);
  console.log(`  Profit 5.0%, Time 40min: Ignore = ${arbitrageService.shouldIgnoreOpportunity(opportunity2)}`);
  console.log(`  Profit 4.5%, Time 86min: Ignore = ${arbitrageService.shouldIgnoreOpportunity(opportunity3)}`);
  
  console.log('\n5. Testing Optimal Stakes:');
  const stakes = arbitrageService.calculateOptimalStakes(1000, 1.91, 2.10);
  console.log(`  Bankroll: 1000`);
  console.log(`  Stake A: ${stakes.stakeA}`);
  console.log(`  Stake B: ${stakes.stakeB}`);
  console.log(`  Guaranteed Profit: ${stakes.guaranteedProfit}`);
  console.log(`  Actual Profit %: ${stakes.actualProfitMargin}%`);
}

async function testBettingService() {
  console.log('\n\n=== Testing Betting Service ===\n');
  
  console.log('1. Testing Smart Rounding:');
  const testAmounts = [153, 147, 3, 12, 98, 101, 1];
  testAmounts.forEach(amount => {
    const rounded = bettingService.smartRound(amount);
    console.log(`  ${amount} → ${rounded}`);
  });
  
  console.log('\n2. Smart Round Edge Cases:');
  console.log(`  Negative (should error): Testing -10...`);
  try {
    bettingService.smartRound(-10);
  } catch (error) {
    console.log(`  ✓ Error caught: ${error.message}`);
  }
  
  console.log(`  Zero (should error): Testing 0...`);
  try {
    bettingService.smartRound(0);
  } catch (error) {
    console.log(`  ✓ Error caught: ${error.message}`);
  }
}

async function runTests() {
  try {
    await testArbitrageService();
    await testBettingService();
    
    console.log('\n\n=== ALL TESTS COMPLETED ===\n');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { testArbitrageService, testBettingService };
