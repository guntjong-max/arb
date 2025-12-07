import asyncio
import json
import os
import random
import time
import re
from datetime import datetime
from playwright.async_api import async_playwright
import redis.asyncio as aioredis
import requests

API_URL = os.getenv('API_URL', 'http://api:3001')
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')

# Browser sessions (account_id -> browser context)
sessions = {}


def send_result(type_name, data):
    """Send result to API backend"""
    try:
        requests.post(f'{API_URL}/api/worker/result', json={'type': type_name, 'data': data}, timeout=5)
    except Exception as e:
        print(f'Error sending result: {e}')


def round_stake(stake):
    """Round stake to nearest 0 or 5"""
    return round(stake / 5) * 5


async def login_worker(job_data):
    """Login to sportsbook site with real browser automation"""
    account_id = job_data.get('accountId')
    bookmaker = job_data.get('bookmaker', '').lower()
    username = job_data.get('username')
    password = job_data.get('password')
    
    print(f'[LOGIN] Account {account_id}: Starting login to {bookmaker}')
    
    if not username or not password:
        print('[LOGIN] Missing credentials')
        send_result('login_failed', {'accountId': account_id, 'error': 'Missing credentials'})
        return
    
    try:
        async with async_playwright() as p:
            # Launch browser with Cloudflare bypass settings
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            
            # Route to appropriate bookmaker
            balance = None
            if bookmaker == 'bet365':
                balance = await login_bet365(page, username, password)
            elif bookmaker == 'pinnacle':
                balance = await login_pinnacle(page, username, password)
            elif bookmaker == 'betfair':
                balance = await login_betfair(page, username, password)
            else:
                print(f'[LOGIN] Unsupported bookmaker: {bookmaker}')
                await browser.close()
                send_result('login_failed', {'accountId': account_id, 'error': f'Unsupported bookmaker: {bookmaker}'})
                return
            
            if balance is not None:
                # Store session
                sessions[account_id] = {'context': context, 'page': page, 'browser': browser}
                
                print(f'[LOGIN] Account {account_id}: Login successful, balance: {balance}')
                
                send_result('login_success', {
                    'accountId': account_id,
                    'bookmaker': bookmaker,
                    'username': username,
                    'balance': balance,
                    'timestamp': datetime.now().isoformat()
                })
                
                # Keep session alive
                asyncio.create_task(keep_alive(account_id, page))
            else:
                await browser.close()
                print(f'[LOGIN] Account {account_id}: Failed to extract balance')
                send_result('login_failed', {'accountId': account_id, 'error': 'Failed to extract balance'})
            
    except Exception as e:
        print(f'[LOGIN] Account {account_id}: Login failed - {e}')
        send_result('login_failed', {'accountId': account_id, 'error': str(e)})


async def login_bet365(page, username: str, password: str):
    """Login to Bet365 and extract balance"""
    try:
        print('[BET365] Navigating to Bet365...')
        await page.goto('https://www.bet365.com', wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(2000)
        
        # Click login button
        print('[BET365] Clicking login button...')
        await page.click('[data-testid="sbk-header-mobile-menu"]', timeout=10000)
        await page.wait_for_timeout(500)
        await page.click('text=Login', timeout=10000)
        await page.wait_for_timeout(1000)
        
        # Enter credentials
        print('[BET365] Entering credentials...')
        await page.fill('[name="username"]', username, timeout=10000)
        await page.fill('[name="password"]', password, timeout=10000)
        await page.click('button[type="submit"]', timeout=10000)
        
        # Wait for page to load after login
        print('[BET365] Waiting for dashboard...')
        await page.wait_for_url('**/*dashboard**', timeout=15000)
        await page.wait_for_timeout(2000)
        
        # Extract balance
        print('[BET365] Extracting balance...')
        balance_text = await page.text_content('[data-testid="account-balance"]', timeout=10000)
        
        if balance_text:
            # Parse balance value (e.g., "£1,234.56" → 1234.56)
            match = re.search(r'[\d,]+\.?\d*', balance_text.replace(',', ''))
            if match:
                balance = float(match.group())
                print(f'[BET365] Balance extracted: {balance}')
                return balance
        
        print('[BET365] Could not extract balance')
        return None
    
    except Exception as e:
        print(f'[BET365] Login error: {e}')
        return None


async def login_pinnacle(page, username: str, password: str):
    """Login to Pinnacle and extract balance"""
    try:
        print('[PINNACLE] Navigating to Pinnacle...')
        await page.goto('https://www.pinnacle.com', wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(2000)
        
        # Click login
        print('[PINNACLE] Clicking login button...')
        await page.click('text=Sign In', timeout=10000)
        await page.wait_for_timeout(1000)
        
        # Enter credentials
        print('[PINNACLE] Entering credentials...')
        await page.fill('input[type="email"]', username, timeout=10000)
        await page.fill('input[type="password"]', password, timeout=10000)
        await page.click('button[type="submit"]', timeout=10000)
        
        # Wait for dashboard
        print('[PINNACLE] Waiting for dashboard...')
        await page.wait_for_url('**/*dashboard**', timeout=15000)
        await page.wait_for_timeout(2000)
        
        # Extract balance
        print('[PINNACLE] Extracting balance...')
        balance_text = await page.text_content('[data-testid="player-balance"]', timeout=10000)
        
        if balance_text:
            match = re.search(r'[\d,]+\.?\d*', balance_text.replace(',', ''))
            if match:
                balance = float(match.group())
                print(f'[PINNACLE] Balance extracted: {balance}')
                return balance
        
        print('[PINNACLE] Could not extract balance')
        return None
    
    except Exception as e:
        print(f'[PINNACLE] Login error: {e}')
        return None


async def login_betfair(page, username: str, password: str):
    """Login to Betfair and extract balance"""
    try:
        print('[BETFAIR] Navigating to Betfair...')
        await page.goto('https://www.betfair.com', wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(2000)
        
        # Click login
        print('[BETFAIR] Clicking login button...')
        await page.click('button[data-testid="login-button"]', timeout=10000)
        await page.wait_for_timeout(1000)
        
        # Enter credentials
        print('[BETFAIR] Entering credentials...')
        await page.fill('input[autocomplete="username"]', username, timeout=10000)
        await page.fill('input[autocomplete="current-password"]', password, timeout=10000)
        await page.click('button[data-testid="login-submit"]', timeout=10000)
        
        # Wait for dashboard
        print('[BETFAIR] Waiting for account page...')
        await page.wait_for_url('**/*my-accounts**', timeout=15000)
        await page.wait_for_timeout(2000)
        
        # Extract balance
        print('[BETFAIR] Extracting balance...')
        balance_text = await page.text_content('[data-testid="account-balance"]', timeout=10000)
        
        if balance_text:
            match = re.search(r'[\d,]+\.?\d*', balance_text.replace(',', ''))
            if match:
                balance = float(match.group())
                print(f'[BETFAIR] Balance extracted: {balance}')
                return balance
        
        print('[BETFAIR] Could not extract balance')
        return None
    
    except Exception as e:
        print(f'[BETFAIR] Login error: {e}')
        return None


async def keep_alive(account_id, page):
    """Keep session alive by periodic checks"""
    while account_id in sessions:
        await asyncio.sleep(60)
        try:
            await page.evaluate('() => window.location.href')
            print(f'[KEEP-ALIVE] Account {account_id}: Session active')
        except Exception as e:
            print(f'[KEEP-ALIVE] Account {account_id}: Session lost - {e}')
            sessions.pop(account_id, None)
            break


async def scan_worker(job_data):
    """Scan for betting opportunities"""
    print('[SCAN] Starting scan...')
    
    # Mock scanning results
    matches = [
        {
            'match': 'Team A vs Team B',
            'market': 'FT HDP',
            'odds': 1.95,
            'time': 25,
            'live': True
        },
        {
            'match': 'Team C vs Team D',
            'market': 'FT O/U',
            'odds': 2.05,
            'time': 40,
            'live': True
        }
    ]
    
    # Filter: only positive odds
    positive_odds = [m for m in matches if m['odds'] > 1.0]
    
    print(f'[SCAN] Found {len(positive_odds)} opportunities with positive odds')
    
    send_result('scan_result', {
        'matches': positive_odds,
        'count': len(positive_odds),
        'timestamp': datetime.now().isoformat()
    })


async def bet_worker(job_data):
    """Execute bet"""
    bet_id = job_data['betId']
    account_id = job_data['accountId']
    match_name = job_data['matchName']
    market_type = job_data['marketType']
    odds = job_data['odds']
    stake = job_data['stake']
    
    print(f'[BET] Executing bet {bet_id}: {match_name} - {market_type} @ {odds}, stake: {stake}')
    
    # Check if session exists
    if account_id not in sessions:
        print(f'[BET] Account {account_id} not logged in')
        send_result('bet_failed', {'betId': bet_id, 'error': 'Not logged in'})
        return
    
    try:
        page = sessions[account_id]['page']
        
        # Mock bet execution (replace with actual selectors)
        # await page.click(f'text={match_name}')
        # await page.fill('#stake-input', str(stake))
        # await page.click('#place-bet-button')
        
        # Simulate bet placement
        await asyncio.sleep(2)
        
        print(f'[BET] Bet {bet_id} executed successfully')
        
        send_result('bet_executed', {
            'betId': bet_id,
            'accountId': account_id,
            'matchName': match_name,
            'stake': stake,
            'odds': odds
        })
        
        # After accepted -> trigger pair bet logic would go here
        
    except Exception as e:
        print(f'[BET] Bet {bet_id} failed - {e}')
        send_result('bet_failed', {'betId': bet_id, 'error': str(e)})


async def process_queue():
    """Process jobs from Redis queues"""
    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    
    print('[WORKER] Connected to Redis, processing queues...')
    
    while True:
        try:
            # Check login queue
            login_job = await redis_client.blpop('bull:login:wait', timeout=1)
            if login_job:
                job_data = json.loads(login_job[1])
                await login_worker(job_data.get('data', {}))
            
            # Check scan queue
            scan_job = await redis_client.blpop('bull:scan:wait', timeout=1)
            if scan_job:
                job_data = json.loads(scan_job[1])
                await scan_worker(job_data.get('data', {}))
            
            # Check bet queue
            bet_job = await redis_client.blpop('bull:bet:wait', timeout=1)
            if bet_job:
                job_data = json.loads(bet_job[1])
                await bet_worker(job_data.get('data', {}))
            
        except Exception as e:
            print(f'[WORKER] Error processing queue: {e}')
            await asyncio.sleep(1)


if __name__ == '__main__':
    print('[WORKER] Starting minimal worker...')
    asyncio.run(process_queue())
