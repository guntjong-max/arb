# Worker Login Implementation

## Overview
This implementation adds real browser automation for sportsbook login using Playwright.

## Features

✅ **Real Browser Automation**
- Uses Playwright to launch actual browser
- Cloudflare bypass with `--disable-blink-features=AutomationControlled`
- Supports headless mode for production

✅ **Multi-Bookmaker Support**
- Bet365
- Pinnacle  
- Betfair

✅ **Balance Extraction**
- Logs into sportsbook
- Navigates to dashboard
- Extracts account balance
- Returns balance to backend

## Job Format

The worker accepts login jobs with the following format:

```json
{
  "job_id": "unique_job_id",
  "type": "login",
  "payload": {
    "bookmaker": "bet365",
    "username": "your_username",
    "password": "your_password"
  }
}
```

### Supported Bookmakers

| Bookmaker | Value | URL |
|-----------|-------|-----|
| Bet365 | `bet365` | https://www.bet365.com |
| Pinnacle | `pinnacle` | https://www.pinnacle.com |
| Betfair | `betfair` | https://www.betfair.com |

## Response Format

### Success Response

```json
{
  "status": "success",
  "bookmaker": "bet365",
  "username": "test_user",
  "balance": 1234.56,
  "timestamp": "2025-12-07T10:30:45.123456"
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Failed to extract balance"
}
```

## Implementation Details

### Main Components

1. **`_handle_login(payload)`** - Main login handler
   - Validates credentials
   - Routes to appropriate bookmaker
   - Returns balance or error

2. **`_login_bet365(page, username, password)`** - Bet365 login
   - Navigates to bet365.com
   - Clicks login button
   - Fills credentials
   - Waits for dashboard
   - Extracts balance from `[data-testid="account-balance"]`

3. **`_login_pinnacle(page, username, password)`** - Pinnacle login
   - Navigates to pinnacle.com
   - Clicks "Sign In"
   - Fills email & password
   - Waits for dashboard
   - Extracts balance from `[data-testid="player-balance"]`

4. **`_login_betfair(page, username, password)`** - Betfair login
   - Navigates to betfair.com
   - Clicks login button
   - Fills credentials
   - Waits for my-accounts page
   - Extracts balance from `[data-testid="account-balance"]`

### Error Handling

- Missing credentials → Returns error
- Unsupported bookmaker → Returns error
- Login failure → Logs error, returns error message
- Balance extraction failure → Returns error

### Logging

Each step is logged with appropriate log levels:
- `INFO` - Normal operations (navigation, clicking, etc.)
- `WARNING` - Non-fatal issues (balance extraction failed)
- `ERROR` - Fatal errors (login failed, exceptions)

## Testing

### Manual Test

1. Start Redis:
```bash
redis-server
```

2. Start worker:
```bash
cd /data/workspace/arb/worker
python worker.py
```

3. Push test job:
```bash
python test_login.py
```

### Expected Flow

1. Worker receives job from Redis queue
2. Launches browser with Cloudflare bypass
3. Navigates to sportsbook
4. Performs login
5. Extracts balance
6. Returns result
7. Logs result (WebSocket reporting to be implemented later)

## Browser Configuration

### Cloudflare Bypass Settings

```python
browser_args = {
    'headless': True,
    'args': [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
    ]
}
```

### User Agent

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

## Notes

⚠️ **Important:**
- Selectors may need adjustment based on actual website HTML
- Login timeouts set to 10-15 seconds
- Balance regex extracts numeric values (handles commas and currency symbols)
- Each login creates a new page context

🔧 **To Adjust:**
- Update selectors in `_login_*` methods if websites change
- Modify timeouts if sites are slow
- Add more bookmakers by creating new `_login_*` methods

## Next Steps

- [ ] Add session persistence (keep browser open)
- [ ] Implement result reporting via WebSocket
- [ ] Add screenshot on login failure for debugging
- [ ] Handle 2FA if required
- [ ] Add captcha solving integration
