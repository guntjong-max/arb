#!/bin/bash
# Quick Start Script for Sportsbook Minimal

set -e

echo "========================================="
echo "Sportsbook Minimal - Quick Start"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Docker and Docker Compose are installed"
echo ""

# Menu
echo "Select an option:"
echo "1. Build all services"
echo "2. Start all services"
echo "3. Stop all services"
echo "4. View logs (all)"
echo "5. View logs (backend only)"
echo "6. View logs (workers only)"
echo "7. Restart all services"
echo "8. Clean up (remove containers & volumes)"
echo "9. Check status"
echo "0. Exit"
echo ""

read -p "Enter your choice [0-9]: " choice

case $choice in
    1)
        echo ""
        print_warning "Building all services..."
        docker-compose build
        print_success "Build completed!"
        ;;
    2)
        echo ""
        print_warning "Starting all services..."
        docker-compose up -d
        echo ""
        print_success "Services started!"
        echo ""
        echo "Access points:"
        echo "  - Backend API: http://localhost:8000"
        echo "  - Health check: http://localhost:8000/health"
        echo "  - Workers info: http://localhost:8000/workers"
        echo ""
        print_warning "View logs with: docker-compose logs -f"
        ;;
    3)
        echo ""
        print_warning "Stopping all services..."
        docker-compose down
        print_success "Services stopped!"
        ;;
    4)
        echo ""
        print_warning "Viewing all logs (Ctrl+C to exit)..."
        docker-compose logs -f
        ;;
    5)
        echo ""
        print_warning "Viewing backend logs (Ctrl+C to exit)..."
        docker-compose logs -f backend
        ;;
    6)
        echo ""
        print_warning "Viewing worker logs (Ctrl+C to exit)..."
        docker-compose logs -f worker-sbo worker-ibc worker-cmd
        ;;
    7)
        echo ""
        print_warning "Restarting all services..."
        docker-compose restart
        print_success "Services restarted!"
        ;;
    8)
        echo ""
        print_error "WARNING: This will remove all containers and volumes!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" == "yes" ]; then
            print_warning "Cleaning up..."
            docker-compose down -v
            print_success "Cleanup completed!"
        else
            print_warning "Cleanup cancelled"
        fi
        ;;
    9)
        echo ""
        print_warning "Checking service status..."
        echo ""
        docker-compose ps
        echo ""
        print_warning "Checking backend health..."
        if curl -f http://localhost:8000/health 2>/dev/null; then
            echo ""
            print_success "Backend is healthy!"
        else
            echo ""
            print_error "Backend is not responding"
        fi
        echo ""
        print_warning "Connected workers:"
        curl -s http://localhost:8000/workers 2>/dev/null | python3 -m json.tool || print_error "Failed to get worker info"
        ;;
    0)
        echo ""
        print_success "Goodbye!"
        exit 0
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_success "Done!"
