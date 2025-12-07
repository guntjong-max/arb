-- Arbitrage Bot System - Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for the arbitrage betting system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: users
-- Description: Admin users for system access
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: sportsbook_accounts
-- Description: Sportsbook credentials for betting automation
-- ============================================================
CREATE TABLE IF NOT EXISTS sportsbook_accounts (
    id SERIAL PRIMARY KEY,
    sportsbook_name VARCHAR(50) NOT NULL, -- Nova88, QQ188, etc.
    sportsbook_url VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_encrypted TEXT NOT NULL, -- Should be encrypted in production
    balance_current DECIMAL(15, 2) DEFAULT 0.00,
    balance_updated_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    connection_status VARCHAR(20) DEFAULT 'offline', -- offline, online, error
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sportsbook_name, username)
);

-- ============================================================
-- TABLE: tier_config
-- Description: Bet amount configuration per tier (league category)
-- ============================================================
CREATE TABLE IF NOT EXISTS tier_config (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) UNIQUE NOT NULL, -- tier1, tier2, tier3
    tier_priority INTEGER NOT NULL, -- 1 = highest priority
    tier_description TEXT,
    bet_amount DECIMAL(15, 2) NOT NULL,
    leagues TEXT[], -- Array of league names
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: profit_config
-- Description: Global profit and filter configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS profit_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',
    min_profit_percentage DECIMAL(5, 2) DEFAULT 3.00,
    max_profit_percentage DECIMAL(5, 2) DEFAULT 10.00,
    max_minute_ht INTEGER DEFAULT 35,
    max_minute_ft INTEGER DEFAULT 85,
    match_filter VARCHAR(20) DEFAULT 'all', -- prematch, live, all
    enabled_markets TEXT[], -- ft_hdp, ft_ou, ft_1x2, ht_hdp, ht_ou, ht_1x2
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: arbitrage_opportunities
-- Description: Detected arbitrage opportunities
-- ============================================================
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    opportunity_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    match_name VARCHAR(255) NOT NULL,
    league VARCHAR(100),
    tier_name VARCHAR(50),
    tier_priority INTEGER,
    market_type VARCHAR(20) NOT NULL, -- ft_hdp, ft_ou, ft_1x2, etc.
    match_status VARCHAR(20), -- prematch, live
    match_minute INTEGER,
    
    -- Side A (Kaki Positif - Higher Odds)
    side_a_sportsbook VARCHAR(50) NOT NULL,
    side_a_selection VARCHAR(100) NOT NULL,
    side_a_odds DECIMAL(10, 4) NOT NULL,
    side_a_stake DECIMAL(15, 2) NOT NULL,
    
    -- Side B (Kaki Lawan - Hedge Bet)
    side_b_sportsbook VARCHAR(50) NOT NULL,
    side_b_selection VARCHAR(100) NOT NULL,
    side_b_odds DECIMAL(10, 4) NOT NULL,
    side_b_stake DECIMAL(15, 2) NOT NULL,
    
    -- Profit Calculation
    profit_percentage DECIMAL(5, 2) NOT NULL,
    profit_amount DECIMAL(15, 2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'detected', -- detected, queued, executing, completed, rejected, expired
    execution_started_at TIMESTAMP,
    execution_completed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: bet_history
-- Description: Log of all executed bets
-- ============================================================
CREATE TABLE IF NOT EXISTS bet_history (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES arbitrage_opportunities(id),
    bet_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Bet Details
    sportsbook_name VARCHAR(50) NOT NULL,
    match_name VARCHAR(255) NOT NULL,
    market_type VARCHAR(20) NOT NULL,
    selection VARCHAR(100) NOT NULL,
    odds DECIMAL(10, 4) NOT NULL,
    stake DECIMAL(15, 2) NOT NULL,
    
    -- Bet Side
    bet_side VARCHAR(10) NOT NULL, -- side_a (value bet) or side_b (hedge bet)
    is_value_bet BOOLEAN DEFAULT FALSE, -- TRUE if this is the higher odds bet placed first
    
    -- Status
    status VARCHAR(20) NOT NULL, -- pending, accepted, running, won, lost, rejected, void
    bet_placement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bet_settlement_time TIMESTAMP,
    
    -- Results
    payout DECIMAL(15, 2),
    profit_loss DECIMAL(15, 2),
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: system_logs
-- Description: System activity and error logs
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL, -- info, warning, error, critical
    log_type VARCHAR(50) NOT NULL, -- scanning, betting, execution, system
    message TEXT NOT NULL,
    details JSONB,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: worker_status
-- Description: Worker/Browser health monitoring
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_status (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(100) UNIQUE NOT NULL,
    worker_type VARCHAR(50) DEFAULT 'browser', -- browser, scanner, executor
    status VARCHAR(20) DEFAULT 'standby', -- standby, processing, error, offline
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_task_id INTEGER,
    total_tasks_processed INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: daily_summary
-- Description: Daily profit/loss summary
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_summary (
    id SERIAL PRIMARY KEY,
    summary_date DATE UNIQUE NOT NULL,
    starting_balance DECIMAL(15, 2),
    ending_balance DECIMAL(15, 2),
    total_bets INTEGER DEFAULT 0,
    total_stake DECIMAL(15, 2) DEFAULT 0.00,
    total_profit_loss DECIMAL(15, 2) DEFAULT 0.00,
    opportunities_detected INTEGER DEFAULT 0,
    opportunities_executed INTEGER DEFAULT 0,
    bets_won INTEGER DEFAULT 0,
    bets_lost INTEGER DEFAULT 0,
    bets_void INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: system_config
-- Description: Global system configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: jobs
-- Description: Job queue for task management
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    job_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    job_type VARCHAR(50) NOT NULL, -- scan, place_bet, check_balance, etc.
    job_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 5,
    payload JSONB,
    result JSONB,
    worker_id VARCHAR(100),
    idempotency_key VARCHAR(255) UNIQUE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Active arbitrage opportunities
CREATE OR REPLACE VIEW v_active_opportunities AS
SELECT 
    id,
    opportunity_uuid,
    match_name,
    league,
    market_type,
    side_a_sportsbook,
    side_a_odds,
    side_b_sportsbook,
    side_b_odds,
    profit_percentage,
    status,
    created_at
FROM arbitrage_opportunities
WHERE status IN ('detected', 'queued')
ORDER BY tier_priority DESC, profit_percentage DESC, created_at ASC;

-- View: Today's bets
CREATE OR REPLACE VIEW v_today_bets AS
SELECT 
    bh.id,
    bh.bet_uuid,
    bh.sportsbook_name,
    bh.match_name,
    bh.selection,
    bh.odds,
    bh.stake,
    bh.status,
    bh.bet_placement_time,
    bh.profit_loss
FROM bet_history bh
WHERE DATE(bh.bet_placement_time) = CURRENT_DATE
ORDER BY bh.bet_placement_time DESC;

-- View: Pending bets
CREATE OR REPLACE VIEW v_pending_bets AS
SELECT 
    bh.id,
    bh.bet_uuid,
    bh.sportsbook_name,
    bh.match_name,
    bh.selection,
    bh.odds,
    bh.stake,
    bh.status,
    bh.bet_placement_time
FROM bet_history bh
WHERE bh.status IN ('pending', 'accepted', 'running')
ORDER BY bh.bet_placement_time DESC;

-- ============================================================
-- INDEXES for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_status ON arbitrage_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_created_at ON arbitrage_opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_bet_history_opportunity_id ON bet_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_bet_history_status ON bet_history(status);
CREATE INDEX IF NOT EXISTS idx_bet_history_placement_time ON bet_history(bet_placement_time);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency_key ON jobs(idempotency_key);

-- ============================================================
-- TRIGGERS for auto-update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sportsbook_accounts_updated_at BEFORE UPDATE ON sportsbook_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tier_config_updated_at BEFORE UPDATE ON tier_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profit_config_updated_at BEFORE UPDATE ON profit_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_arbitrage_opportunities_updated_at BEFORE UPDATE ON arbitrage_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bet_history_updated_at BEFORE UPDATE ON bet_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_worker_status_updated_at BEFORE UPDATE ON worker_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_summary_updated_at BEFORE UPDATE ON daily_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert default admin user (password: admin123)
-- In production, use bcrypt hashed password
INSERT INTO users (username, password_hash, email, is_active) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'admin@arbbot.local', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Insert default tier configuration
INSERT INTO tier_config (tier_name, tier_priority, tier_description, bet_amount, leagues, is_active) VALUES
('tier1', 1, 'Big Leagues - Premier League, La Liga, Serie A, Bundesliga, Ligue 1', 500.00, 
 ARRAY['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Champions League', 'Europa League'], TRUE),
('tier2', 2, 'Mid Leagues - Eredivisie, Liga Portugal, Championship', 300.00, 
 ARRAY['Eredivisie', 'Liga Portugal', 'Championship', 'Belgian First Division', 'Scottish Premiership'], TRUE),
('tier3', 3, 'Small Leagues - Other leagues and competitions', 150.00, 
 ARRAY['J-League', 'K-League', 'Chinese Super League', 'MLS'], TRUE)
ON CONFLICT (tier_name) DO NOTHING;

-- Insert default profit configuration
INSERT INTO profit_config (config_name, min_profit_percentage, max_profit_percentage, max_minute_ht, max_minute_ft, match_filter, enabled_markets, is_active) 
VALUES ('default', 3.00, 10.00, 35, 85, 'all', 
        ARRAY['ft_hdp', 'ft_ou', 'ft_1x2', 'ht_hdp', 'ht_ou', 'ht_1x2'], TRUE)
ON CONFLICT (config_name) DO NOTHING;

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, config_type, description, is_active) VALUES
('auto_robot_enabled', 'false', 'boolean', 'Enable/disable automatic bet placement', TRUE),
('max_concurrent_bets', '5', 'number', 'Maximum number of concurrent bet executions', TRUE),
('scanner_interval_seconds', '10', 'number', 'Interval for scanning opportunities', TRUE),
('balance_check_interval_minutes', '5', 'number', 'Interval for checking sportsbook balances', TRUE),
('paper_trading_mode', 'true', 'boolean', 'Enable paper trading mode (no real bets)', TRUE)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- COMPLETED
-- ============================================================
-- Schema initialization completed successfully
-- Total Tables: 12
-- Total Views: 3
-- Total Indexes: 9
-- Total Triggers: 10
