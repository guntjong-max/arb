# QQ188 Login Logic - Playwright Implementation

## Summary

Successfully ported QQ188 login logic from Puppeteer/JavaScript to Python/Playwright.

## What Was Implemented

### 1. Added Login Handler (`_handle_login`)
- Routes login requests to appropriate bookmaker-specific handlers
- Supports multiple bookmakers: QQ188, Bet365, Pinnacle, Betfair
- Fallback to QQ188 logic for unknown bookmakers
- Returns structured response with balance and status

### 2. QQ188 Login Logic (`_login_qq188`)
Proven logic ported from Puppeteer:

**Step 1:** Find and click LOGIN/MASUK button
```javascript
page.evaluate() - searches for button with text "LOGIN" or "MASUK" (case-insensitive)
```

**Step 2:** Wait and input credentials
- Wait 3 seconds for login form
- Find `input[type="text"]` and fill username
- Find `input[type="password"]` and fill password
- Press Enter to submit

**Step 3:** Wait for login processing
- Wait 10 seconds for post-login processing

**Step 4:** Extract balance
- Search for elements containing "IDR" + numbers in format XXX,XXX.XX
- Use regex to extract numeric value: `/[\d,]+\.\d{2}/`
- Convert to float and return

### 3. Stub Handlers for Other Bookmakers
- `_login_bet365()` - Placeholder
- `_login_pinnacle()` - Placeholder  
- `_login_betfair()` - Placeholder

### 4. Job Router Update
Added 'login' job type to `_execute_job()`:
```python
elif job_type == 'login':
    return self._handle_login(payload)
```

### 5. Worker Capabilities Update
Added 'login' to worker capabilities:
```python
'capabilities': ['test', 'login', 'place_bet', 'check_odds']
```

## File Changes

**File:** `/data/workspace/arb/worker/worker.py`

**Changes:**
- Added imports: `re`, `datetime`, `Page`
- Added `_handle_login()` method (lines 282-337)
- Added `_login_qq188()` method (lines 339-404)
- Added stub login methods for other bookmakers (lines 406-422)
- Updated job router to handle 'login' type (line 204-205)
- Updated worker capabilities (line 114)

**Total Lines Added:** ~147 lines

## Usage

### Job Payload Format

```json
{
  "job_id": "unique-id",
  "type": "login",
  "payload": {
    "bookmaker": "qq188",
    "username": "your-username",
    "password": "your-password",
    "url": "https://qq188.com"
  }
}
```

### Response Format

**Success:**
```json
{
  "status": "success",
  "bookmaker": "qq188",
  "username": "your-username",
  "balance": 1234.56,
  "timestamp": "2025-12-07T10:30:00.123456"
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Failed to extract balance"
}
```

## Key Features

✅ **Proven Logic** - Ported from working Puppeteer implementation  
✅ **Case-Insensitive** - LOGIN/MASUK button detection works with any case  
✅ **Flexible Detection** - Searches multiple element types (a, button, span, div)  
✅ **Robust Balance Extraction** - Multiple candidates filtered and validated  
✅ **Error Handling** - Comprehensive try-catch with logging  
✅ **Bookmaker Detection** - Auto-detects bookmaker from URL or payload  
✅ **Fallback Support** - Unknown bookmakers fallback to QQ188 logic  

## Testing Recommendations

1. **Test with real QQ188 credentials** (in development environment)
2. **Verify balance extraction** with different formats
3. **Test error scenarios** (wrong credentials, network issues)
4. **Monitor logs** for timing and detection issues

## Next Steps

1. Implement Bet365 login logic
2. Implement Pinnacle login logic
3. Implement Betfair login logic
4. Add session management (save cookies/localStorage)
5. Add screenshot capture on success/failure
6. Add metrics collection

## Notes

- All waits use `page.wait_for_timeout()` (milliseconds)
- JavaScript evaluation used for DOM queries (same as Puppeteer)
- Regex pattern matches Indonesian Rupiah format: `[\d,]+\.\d{2}`
- Balance candidates filtered by: contains "IDR", has decimal format, length < 20 chars
