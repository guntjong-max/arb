#!/bin/bash

echo "===================================================="
echo "Sportsbook Scraping System - Quick Deploy"
echo "===================================================="
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Error: Docker not installed"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Error: Docker Compose not installed"; exit 1; }

# Create .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    
    # Generate random passwords
    DB_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-20)
    REDIS_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-20)
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/")
    SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/")
    ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/")
    PGADMIN_PASS=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
    GRAFANA_PASS=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
    
    # Update .env
    sed -i "s/arbitrage_dev_password_2024/$DB_PASS/g" .env
    sed -i "s/redis_dev_password_2024/$REDIS_PASS/g" .env
    sed -i "s/CHANGE_ME_JWT_SECRET_MIN_32_CHARS_REPLACE_THIS_VALUE/$JWT_SECRET/g" .env
    sed -i "s/CHANGE_ME_SESSION_SECRET_MIN_32_CHARS_REPLACE_THIS/$SESSION_SECRET/g" .env
    sed -i "s/CHANGE_ME_FERNET_KEY_USE_PYTHON_SCRIPT/$ENCRYPTION_KEY/g" .env
    sed -i "s/pgadmin_dev_password_2024/$PGADMIN_PASS/g" .env
    sed -i "s/grafana_dev_password_2024/$GRAFANA_PASS/g" .env
    
    echo "✓ .env file created with random passwords"
else
    echo "✓ .env file already exists"
fi

# Stop existing containers
echo ""
echo "Stopping existing containers..."
docker-compose down

# Build images
echo ""
echo "Building Docker images..."
docker-compose build engine sportsbook-worker sportsbook-ui

# Start infrastructure services first
echo ""
echo "Starting infrastructure services..."
docker-compose up -d postgres redis

# Wait for health checks
echo ""
echo "Waiting for database to be ready (30 seconds)..."
sleep 30

# Start remaining services
echo ""
echo "Starting application services..."
docker-compose up -d

# Wait for services to stabilize
echo ""
echo "Waiting for services to start (15 seconds)..."
sleep 15

# Show status
echo ""
echo "===================================================="
echo "Deployment Complete!"
echo "===================================================="
echo ""

docker-compose ps

echo ""
echo "Access Points:"
echo "- Dashboard: http://localhost:8080"
echo "- API: http://localhost:3000"
echo "- API Docs: http://localhost:3000/api/docs"
echo "- PgAdmin: http://localhost:5050"
echo "- Grafana: http://localhost:3030"
echo ""

# Show credentials
if [ -f .env ]; then
    source .env
    echo "Credentials:"
    echo "- PgAdmin Email: ${PGADMIN_EMAIL}"
    echo "- PgAdmin Password: ${PGADMIN_PASSWORD}"
    echo "- Grafana User: ${GRAFANA_USER}"
    echo "- Grafana Password: ${GRAFANA_PASSWORD}"
    echo ""
fi

echo "Next Steps:"
echo "1. Open http://localhost:8080 in your browser"
echo "2. Navigate to 'Credentials' and add a sportsbook account"
echo "3. Go to 'Workers' and start a worker"
echo "4. Check 'Live Odds' to see scraped data"
echo ""
echo "View logs:"
echo "  docker-compose logs -f sportsbook-worker"
echo "  docker-compose logs -f engine"
echo ""
echo "Troubleshooting:"
echo "  docker-compose ps          # Check service status"
echo "  docker-compose restart     # Restart all services"
echo "  docker-compose down -v     # Complete reset (deletes data)"
echo ""
