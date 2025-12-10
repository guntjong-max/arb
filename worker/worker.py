#!/usr/bin/env python3
"""
Generic Worker - Sportsbook Scraper
Reads SITE env variable to determine which scraper module to load
"""

import os
import sys
import time
import json
import logging
import asyncio
import websockets
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] Worker-%(process)d: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


class GenericWorker:
    """
    Generic worker that loads site-specific scraper based on SITE env variable
    """
    
    def __init__(self):
        load_dotenv()
        
        self.site = os.getenv('SITE', 'sbo').lower()
        self.worker_id = f"worker-{self.site}-{os.getpid()}"
        self.backend_ws_url = os.getenv('BACKEND_WS_URL', 'ws://backend:8000/ws')
        self.scrape_interval = int(os.getenv('SCRAPE_INTERVAL', '30'))
        
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.ws_client = None
        self.is_running = True
        
        # Load site-specific scraper module
        self.scraper = self._load_scraper()
        
        logger.info(f"Worker initialized: {self.worker_id} for site: {self.site}")
    
    def _load_scraper(self):
        """Dynamically load site-specific scraper module"""
        try:
            if self.site == 'sbo':
                from sites.sbo import SBOScraper
                return SBOScraper()
            elif self.site == 'ibc':
                from sites.ibc import IBCScraper
                return IBCScraper()
            elif self.site == 'cmd':
                from sites.cmd import CMDScraper
                return CMDScraper()
            else:
                logger.error(f"Unknown site: {self.site}")
                sys.exit(1)
        except ImportError as e:
            logger.error(f"Failed to load scraper for {self.site}: {e}")
            sys.exit(1)
    
    def start(self):
        """Start the worker"""
        logger.info(f"Starting worker for {self.site}...")
        
        try:
            # Initialize browser
            self._init_browser()
            
            # Connect to backend WebSocket
            asyncio.run(self._run_worker())
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            self.shutdown()
        except Exception as e:
            logger.error(f"Worker failed: {e}", exc_info=True)
            self.shutdown()
            sys.exit(1)
    
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
    
    async def _run_worker(self):
        """Main worker loop with WebSocket connection"""
        while self.is_running:
            try:
                async with websockets.connect(self.backend_ws_url) as websocket:
                    self.ws_client = websocket
                    logger.info(f"Connected to backend: {self.backend_ws_url}")
                    
                    # Send registration message
                    await self._register_worker()
                    
                    # Start scraping loop
                    await self._scrape_loop()
                    
            except Exception as e:
                logger.error(f"WebSocket connection error: {e}")
                logger.info(f"Reconnecting in 5 seconds...")
                await asyncio.sleep(5)
    
    async def _register_worker(self):
        """Register this worker with the backend"""
        registration = {
            'type': 'worker:register',
            'worker_id': self.worker_id,
            'site': self.site,
            'timestamp': datetime.now().isoformat()
        }
        
        await self.ws_client.send(json.dumps(registration))
        logger.info(f"Worker registered: {self.worker_id}")
    
    async def _scrape_loop(self):
        """Main scraping loop"""
        logger.info(f"Starting scrape loop (interval: {self.scrape_interval}s)")
        
        while self.is_running:
            try:
                # Scrape odds using site-specific scraper
                logger.info(f"Scraping {self.site}...")
                page = self.context.new_page()
                
                odds_data = self.scraper.scrape_odds(page)
                
                page.close()
                
                # Send odds to backend
                if odds_data:
                    await self._send_odds(odds_data)
                
                # Wait for next scrape
                await asyncio.sleep(self.scrape_interval)
                
            except Exception as e:
                logger.error(f"Scrape error: {e}", exc_info=True)
                await asyncio.sleep(5)
    
    async def _send_odds(self, odds_data: Dict[str, Any]):
        """Send scraped odds to backend"""
        message = {
            'type': 'odds:update',
            'worker_id': self.worker_id,
            'site': self.site,
            'timestamp': datetime.now().isoformat(),
            'data': odds_data
        }
        
        await self.ws_client.send(json.dumps(message))
        logger.info(f"Sent odds update: {len(odds_data.get('matches', []))} matches")
    
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
        
        logger.info("Worker shutdown complete")


def main():
    """Main entry point"""
    print("=" * 60)
    print("Sportsbook Scraper - Generic Worker")
    print("=" * 60)
    print()
    
    worker = GenericWorker()
    worker.start()


if __name__ == '__main__':
    main()
