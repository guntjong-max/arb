"""
FastAPI Backend - WebSocket Server, Event Matcher, Arbitrage Calculator
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Set
import json
import logging
import asyncio
from datetime import datetime

from matcher import EventMatcher
from websocket_manager import WebSocketManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sportsbook Arbitrage Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize WebSocket manager
ws_manager = WebSocketManager()

# Initialize Event Matcher
event_matcher = EventMatcher()

# Store latest odds from each worker
odds_store: Dict[str, Dict] = {}


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("=" * 60)
    logger.info("FastAPI Backend Starting...")
    logger.info("=" * 60)
    logger.info("WebSocket Server: Ready")
    logger.info("Event Matcher: Initialized")
    logger.info("Arbitrage Calculator: Ready")
    logger.info("=" * 60)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Sportsbook Arbitrage Backend",
        "version": "1.0.0",
        "status": "running",
        "workers_connected": len(ws_manager.active_workers),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "workers": len(ws_manager.active_workers),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/workers")
async def get_workers():
    """Get list of connected workers"""
    return {
        "count": len(ws_manager.active_workers),
        "workers": list(ws_manager.active_workers.keys())
    }


@app.get("/odds")
async def get_odds():
    """Get latest odds from all workers"""
    return {
        "timestamp": datetime.now().isoformat(),
        "sources": len(odds_store),
        "data": odds_store
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for worker connections
    Handles:
    - Worker registration
    - Odds updates from workers
    - Broadcasting arbitrage opportunities
    """
    await websocket.accept()
    worker_id = None
    
    try:
        while True:
            # Receive message from worker
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get('type')
            
            if msg_type == 'worker:register':
                # Register new worker
                worker_id = message.get('worker_id')
                site = message.get('site')
                
                await ws_manager.register_worker(worker_id, websocket, site)
                logger.info(f"Worker registered: {worker_id} (site: {site})")
                
                # Send acknowledgment
                await websocket.send_json({
                    'type': 'registration:ack',
                    'worker_id': worker_id,
                    'status': 'registered'
                })
            
            elif msg_type == 'odds:update':
                # Receive odds update from worker
                worker_id = message.get('worker_id')
                site = message.get('site')
                odds_data = message.get('data')
                
                logger.info(f"Received odds from {worker_id}: {odds_data.get('count', 0)} matches")
                
                # Store odds
                odds_store[site] = {
                    'worker_id': worker_id,
                    'timestamp': message.get('timestamp'),
                    'data': odds_data
                }
                
                # Process arbitrage opportunities
                await process_arbitrage()
            
            else:
                logger.warning(f"Unknown message type: {msg_type}")
    
    except WebSocketDisconnect:
        if worker_id:
            await ws_manager.unregister_worker(worker_id)
            logger.info(f"Worker disconnected: {worker_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        if worker_id:
            await ws_manager.unregister_worker(worker_id)


async def process_arbitrage():
    """
    Process arbitrage opportunities from collected odds
    """
    try:
        if len(odds_store) < 2:
            # Need at least 2 sources for arbitrage
            return
        
        # Convert odds_store to format expected by EventMatcher
        odds_by_provider = {}
        for site, data in odds_store.items():
            odds_by_provider[site] = data.get('data', {}).get('matches', [])
        
        # Match events across providers
        matched_events = event_matcher.match_events(odds_by_provider)
        
        # Calculate arbitrage opportunities
        opportunities = calculate_arbitrage(matched_events)
        
        if opportunities:
            logger.info(f"Found {len(opportunities)} arbitrage opportunities")
            
            # Broadcast to all connected workers
            await ws_manager.broadcast({
                'type': 'arbitrage:opportunities',
                'timestamp': datetime.now().isoformat(),
                'count': len(opportunities),
                'opportunities': opportunities
            })
    
    except Exception as e:
        logger.error(f"Arbitrage processing error: {e}", exc_info=True)


def calculate_arbitrage(matched_events: Dict) -> List[Dict]:
    """
    Calculate arbitrage opportunities from matched events
    
    Args:
        matched_events: Dictionary of matched events
        
    Returns:
        List of arbitrage opportunities
    """
    opportunities = []
    
    # TODO: Implement actual arbitrage calculation logic
    # This is a placeholder - use the ArbitrageDetector from backend_engine.py
    
    for event_sig, event_data in matched_events.items():
        providers = event_data.get('providers', {})
        
        if len(providers) < 2:
            continue
        
        # Simple arbitrage check example
        # Replace with actual ArbitrageDetector logic
        
        # opportunities.append({
        #     'event': event_sig,
        #     'margin': margin,
        #     'providers': [...],
        #     ...
        # })
    
    return opportunities


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
