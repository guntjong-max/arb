"""
Event Matcher - Matches events across different sportsbooks
"""

from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class EventMatcher:
    """
    Matches sporting events across different bookmakers
    Normalizes team names and creates event signatures
    """
    
    def __init__(self):
        self.team_aliases = {
            'manchester united': ['man united', 'man u', 'mufc'],
            'manchester city': ['man city', 'mcfc'],
            'tottenham': ['spurs', 'tottenham hotspur', 'thfc'],
            'chelsea': ['cfc'],
            'liverpool': ['lfc'],
            'arsenal': ['afc'],
            'barcelona': ['barca', 'fcb'],
            'real madrid': ['madrid', 'real'],
            # Add more team aliases as needed
        }
    
    def normalize_team_name(self, name: str) -> str:
        """
        Normalize team name by removing extra info and lowercasing
        
        Args:
            name: Team name to normalize
            
        Returns:
            Normalized team name
        """
        if not name:
            return ""
        
        # Remove parentheses content
        if '(' in name and ')' in name:
            name = name.split('(')[0].strip()
        
        # Lowercase and strip
        name = name.lower().strip()
        
        return name
    
    def find_team_canonical(self, normalized_name: str) -> str:
        """
        Find canonical team name from aliases
        
        Args:
            normalized_name: Normalized team name
            
        Returns:
            Canonical team name
        """
        # Check if it's already a canonical name
        if normalized_name in self.team_aliases:
            return normalized_name
        
        # Search in aliases
        for canonical, aliases in self.team_aliases.items():
            if normalized_name in aliases:
                return canonical
        
        # Return as-is if no alias found
        return normalized_name
    
    def create_event_signature(self, home_team: str, away_team: str) -> str:
        """
        Create a unique signature for an event
        
        Args:
            home_team: Home team name
            away_team: Away team name
            
        Returns:
            Event signature string
        """
        home_norm = self.normalize_team_name(home_team)
        away_norm = self.normalize_team_name(away_team)
        
        home_canonical = self.find_team_canonical(home_norm)
        away_canonical = self.find_team_canonical(away_norm)
        
        # Sort teams to ensure consistent signature regardless of home/away
        teams_sorted = sorted([home_canonical, away_canonical])
        
        signature = f"{teams_sorted[0]}_vs_{teams_sorted[1]}"
        
        return signature
    
    def match_events(self, odds_by_provider: Dict[str, List[Dict]]) -> Dict:
        """
        Match events across multiple providers
        
        Args:
            odds_by_provider: Dictionary with provider names as keys and lists of matches
            
        Returns:
            Dictionary of matched events grouped by signature
        """
        matched_events = {}
        
        for provider, matches in odds_by_provider.items():
            if not matches:
                continue
            
            for match in matches:
                home_team = match.get('home_team', '')
                away_team = match.get('away_team', '')
                
                if not home_team or not away_team:
                    continue
                
                # Create event signature
                signature = self.create_event_signature(home_team, away_team)
                
                # Initialize event group if doesn't exist
                if signature not in matched_events:
                    matched_events[signature] = {
                        'signature': signature,
                        'providers': {},
                        'match_info': {
                            'home': self.normalize_team_name(home_team),
                            'away': self.normalize_team_name(away_team)
                        }
                    }
                
                # Add provider data
                matched_events[signature]['providers'][provider] = {
                    'home_team': home_team,
                    'away_team': away_team,
                    'odds': match.get('odds', {}),
                    'time': match.get('time', ''),
                    'league': match.get('league', ''),
                    'provider': provider
                }
        
        logger.info(f"Matched {len(matched_events)} unique events across {len(odds_by_provider)} providers")
        
        return matched_events
