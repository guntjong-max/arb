#!/bin/bash
# Arbitrage Bot - Restore Script
# Description: Restore database from backup

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "================================"
echo "Arbitrage Bot - Restore Script"
echo "================================"
echo ""
echo "WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Restoring database..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U arbitrage_user -d arbitrage_bot

echo ""
echo "================================"
echo "Restore completed successfully!"
echo "================================"
