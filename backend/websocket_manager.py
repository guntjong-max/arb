"""
WebSocket Manager - Manages WebSocket connections with workers
"""

from fastapi import WebSocket
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections with workers
    Handles registration, unregistration, and broadcasting
    """
    
    def __init__(self):
        # Map of worker_id -> WebSocket connection
        self.active_workers: Dict[str, WebSocket] = {}
        
        # Map of worker_id -> site name
        self.worker_sites: Dict[str, str] = {}
    
    async def register_worker(self, worker_id: str, websocket: WebSocket, site: str):
        """
        Register a new worker
        
        Args:
            worker_id: Unique worker identifier
            websocket: WebSocket connection
            site: Site name (sbo, ibc, cmd, etc.)
        """
        self.active_workers[worker_id] = websocket
        self.worker_sites[worker_id] = site
        
        logger.info(f"Worker registered: {worker_id} (site: {site})")
        logger.info(f"Total active workers: {len(self.active_workers)}")
    
    async def unregister_worker(self, worker_id: str):
        """
        Unregister a worker
        
        Args:
            worker_id: Worker identifier to unregister
        """
        if worker_id in self.active_workers:
            del self.active_workers[worker_id]
        
        if worker_id in self.worker_sites:
            del self.worker_sites[worker_id]
        
        logger.info(f"Worker unregistered: {worker_id}")
        logger.info(f"Total active workers: {len(self.active_workers)}")
    
    async def send_to_worker(self, worker_id: str, message: Dict):
        """
        Send message to a specific worker
        
        Args:
            worker_id: Target worker identifier
            message: Message dictionary to send
        """
        if worker_id in self.active_workers:
            try:
                websocket = self.active_workers[worker_id]
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to worker {worker_id}: {e}")
                await self.unregister_worker(worker_id)
    
    async def broadcast(self, message: Dict, exclude: Set[str] = None):
        """
        Broadcast message to all connected workers
        
        Args:
            message: Message dictionary to broadcast
            exclude: Set of worker IDs to exclude from broadcast
        """
        if exclude is None:
            exclude = set()
        
        disconnected_workers = []
        
        for worker_id, websocket in self.active_workers.items():
            if worker_id in exclude:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to worker {worker_id}: {e}")
                disconnected_workers.append(worker_id)
        
        # Clean up disconnected workers
        for worker_id in disconnected_workers:
            await self.unregister_worker(worker_id)
    
    def get_workers_by_site(self, site: str) -> list:
        """
        Get all worker IDs for a specific site
        
        Args:
            site: Site name to filter by
            
        Returns:
            List of worker IDs
        """
        return [
            worker_id 
            for worker_id, worker_site in self.worker_sites.items() 
            if worker_site == site
        ]
    
    def get_all_sites(self) -> Set[str]:
        """
        Get set of all active sites
        
        Returns:
            Set of site names
        """
        return set(self.worker_sites.values())
