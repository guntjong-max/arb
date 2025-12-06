#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Let's Encrypt SSL Certificate Setup${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Define domains
DOMAINS=("api.kliks.life" "grafana.kliks.life" "db.kliks.life")
EMAIL="admin@kliks.life"  # Change this to your email

# Check if running with proper permissions
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}Warning: Running as root. Consider using a non-root user with docker permissions.${NC}"
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose not found. Please install docker-compose first.${NC}"
    exit 1
fi

# Function to check if domain points to this server
check_dns() {
    local domain=$1
    echo -e "${YELLOW}Checking DNS for ${domain}...${NC}"
    
    # Get server's public IP
    SERVER_IP=$(curl -s ifconfig.me)
    
    # Get domain's IP
    DOMAIN_IP=$(dig +short ${domain} | tail -n1)
    
    if [ "$SERVER_IP" == "$DOMAIN_IP" ]; then
        echo -e "${GREEN}✓ DNS configured correctly for ${domain}${NC}"
        return 0
    else
        echo -e "${RED}✗ DNS mismatch for ${domain}${NC}"
        echo -e "  Server IP: ${SERVER_IP}"
        echo -e "  Domain IP: ${DOMAIN_IP}"
        return 1
    fi
}

# Create required directories
echo -e "${YELLOW}Creating required directories...${NC}"
mkdir -p ./nginx/conf.d
mkdir -p ./certbot/conf
mkdir -p ./certbot/www
mkdir -p ./nginx/ssl

# Check DNS for all domains
echo ""
echo -e "${YELLOW}Verifying DNS configuration...${NC}"
DNS_CHECK_FAILED=0

for domain in "${DOMAINS[@]}"; do
    if ! check_dns "$domain"; then
        DNS_CHECK_FAILED=1
    fi
done

if [ $DNS_CHECK_FAILED -eq 1 ]; then
    echo ""
    echo -e "${RED}DNS verification failed for one or more domains.${NC}"
    echo -e "${YELLOW}Please ensure all domains point to this server's IP address.${NC}"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start nginx without SSL first (for HTTP-01 challenge)
echo ""
echo -e "${YELLOW}Starting Nginx for certificate generation...${NC}"
docker-compose up -d nginx

# Wait for nginx to be ready
sleep 5

# Request certificates for each domain
echo ""
echo -e "${YELLOW}Requesting SSL certificates...${NC}"

for domain in "${DOMAINS[@]}"; do
    echo ""
    echo -e "${GREEN}Processing: ${domain}${NC}"
    
    # Check if certificate already exists
    if [ -d "./certbot/conf/live/${domain}" ]; then
        echo -e "${YELLOW}Certificate already exists for ${domain}. Skipping...${NC}"
        continue
    fi
    
    # Request certificate
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d ${domain}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Certificate obtained successfully for ${domain}${NC}"
    else
        echo -e "${RED}✗ Failed to obtain certificate for ${domain}${NC}"
        echo -e "${YELLOW}Please check:${NC}"
        echo -e "  1. Domain DNS is correctly configured"
        echo -e "  2. Port 80 is accessible from the internet"
        echo -e "  3. No firewall is blocking the connection"
    fi
done

# Remove initial setup configuration
echo ""
echo -e "${YELLOW}Updating Nginx configuration...${NC}"
if [ -f "./nginx/conf.d/00-initial-setup.conf" ]; then
    rm ./nginx/conf.d/00-initial-setup.conf
    echo -e "${GREEN}✓ Removed initial setup configuration${NC}"
fi

# Reload nginx with SSL configuration
echo ""
echo -e "${YELLOW}Reloading Nginx with SSL configuration...${NC}"
docker-compose exec nginx nginx -t && docker-compose exec nginx nginx -s reload

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Nginx configuration error. Please check the logs.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}SSL Certificate Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Your services are now available at:"
echo -e "  ${GREEN}https://api.kliks.life${NC} - Engine API"
echo -e "  ${GREEN}https://grafana.kliks.life${NC} - Grafana Dashboard"
echo -e "  ${GREEN}https://db.kliks.life${NC} - PgAdmin"
echo ""
echo -e "${YELLOW}Note: Certificates will auto-renew via cron job.${NC}"
echo -e "${YELLOW}Check renewal status with: docker-compose logs certbot${NC}"
echo ""
