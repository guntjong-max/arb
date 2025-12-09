import json
from typing import Dict, List
from datetime import datetime

class EventMatcher:
    def __init__(self):
        self.team_aliases = {
            'manchester united': ['man united', 'man u'],
            'manchester city': ['man city'],
            'tottenham': ['spurs', 'tottenham hotspur'],
            'chelsea': [],
            'galatasaray': [],
            'sporting': ['sporting lisbon'],
        }
    
    def normalize_team_name(self, name: str) -> str:
        if not name:
            return ""
        if '(' in name and ')' in name:
            name = name.split('(')[0].strip()
        name = name.lower().strip()
        return name
    
    def find_team_canonical(self, norm: str) -> str:
        if norm in self.team_aliases:
            return norm
        for canonical, aliases in self.team_aliases.items():
            if norm in aliases:
                return canonical
        return norm
    
    def normalize_match(self, match: Dict) -> Dict:
        home_norm = self.normalize_team_name(match.get('home_team', ''))
        away_norm = self.normalize_team_name(match.get('away_team', ''))
        home_can = self.find_team_canonical(home_norm)
        away_can = self.find_team_canonical(away_norm)
        teams_sorted = sorted([home_can, away_can])
        sig = f"{teams_sorted[0]}_{teams_sorted[1]}"
        return {'home_norm': home_norm, 'away_norm': away_norm, 'signature': sig, 'provider': match.get('provider'), 'odds': match.get('odds')}
    
    def match_events(self, data: Dict) -> Dict:
        grouped = {}
        for provider, matches in data.items():
            for match in matches:
                match['provider'] = provider
                norm = self.normalize_match(match)
                sig = norm['signature']
                if sig not in grouped:
                    grouped[sig] = {'providers': {}, 'match_info': {'home': norm['home_norm'], 'away': norm['away_norm']}}
                grouped[sig]['providers'][provider] = norm
        return grouped


class ArbitrageDetector:
    def __init__(self, settings: Dict = None):
        self.settings = settings or {
            'min_percent': 5,
            'max_percent': 120,
            'minute_limit_ht': 35,
            'minute_limit_ft': 75,
            'market_filter': {'ft_hdp': True, 'ft_ou': True, 'ht_hdp': True, 'ht_ou': True},
            'round_off': 5
        }
    
    def parse_time_to_minutes(self, time_str: str) -> int:
        if not time_str:
            return 0
        try:
            parts = time_str.split()
            if 'H' in time_str:
                h = int(parts[0].replace('H', ''))
                m = int(parts[1]) if len(parts) > 1 else 0
                return h * 60 + m
            return int(time_str)
        except:
            return 0
    
    def apply_time_filter(self, match_info: Dict) -> bool:
        time_str = match_info.get('time', '')
        minutes = self.parse_time_to_minutes(time_str)
        is_ht = minutes < 45
        limit = self.settings['minute_limit_ht'] if is_ht else self.settings['minute_limit_ft']
        return minutes <= limit
    
    def calculate_margin(self, odds1: float, odds2: float) -> float:
        if not odds1 or not odds2 or odds1 <= 0 or odds2 <= 0:
            return None
        try:
            total_implied = (1 / odds1) + (1 / odds2)
            margin = (total_implied - 1) * 100
            return round(margin, 2)
        except:
            return None
    
    def check_market_filter(self, market: str) -> bool:
        return self.settings['market_filter'].get(market, False)
    
    def detect_opportunities(self, grouped_matches: Dict) -> List[Dict]:
        opportunities = []
        for match_sig, event_data in grouped_matches.items():
            providers = event_data['providers']
            if len(providers) < 2:
                continue
            
            match_info = event_data['match_info']
            for market in ['ft_hdp', 'ft_ou', 'ht_hdp', 'ht_ou']:
                if not self.check_market_filter(market):
                    continue
                
                odds_by_provider = {}
                for provider, match_data in providers.items():
                    odds = match_data.get('odds', {}).get(market)
                    if odds:
                        odds_by_provider[provider] = odds
                
                if len(odds_by_provider) < 2:
                    continue
                
                home_overs = []
                away_unders = []
                
                for provider, odds in odds_by_provider.items():
                    home_val = odds.get('home') or odds.get('over')
                    away_val = odds.get('away') or odds.get('under')
                    if home_val:
                        home_overs.append({'value': home_val, 'provider': provider})
                    if away_val:
                        away_unders.append({'value': away_val, 'provider': provider})
                
                if not home_overs or not away_unders:
                    continue
                
                home_overs.sort(key=lambda x: x['value'])
                away_unders.sort(key=lambda x: x['value'], reverse=True)
                
                best_home = home_overs[0]
                best_away = away_unders[0]
                
                margin = self.calculate_margin(best_home['value'], best_away['value'])
                
                if not margin or margin < self.settings['min_percent'] or margin > self.settings['max_percent']:
                    continue
                
                opportunity = {
                    'match_id': match_sig,
                    'home': match_info.get('home', 'Unknown'),
                    'away': match_info.get('away', 'Unknown'),
                    'market': market,
                    'margin': margin,
                    'leg_1': {'provider': best_home['provider'], 'odds': best_home['value'], 'side': 'home/over'},
                    'leg_2': {'provider': best_away['provider'], 'odds': best_away['value'], 'side': 'away/under'}
                }
                opportunities.append(opportunity)
        
        return opportunities


class BackendEngine:
    def __init__(self):
        self.event_matcher = EventMatcher()
        self.arb_detector = ArbitrageDetector()
    
    def process_odds(self, odds_by_provider: Dict) -> Dict:
        """Main flow: odds → matching → arbitrage"""
        result = {
            'timestamp': datetime.now().isoformat(),
            'providers': len(odds_by_provider),
            'events_matched': 0,
            'opportunities_found': 0,
            'opportunities': []
        }
        
        grouped = self.event_matcher.match_events(odds_by_provider)
        result['events_matched'] = len(grouped)
        
        opportunities = self.arb_detector.detect_opportunities(grouped)
        result['opportunities_found'] = len(opportunities)
        result['opportunities'] = opportunities
        
        return result
    
    def update_settings(self, new_settings: Dict):
        self.arb_detector.settings.update(new_settings)
