# Quick Start - Worker Login Testing

## 🚀 Test the Implementation NOW

### 1. Start Redis (Terminal 1)
```bash
redis-server
```

### 2. Start Worker (Terminal 2)
```bash
cd /data/workspace/arb/worker
python worker.py
```

### 3. Push Test Job (Terminal 3)
```bash
cd /data/workspace/arb/worker
python test_login.py
```

**Select bookmaker from menu:**
- 1 = Bet365
- 2 = Pinnacle
- 3 = Betfair
- 4 = All three

### 4. Watch Logs
```bash
tail -f /data/workspace/arb/worker/logs/worker.log
```

## 📋 Test Job Example

```json
{
  "job_id": "test_login_1",
  "type": "login",
  "payload": {
    "bookmaker": "bet365",
    "username": "test_user",
    "password": "test_password"
  }
}
```

## ✅ Expected Result

Worker logs will show:
```
[INFO] Received job: test_login_1 type=login
[INFO] Login request for bet365 - username: test_user
[INFO] Navigating to Bet365...
[INFO] Clicking login button...
[INFO] Entering credentials...
[INFO] Waiting for dashboard...
[INFO] Extracting balance...
[INFO] Bet365 balance extracted: 1234.56
[INFO] Successfully logged in bet365 - Balance: 1234.56
```

## 🔧 Using Real Credentials

Edit `test_login.py` and replace:
```python
"username": "your_real_username",
"password": "your_real_password"
```

## 📚 Full Documentation

See `LOGIN_IMPLEMENTATION.md` for complete details.

## ⚡ Quick Manual Test via Redis CLI

```bash
redis-cli
> RPUSH jobs:queue '{"job_id":"manual_1","type":"login","payload":{"bookmaker":"bet365","username":"test","password":"test"}}'
```

Worker will immediately pick it up!
