#!/bin/bash
# Arbitrage Bot - Backup Script
# Description: Backup database and Redis data

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
REDIS_BACKUP_FILE="${BACKUP_DIR}/redis_backup_${TIMESTAMP}.rdb"

echo "================================"
echo "Arbitrage Bot - Backup Script"
echo "================================"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "Backing up PostgreSQL database..."
docker compose exec -T postgres pg_dump -U arbitrage_user arbitrage_bot | gzip > "$DB_BACKUP_FILE"
echo "✓ Database backup saved to: $DB_BACKUP_FILE"

# Backup Redis
echo "Backing up Redis data..."
docker compose exec redis redis-cli -a redis_dev_password_2024 BGSAVE
sleep 2
docker cp arb-redis:/data/dump.rdb "$REDIS_BACKUP_FILE" 2>/dev/null || echo "Warning: Redis backup may not be available"
echo "✓ Redis backup saved to: $REDIS_BACKUP_FILE"

# Clean old backups (keep last 7 days)
echo "Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete

echo ""
echo "================================"
echo "Backup completed successfully!"
echo "================================"
echo "Database: $DB_BACKUP_FILE"
echo "Redis: $REDIS_BACKUP_FILE"
