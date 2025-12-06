#!/bin/bash

# Certificate renewal script for Let's Encrypt
# This script should be run by cron twice daily

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[$(date)] Starting certificate renewal check...${NC}"

# Change to the project directory
cd /data/workspace/arb || exit 1

# Attempt to renew certificates
docker-compose run --rm certbot renew --quiet

RENEWAL_STATUS=$?

if [ $RENEWAL_STATUS -eq 0 ]; then
    echo -e "${GREEN}[$(date)] Certificate renewal check completed successfully${NC}"
    
    # Reload nginx to apply any new certificates
    docker-compose exec nginx nginx -s reload
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[$(date)] Nginx reloaded successfully${NC}"
    else
        echo -e "${RED}[$(date)] Failed to reload Nginx${NC}"
    fi
else
    echo -e "${RED}[$(date)] Certificate renewal failed with status: $RENEWAL_STATUS${NC}"
fi

# Clean up old certificates (older than 30 days)
docker-compose run --rm certbot certificates | grep "INVALID" && \
    echo -e "${YELLOW}[$(date)] Warning: Some certificates are invalid or expiring${NC}"

echo -e "${YELLOW}[$(date)] Certificate renewal check completed${NC}"
