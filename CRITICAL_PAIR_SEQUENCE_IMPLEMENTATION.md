# ⚠️ CRITICAL BET PAIR SEQUENCE - IMPLEMENTATION COMPLETE

## 🎯 MANDATORY RULE IMPLEMENTED

**Bet Pair Execution Sequence (STRICTLY ENFORCED):**

```
1. Place POSITIVE odds bet FIRST (e.g., odds = 1.95)
2. WAIT for acceptance/confirmation from sportsbook  
3. ONLY if positive bet ACCEPTED → Place NEGATIVE odds bet (e.g., odds = 0.25)
4. IF positive bet REJECTED → CANCEL entire pair, DON'T place negative bet
```

---

## ✅ IMPLEMENTATION DETAILS

### **Backend API (`/api/execute` endpoint)**

**File:** `engine/src/routes/api.routes.js`

**Changes Made:**

1. **Odds Validation** ✅
   - Rejects bets with odds ≤ 1.0
   - Only positive odds (> 1.0) allowed

2. **Pair Bet Support** ✅
   ```javascript
   POST /api/execute
   {
     "accountId": 1,
     "matchName": "Team A vs Team B",
     "marketType": "FT_HDP",
     "odds": 1.95,         // POSITIVE odds - executed FIRST
     "stake": 100,
     "pairBet": {          // NEGATIVE odds - executed SECOND (only if positive accepted)
       "odds": 0.25,
       "stake": 780,
       "marketType": "FT_HDP"
     }
   }
   ```

3. **Sequence Metadata** ✅
   - `sequence: 'positive_first'` - Marks first bet
   - `sequence: 'negative_second'` - Marks second bet
   - `dependsOn: betId` - Links second bet to first

4. **Stake Rounding** ✅
   - Rounds to nearest 0 or 5
   - Applied to both positive and negative bets

---

### **Worker Pair Executor**

**File:** `worker/handlers/pair_executor.py`

**Class:** `PairBetExecutor`

**Key Methods:**

1. **`execute_pair(positive_bet, negative_bet)`** ✅
   ```python
   # STEP 1: Validate positive odds > 1.0
   if positive_bet['odds'] <= 1.0:
       return {'success': False, 'error': 'Invalid positive odds'}
   
   # STEP 2: Execute POSITIVE bet FIRST
   positive_result = await self._execute_bet(positive_bet)
   
   # STEP 3: Check acceptance
   if not positive_result['accepted']:
       return {'positive_status': 'rejected', 'negative_status': 'cancelled'}
   
   # STEP 4: ONLY if positive accepted → Execute negative
   negative_result = await self._execute_bet(negative_bet)
   ```

2. **`_execute_bet(bet)`** ✅
   - Places bet via Playwright
   - Waits up to 10 seconds for confirmation
   - Returns acceptance status

---

## 🔒 SAFETY CHECKS IMPLEMENTED

### ✅ **Check 1: Positive Odds Validation**
```javascript
if (parseFloat(odds) <= 1.0) {
  return res.status(400).json({
    success: false,
    error: 'Only positive odds (> 1.0) are allowed'
  });
}
```

### ✅ **Check 2: Sequence Enforcement**
```python
# Positive bet MUST be executed first
positive_result = await self._execute_bet(positive_bet)

# Negative bet ONLY executed if positive accepted
if not positive_result['accepted']:
    logger.warning("PAIR CANCELLED: Positive bet REJECTED")
    return {'negative_status': 'cancelled'}
```

### ✅ **Check 3: Stake Rounding**
```javascript
const roundedStake = Math.round(stake / 5) * 5;
```

### ✅ **Check 4: Pair Cancellation**
```python
if not positive_result['accepted']:
    return {
        'positive_status': 'rejected',
        'negative_status': 'cancelled',  # Never executed
        'reason': 'Positive bet not accepted'
    }
```

---

## 📊 EXECUTION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    BET PAIR SEQUENCE                         │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  API Request │
  │  /api/execute│
  └──────┬───────┘
         │
         ▼
  ┌──────────────────┐
  │ Validate: Odds>1 │ ──── REJECT if odds ≤ 1.0
  └──────┬───────────┘
         │ ✓ Valid
         ▼
  ┌──────────────────────────┐
  │ Create Bet Record (DB)   │
  │ - Positive bet (pending) │
  └──────┬───────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │ Queue to Worker              │
  │ - sequence: positive_first   │
  │ - pairBet: (if applicable)   │
  └──────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│          WORKER EXECUTION          │
└────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────┐
  │ STEP 1: Execute POSITIVE │
  │ (odds = 1.95)            │
  └──────┬───────────────────┘
         │
         ▼
  ┌──────────────────────────┐
  │ STEP 2: Wait for         │
  │ Acceptance (max 10s)     │
  └──────┬───────────────────┘
         │
         ├─────────► REJECTED ──┐
         │                      │
         │ ACCEPTED             ▼
         ▼              ┌────────────────┐
  ┌──────────────────┐ │ Cancel NEGATIVE│
  │ STEP 3: Execute  │ │ Don't place    │
  │ NEGATIVE         │ └────────────────┘
  │ (odds = 0.25)    │
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ BOTH COMPLETED   │
  │ Return Results   │
  └──────────────────┘
```

---

## 🧪 TESTING EXAMPLES

### **Test 1: Single Positive Bet**
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 1,
    "matchName": "Real Madrid vs Barcelona",
    "marketType": "FT_HDP",
    "odds": 1.95,
    "stake": 100
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Single bet queued",
  "betId": 123,
  "stake": 100,
  "sequence": "positive_first"
}
```

### **Test 2: Bet Pair (Positive + Negative)**
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 1,
    "matchName": "Real Madrid vs Barcelona",
    "marketType": "FT_HDP",
    "odds": 1.95,
    "stake": 100,
    "pairBet": {
      "odds": 0.25,
      "stake": 780,
      "marketType": "FT_HDP"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Bet pair queued (positive first, negative waits)",
  "betId": 124,
  "stake": 100,
  "sequence": "positive_first",
  "pairSequence": "Negative bet will execute ONLY after positive is ACCEPTED"
}
```

### **Test 3: Reject Invalid Odds (≤ 1.0)**
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 1,
    "matchName": "Test Match",
    "marketType": "FT_HDP",
    "odds": 0.85,
    "stake": 100
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Only positive odds (> 1.0) are allowed"
}
```

---

## 📝 LOGGING OUTPUT

### **Successful Pair Execution**
```
[INFO] Bet queued with pair sequence: betId=124, odds=1.95, isPair=true, sequence=positive_first
[INFO] Starting PAIR execution: Positive odds=1.95, Negative odds=0.25
[INFO] PAIR STEP 1: Executing POSITIVE bet (odds=1.95, stake=100)
[INFO] Executing bet: odds=1.95, stake=100, market=FT_HDP
[INFO] Waiting up to 10s for bet acceptance...
[INFO] ✓ Bet ACCEPTED: odds=1.95, stake=100
[INFO] PAIR STEP 2: Positive bet ACCEPTED ✓ - Now executing NEGATIVE bet
[INFO] PAIR STEP 3: Executing NEGATIVE bet (odds=0.25, stake=780)
[INFO] Executing bet: odds=0.25, stake=780, market=FT_HDP
[INFO] ✓ Bet ACCEPTED: odds=0.25, stake=780
[INFO] PAIR COMPLETE: Positive=accepted, Negative=accepted
```

### **Pair Cancelled (Positive Rejected)**
```
[INFO] Starting PAIR execution: Positive odds=1.95, Negative odds=0.25
[INFO] PAIR STEP 1: Executing POSITIVE bet (odds=1.95, stake=100)
[WARN] ✗ Bet REJECTED: odds=1.95, stake=100
[WARN] PAIR CANCELLED: Positive bet REJECTED - Sportsbook rejected
[INFO] PAIR COMPLETE: Positive=rejected, Negative=cancelled
```

---

## ✅ VERIFICATION CHECKLIST

- [x] Positive odds validation (> 1.0)
- [x] Pair sequence: positive first, negative second
- [x] Wait for positive acceptance before negative
- [x] Cancel negative if positive rejected
- [x] Stake rounding to 0 or 5
- [x] Pair metadata stored in database
- [x] Comprehensive logging
- [x] Error handling for rejections
- [x] Worker implements PairBetExecutor class
- [x] API endpoint supports pairBet parameter

---

## 🎯 STATUS: ✅ COMPLETE

**All critical bet pair sequence requirements implemented and tested.**

The system now strictly enforces:
1. ✅ Positive odds bet executed FIRST
2. ✅ Wait for acceptance confirmation
3. ✅ Negative bet ONLY if positive accepted
4. ✅ Pair cancelled if positive rejected

**Ready for deployment to ~/sportsbook-minimal**
