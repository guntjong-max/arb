#!/usr/bin/env python3
"""
Worker Bot - Arbitrage Bot System
Consumes jobs from Redis queue and executes them using Playwright
"""

import os
import sys
import time
import json
import logging
import signal
import uuid
import re
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
import redis
import websocket
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/worker.log')
    ]
)
logger = logging.getLogger(__name__)


class WorkerBot:
    """
    Main worker bot class that consumes and executes jobs
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.worker_id = config.get('worker_id', str(uuid.uuid4()))
        self.engine_url = config.get('engine_url')
        self.engine_ws_url = config.get('engine_ws_url')
        self.redis_url = config.get('redis_url')
        self.proxy_config = config.get('proxy', {})
        
        self.redis_client: Optional[redis.Redis] = None
        self.ws_client: Optional[websocket.WebSocket] = None
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.is_running = True
        
        logger.info(f"Worker initialized: {self.worker_id}")
    
    def start(self):
        """Start the worker bot"""
        logger.info(f"Starting worker {self.worker_id}")
        
        try:
            # Connect to Redis
            self._connect_redis()
            
            # Connect to Engine via WebSocket
            self._connect_engine()
            
            # Initialize browser
            self._init_browser()
            
            # Start consuming jobs
            self._consume_jobs()
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            self.shutdown()
        except Exception as e:
            logger.error(f"Worker startup failed: {e}", exc_info=True)
            self.shutdown()
            sys.exit(1)
    
    def _connect_redis(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            self.redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            raise
    
    def _connect_engine(self):
        """Connect to Engine via WebSocket"""
        try:
            logger.info(f"Connecting to engine: {self.engine_ws_url}")
            
            # For now, just log - WebSocket will be implemented in Phase 2
            logger.info("WebSocket connection (stub) - to be implemented")
            
            # TODO: Implement WebSocket connection
            # self.ws_client = websocket.create_connection(self.engine_ws_url)
            # self._register_worker()
            
        except Exception as e:
            logger.warning(f"WebSocket connection failed (expected in Phase 1): {e}")
    
    def _register_worker(self):
        """Register worker with engine"""
        registration_msg = {
            'type': 'worker:register',
            'worker_id': self.worker_id,
            'proxy_info': self.proxy_config,
            'capabilities': ['test', 'login', 'place_bet', 'check_odds']
        }
        
        logger.info(f"Worker registration message: {registration_msg}")
        # TODO: Send via WebSocket when implemented
    
    def _init_browser(self):
        """Initialize Playwright browser"""
        try:
            logger.info("Initializing Playwright browser...")
            
            self.playwright = sync_playwright().start()
            
            # Browser launch options
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
            
            # Add proxy if configured
            if self.proxy_config.get('server'):
                browser_args['proxy'] = {
                    'server': self.proxy_config['server'],
                    'username': self.proxy_config.get('username'),
                    'password': self.proxy_config.get('password')
                }
            
            self.browser = self.playwright.chromium.launch(**browser_args)
            
            # Create browser context
            self.context = self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                locale='id-ID',
                timezone_id='Asia/Jakarta'
            )
            
            logger.info("Browser initialized successfully")
            
        except Exception as e:
            logger.error(f"Browser initialization failed: {e}")
            raise
    
    def _consume_jobs(self):
        """Main job consumption loop"""
        logger.info("Starting job consumption loop...")
        
        while self.is_running:
            try:
                # Blocking pop from Redis queue (5 second timeout)
                job_data = self.redis_client.blpop('jobs:queue', timeout=5)
                
                if job_data is None:
                    # No job available, continue
                    continue
                
                # Parse job data
                _, job_json = job_data
                job = json.loads(job_json)
                
                logger.info(f"Received job: {job.get('job_id')} type={job.get('type')}")
                
                # Execute job
                result = self._execute_job(job)
                
                # Report result
                self._report_result(job.get('job_id'), result)
                
            except Exception as e:
                logger.error(f"Job consumption error: {e}", exc_info=True)
                time.sleep(1)  # Brief pause before retry
    
    def _execute_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a job"""
        job_type = job.get('type')
        job_id = job.get('job_id')
        payload = job.get('payload', {})
        
        logger.info(f"Executing job {job_id} of type {job_type}")
        
        try:
            # Route to appropriate handler
            if job_type == 'test':
                return self._handle_test_job(payload)
            elif job_type == 'login':
                return self._handle_login(payload)
            elif job_type == 'place_bet':
                return self._handle_place_bet(payload)
            elif job_type == 'check_odds':
                return self._handle_check_odds(payload)
            else:
                return {
                    'success': False,
                    'error': f'Unknown job type: {job_type}'
                }
        
        except Exception as e:
            logger.error(f"Job execution failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_test_job(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle test job"""
        logger.info(f"Test job payload: {payload}")
        
        # Simple test: open a page and take screenshot
        try:
            page = self.context.new_page()
            page.goto('https://example.com')
            page.wait_for_load_state('networkidle')
            
            screenshot_path = f'screenshots/test_{int(time.time())}.png'
            os.makedirs('screenshots', exist_ok=True)
            page.screenshot(path=screenshot_path)
            
            page.close()
            
            return {
                'success': True,
                'message': 'Test job completed',
                'screenshot': screenshot_path,
                'timestamp': time.time()
            }
        except Exception as e:
            logger.error(f"Test job failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_place_bet(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle place bet job (stub)"""
        logger.info(f"Place bet job (stub): {payload}")
        
        # TODO: Implement actual bet placement logic
        # This is a placeholder for Phase 3
        
        return {
            'success': True,
            'message': 'Bet placement (stub - not implemented)',
            'payload': payload,
            'note': 'Full implementation pending in Phase 3'
        }
    
    def convert_odds_to_decimal(self, odds_value, format_type='decimal'):
        """
        Convert any odds format to decimal (European) format.
        
        Args:
            odds_value: Odds value (float, str, or int)
            format_type: 'decimal', 'fractional', 'american'
        
        Returns:
            float: Decimal odds (always > 1.0)
        
        Examples:
            convert_odds_to_decimal(1.95) → 1.95
            convert_odds_to_decimal("19/20", "fractional") → 1.95
            convert_odds_to_decimal(-105, "american") → 1.952
        """
        try:
            if format_type == 'decimal':
                return float(odds_value)
            
            elif format_type == 'fractional':
                # Handle "19/20" string format
                if isinstance(odds_value, str) and '/' in odds_value:
                    parts = odds_value.split('/')
                    numerator = float(parts[0])
                    denominator = float(parts[1])
                    return (numerator / denominator) + 1
                else:
                    return float(odds_value)
            
            elif format_type == 'american':
                odds_value = float(odds_value)
                if odds_value < 0:
                    # Negative odds
                    return 1 + (100 / abs(odds_value))
                else:
                    # Positive odds
                    return 1 + (odds_value / 100)
            
            return float(odds_value)
            
        except Exception as e:
            logger.error(f"Odds conversion failed: {e} for value={odds_value}, format={format_type}")
            raise
    
    def _handle_check_odds(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Check and normalize odds to decimal format"""
        bookmaker = payload.get('bookmaker')
        odds_data = payload.get('odds', {})
        
        logger.info(f"Check odds job for {bookmaker}: {odds_data}")
        
        # Convert all odds to decimal format
        normalized_odds = {}
        for market, odds_value in odds_data.items():
            try:
                # Detect format (for now assume decimal)
                # In production, detect based on bookmaker API response
                format_type = payload.get('format', 'decimal')
                decimal_odds = self.convert_odds_to_decimal(odds_value, format_type)
                
                # Validate: must be > 1.0
                if decimal_odds <= 1.0:
                    logger.warning(f"Invalid odds {odds_value} → {decimal_odds} for {market}")
                    continue
                
                logger.info(f"Converted {market}: {odds_value} ({format_type}) → {decimal_odds} (decimal)")
                normalized_odds[market] = decimal_odds
                
            except Exception as e:
                logger.error(f"Failed to convert odds for {market}: {e}")
                continue
        
        return {
            'success': True,
            'bookmaker': bookmaker,
            'odds': normalized_odds,
            'format': 'decimal'
        }
    
    def _handle_login(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle login for various sportsbooks"""
        bookmaker = payload.get('bookmaker', '').lower()
        username = payload.get('username')
        password = payload.get('password')
        url = payload.get('url')
        
        if not username or not password or not url:
            return {
                'status': 'error',
                'message': 'Missing credentials or URL'
            }
        
        try:
            # Create a new page for login
            page = self.context.new_page()
            page.goto(url, wait_until='networkidle')
            
            balance = None
            
            # Detect bookmaker and use appropriate login method
            if 'qq188' in bookmaker or 'qq188' in url:
                balance = self._login_qq188(page, username, password)
            elif 'bet365' in bookmaker or 'bet365' in url:
                balance = self._login_bet365(page, username, password)
            elif 'pinnacle' in bookmaker or 'pinnacle' in url:
                balance = self._login_pinnacle(page, username, password)
            elif 'betfair' in bookmaker or 'betfair' in url:
                balance = self._login_betfair(page, username, password)
            else:
                # Fallback to QQ188 logic for unknown bookmakers
                logger.info(f"Unknown bookmaker '{bookmaker}', trying QQ188 login logic")
                balance = self._login_qq188(page, username, password)
            
            page.close()
            
            if balance is not None:
                return {
                    'status': 'success',
                    'bookmaker': bookmaker,
                    'username': username,
                    'balance': balance,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'error',
                    'message': 'Failed to extract balance'
                }
        
        except Exception as e:
            logger.error(f"Login failed: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _login_qq188(self, page: Page, username: str, password: str) -> Optional[float]:
        """Login to QQ188 and extract balance"""
        try:
            # Page already loaded by caller
            page.wait_for_timeout(2000)
            
            # 1. Find and click LOGIN/MASUK button
            login_clicked = page.evaluate("""() => {
                const elements = Array.from(document.querySelectorAll('a, button, span, div'));
                const target = elements.find(el => {
                    const txt = el.innerText ? el.innerText.trim().toUpperCase() : '';
                    return txt === 'LOGIN' || txt === 'MASUK';
                });
                if (target) { target.click(); return true; }
                return false;
            }""")
            
            if not login_clicked:
                logger.warning("QQ188: Login button not found")
                return None
            
            page.wait_for_timeout(3000)
            
            # 2. Input username & password
            page.wait_for_selector('input[type="text"]', timeout=10000)
            text_inputs = page.query_selector_all('input[type="text"]')
            
            if text_inputs:
                text_inputs[0].fill(username)
            
            page.fill('input[type="password"]', password)
            page.keyboard.press('Enter')
            
            logger.info("QQ188: Login processing...")
            page.wait_for_timeout(10000)
            
            # 3. Find balance (IDR + format XXX,XXX.XX)
            saldo_data = page.evaluate("""() => {
                const allElements = Array.from(document.querySelectorAll('span, div, b, strong'));
                
                const candidates = allElements.filter(el => {
                    const text = el.innerText;
                    if (!text) return false;
                    return text.includes('IDR') && 
                           /[\d,]+\.\d{2}/.test(text) && 
                           text.length < 20;
                });
                
                const texts = candidates.map(el => el.innerText.trim());
                return texts.length > 0 ? texts : ["Saldo Tidak Ketemu"];
            }""")
            
            logger.info(f"QQ188: Balance candidates: {saldo_data}")
            
            if saldo_data and saldo_data[0] != "Saldo Tidak Ketemu":
                # Extract number from "IDR 1,234.56" format
                match = re.search(r'[\d,]+\.\d{2}', saldo_data[0])
                if match:
                    balance_str = match.group().replace(',', '')
                    return float(balance_str)
            
            return None
        
        except Exception as e:
            logger.error(f"QQ188 login error: {str(e)}", exc_info=True)
            return None
    
    def _login_bet365(self, page: Page, username: str, password: str) -> Optional[float]:
        """Login to Bet365 and extract balance (stub)"""
        logger.info("Bet365 login (stub - not implemented)")
        # TODO: Implement Bet365 login logic
        return None
    
    def _login_pinnacle(self, page: Page, username: str, password: str) -> Optional[float]:
        """Login to Pinnacle and extract balance (stub)"""
        logger.info("Pinnacle login (stub - not implemented)")
        # TODO: Implement Pinnacle login logic
        return None
    
    def _login_betfair(self, page: Page, username: str, password: str) -> Optional[float]:
        """Login to Betfair and extract balance (stub)"""
        logger.info("Betfair login (stub - not implemented)")
        # TODO: Implement Betfair login logic
        return None
    
    def _report_result(self, job_id: str, result: Dict[str, Any]):
        """Report job result back to engine"""
        logger.info(f"Job {job_id} result: {result.get('success')}")
        
        # TODO: Send result via WebSocket or HTTP callback
        # For now, just log
        logger.info(f"Result for job {job_id}: {json.dumps(result, indent=2)}")
    
    def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down worker...")
        
        self.is_running = False
        
        # Close browser
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        
        # Close connections
        if self.redis_client:
            self.redis_client.close()
        if self.ws_client:
            self.ws_client.close()
        
        logger.info("Worker shutdown complete")


def load_config() -> Dict[str, Any]:
    """Load configuration from environment"""
    load_dotenv()
    
    return {
        'worker_id': os.getenv('WORKER_ID', str(uuid.uuid4())),
        'engine_url': os.getenv('ENGINE_URL', 'http://localhost:3000'),
        'engine_ws_url': os.getenv('ENGINE_WS_URL', 'ws://localhost:3001/ws'),
        'redis_url': os.getenv('REDIS_URL', 'redis://localhost:6379'),
        'proxy': {
            'server': os.getenv('PROXY_SERVER'),
            'username': os.getenv('PROXY_USERNAME'),
            'password': os.getenv('PROXY_PASSWORD')
        }
    }


def main():
    """Main entry point"""
    print("=" * 60)
    print("Arbitrage Bot System - Worker")
    print("=" * 60)
    print()
    
    # Load configuration
    config = load_config()
    
    # Create worker
    worker = WorkerBot(config)
    
    # Setup signal handlers
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}")
        worker.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start worker
    worker.start()


if __name__ == '__main__':
    main()
