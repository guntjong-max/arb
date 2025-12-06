#!/bin/bash

# SSL Setup Verification Script
# Checks if SSL configuration is correct before going live

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}SSL Configuration Verification${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to print check status
print_check() {
    local status=$1
    local message=$2
    
    if [ "$status" == "OK" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
        ((WARNINGS++))
    else
        echo -e "${RED}✗${NC} $message"
        ((ERRORS++))
    fi
}

# Check 1: Docker and Docker Compose
echo -e "${YELLOW}Checking prerequisites...${NC}"

if command -v docker &> /dev/null; then
    print_check "OK" "Docker is installed"
else
    print_check "FAIL" "Docker is not installed"
fi

if command -v docker-compose &> /dev/null; then
    print_check "OK" "Docker Compose is installed"
else
    print_check "FAIL" "Docker Compose is not installed"
fi

echo ""

# Check 2: Directory structure
echo -e "${YELLOW}Checking directory structure...${NC}"

REQUIRED_DIRS=(
    "nginx"
    "nginx/conf.d"
    "certbot/conf"
    "certbot/www"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_check "OK" "Directory exists: $dir"
    else
        print_check "FAIL" "Directory missing: $dir"
    fi
done

echo ""

# Check 3: Configuration files
echo -e "${YELLOW}Checking configuration files...${NC}"

REQUIRED_FILES=(
    "nginx/nginx.conf"
    "nginx/conf.d/api.kliks.life.conf"
    "nginx/conf.d/grafana.kliks.life.conf"
    "nginx/conf.d/db.kliks.life.conf"
    "docker-compose.yml"
    "init-ssl.sh"
    "renew-ssl.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_check "OK" "File exists: $file"
    else
        print_check "FAIL" "File missing: $file"
    fi
done

echo ""

# Check 4: Script permissions
echo -e "${YELLOW}Checking script permissions...${NC}"

SCRIPTS=(
    "init-ssl.sh"
    "renew-ssl.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -x "$script" ]; then
        print_check "OK" "Script is executable: $script"
    else
        print_check "WARN" "Script not executable: $script (run: chmod +x $script)"
    fi
done

echo ""

# Check 5: DNS configuration
echo -e "${YELLOW}Checking DNS configuration...${NC}"

DOMAINS=("api.kliks.life" "grafana.kliks.life" "db.kliks.life")

# Get server's public IP
if command -v curl &> /dev/null; then
    SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me || echo "Unknown")
    echo -e "  Server public IP: ${BLUE}${SERVER_IP}${NC}"
    echo ""
else
    print_check "WARN" "curl not installed, cannot verify DNS"
    SERVER_IP="Unknown"
fi

for domain in "${DOMAINS[@]}"; do
    if command -v dig &> /dev/null; then
        DOMAIN_IP=$(dig +short ${domain} | tail -n1)
        
        if [ -z "$DOMAIN_IP" ]; then
            print_check "FAIL" "DNS not configured for: $domain"
        elif [ "$SERVER_IP" == "$DOMAIN_IP" ]; then
            print_check "OK" "DNS configured correctly for: $domain → $DOMAIN_IP"
        elif [ "$SERVER_IP" == "Unknown" ]; then
            print_check "WARN" "Cannot verify DNS for: $domain (resolves to: $DOMAIN_IP)"
        else
            print_check "WARN" "DNS mismatch for: $domain (resolves to: $DOMAIN_IP, server: $SERVER_IP)"
        fi
    else
        print_check "WARN" "dig not installed, cannot verify DNS for: $domain"
    fi
done

echo ""

# Check 6: Firewall/Ports
echo -e "${YELLOW}Checking firewall configuration...${NC}"

if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | grep -E "80|443" || echo "")
    
    if echo "$UFW_STATUS" | grep -q "80"; then
        print_check "OK" "Port 80 is allowed in firewall"
    else
        print_check "WARN" "Port 80 might not be allowed in firewall"
    fi
    
    if echo "$UFW_STATUS" | grep -q "443"; then
        print_check "OK" "Port 443 is allowed in firewall"
    else
        print_check "WARN" "Port 443 might not be allowed in firewall"
    fi
else
    print_check "WARN" "UFW not installed or not accessible, cannot verify firewall rules"
fi

echo ""

# Check 7: Docker services
echo -e "${YELLOW}Checking Docker services...${NC}"

REQUIRED_SERVICES=("engine" "grafana" "pgadmin" "postgres" "redis")

for service in "${REQUIRED_SERVICES[@]}"; do
    if docker-compose ps | grep -q "${service}"; then
        STATUS=$(docker-compose ps ${service} 2>/dev/null | grep -v "Name" | awk '{print $4}' | head -1)
        if echo "$STATUS" | grep -qi "up"; then
            print_check "OK" "Service running: $service"
        else
            print_check "WARN" "Service not running: $service (status: $STATUS)"
        fi
    else
        print_check "WARN" "Service not found: $service (not started yet)"
    fi
done

echo ""

# Check 8: Nginx configuration syntax
echo -e "${YELLOW}Checking Nginx configuration syntax...${NC}"

if docker-compose ps nginx &> /dev/null; then
    if docker-compose exec -T nginx nginx -t &> /dev/null; then
        print_check "OK" "Nginx configuration syntax is valid"
    else
        print_check "FAIL" "Nginx configuration has syntax errors"
    fi
else
    print_check "WARN" "Nginx not running, cannot test configuration"
fi

echo ""

# Check 9: Certificates
echo -e "${YELLOW}Checking SSL certificates...${NC}"

CERT_DIRS=(
    "certbot/conf/live/api.kliks.life"
    "certbot/conf/live/grafana.kliks.life"
    "certbot/conf/live/db.kliks.life"
)

CERTS_EXIST=0

for cert_dir in "${CERT_DIRS[@]}"; do
    DOMAIN=$(basename $cert_dir)
    if [ -d "$cert_dir" ]; then
        # Check certificate expiration
        if [ -f "$cert_dir/cert.pem" ]; then
            EXPIRY=$(openssl x509 -in "$cert_dir/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
            NOW_EPOCH=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
            
            if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
                print_check "OK" "Certificate valid for: $DOMAIN (expires in $DAYS_UNTIL_EXPIRY days)"
            elif [ $DAYS_UNTIL_EXPIRY -gt 0 ]; then
                print_check "WARN" "Certificate expiring soon for: $DOMAIN (expires in $DAYS_UNTIL_EXPIRY days)"
            else
                print_check "FAIL" "Certificate expired for: $DOMAIN"
            fi
            ((CERTS_EXIST++))
        else
            print_check "WARN" "Certificate file not found for: $DOMAIN"
        fi
    else
        print_check "WARN" "No certificate directory for: $DOMAIN (not generated yet)"
    fi
done

if [ $CERTS_EXIST -eq 0 ]; then
    echo -e "  ${YELLOW}Note: Run ./init-ssl.sh to generate certificates${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}  You can proceed with SSL setup.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Verification completed with $WARNINGS warning(s)${NC}"
    echo -e "${YELLOW}  Review warnings above. You may proceed with caution.${NC}"
    exit 0
else
    echo -e "${RED}✗ Verification failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo -e "${RED}  Please fix the errors above before proceeding.${NC}"
    exit 1
fi
