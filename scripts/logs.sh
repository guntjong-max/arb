#!/bin/bash
# Arbitrage Bot - View Logs Script
# Description: Easy log viewing for all services

SERVICE=${1:-"all"}
LINES=${2:-100}

echo "================================"
echo "Arbitrage Bot - Log Viewer"
echo "================================"
echo ""

case $SERVICE in
    engine)
        echo "=== Engine Logs (last $LINES lines) ==="
        docker compose logs --tail=$LINES -f engine
        ;;
    postgres)
        echo "=== PostgreSQL Logs (last $LINES lines) ==="
        docker compose logs --tail=$LINES -f postgres
        ;;
    redis)
        echo "=== Redis Logs (last $LINES lines) ==="
        docker compose logs --tail=$LINES -f redis
        ;;
    nginx)
        echo "=== Nginx Logs (last $LINES lines) ==="
        docker compose logs --tail=$LINES -f nginx
        ;;
    prometheus)
        echo "=== Prometheus Logs (last $LINES lines) ==="
        docker compose logs --tail=$LINES -f prometheus
        ;;
    grafana)
        echo "=== Grafana Logs (last $LINES lines) ==="
        docker compose logs --tail=$LINES -f grafana
        ;;
    all|*)
        echo "=== All Services Logs (last $LINES lines) ==="
        docker compose logs --tail=$LINES -f
        ;;
esac
