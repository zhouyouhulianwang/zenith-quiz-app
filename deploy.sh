#!/bin/bash
# =============================================================================
# ZENITH Complete Deployment Script
# Deploys: Frontend + Backend API + MySQL with full data restoration
# Target:  47.251.92.247
# =============================================================================

set -e

APP_DIR="/opt/zenith"
LOG_FILE="/var/log/zenith-deploy.log"
DEPLOY_TAR="/tmp/zenith-deploy.tar.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$msg" | tee -a "$LOG_FILE"
}

log_info()  { log "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { log "${GREEN}[OK]${NC}    $1"; }
log_warn()  { log "${YELLOW}[WARN]${NC}  $1"; }
log_error() { log "${RED}[ERROR]${NC} $1"; }

fatal() {
    log_error "$1"
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        fatal "Please run as root or with sudo"
    fi
}

# Install Docker if not present
install_docker() {
    log_info "Checking Docker..."
    
    if command -v docker &> /dev/null; then
        log_ok "Docker already installed ($(docker --version))"
    else
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
        log_ok "Docker installed"
    fi
    
    # Ensure docker is running
    if ! docker info &> /dev/null; then
        systemctl start docker || fatal "Failed to start Docker"
    fi
}

# Determine docker compose command
detect_compose() {
    log_info "Detecting Docker Compose..."
    
    if docker compose version &> /dev/null; then
        COMPOSE="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE="docker-compose"
    else
        log_info "Installing Docker Compose plugin..."
        apt-get update -qq && apt-get install -y -qq docker-compose-plugin 2>/dev/null || {
            log_info "Installing docker-compose binary..."
            curl -sL "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" \
                -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        }
        
        if docker compose version &> /dev/null; then
            COMPOSE="docker compose"
        elif command -v docker-compose &> /dev/null; then
            COMPOSE="docker-compose"
        else
            fatal "Failed to install Docker Compose"
        fi
    fi
    
    log_ok "Using: $COMPOSE"
}

# Extract deployment package
extract_package() {
    log_info "Extracting deployment package..."
    
    if [ ! -f "$DEPLOY_TAR" ]; then
        fatal "Deployment package not found: $DEPLOY_TAR"
    fi
    
    mkdir -p "$APP_DIR"
    rm -rf "$APP_DIR"/*
    tar -xzf "$DEPLOY_TAR" -C "$APP_DIR"
    rm -f "$DEPLOY_TAR"
    
    log_ok "Extracted to $APP_DIR"
}

# Stop and clean existing containers
cleanup_old() {
    log_info "Cleaning old containers..."
    
    cd "$APP_DIR"
    
    # Stop containers gracefully
    $COMPOSE down 2>/dev/null || true
    
    # Force remove if still exist
    docker rm -f zenith-mysql zenith-app 2>/dev/null || true
    
    log_ok "Old containers removed"
}

# Remove old MySQL data for clean start
reset_mysql_volume() {
    log_info "Resetting MySQL data volume..."
    
    # Check if volume exists
    if docker volume ls -q | grep -q "zenith_mysql_data\|mysql_data"; then
        docker volume rm -f zenith_mysql_data 2>/dev/null || docker volume rm -f "$(docker volume ls -q | grep mysql_data | head -1)" 2>/dev/null || true
    fi
    
    # Also try with compose project prefix
    docker volume ls -q | grep -E "mysql_data|zenith" | xargs -r docker volume rm -f 2>/dev/null || true
    
    log_ok "MySQL volume cleared"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    cd "$APP_DIR"
    $COMPOSE build --no-cache 2>&1 | tee -a "$LOG_FILE"
    
    log_ok "Images built"
}

# Start MySQL and wait for it to be healthy
start_mysql() {
    log_info "Starting MySQL..."
    
    cd "$APP_DIR"
    $COMPOSE up -d mysql
    
    log_info "Waiting for MySQL to be healthy (this may take 30-60s)..."
    
    local max_wait=60
    local waited=0
    
    while [ $waited -lt $max_wait ]; do
        # Check health via docker
        local health_status
        health_status=$($COMPOSE ps mysql --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "")
        
        # Also try direct MySQL connection as backup check
        if docker exec zenith-mysql mysqladmin ping -h localhost -uzenith -pzenith_pass --silent 2>/dev/null; then
            log_ok "MySQL is responding"
            
            # Extra wait to ensure init scripts complete
            log_info "Waiting for init scripts to complete..."
            sleep 5
            
            # Verify tables were created
            local table_count
            table_count=$(docker exec -i zenith-mysql mysql -uzenith -pzenith_pass zenith -N -e "
                SELECT COUNT(*) FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA='zenith' 
                AND TABLE_NAME IN ('users','banks','mock_exams','practice_records','daily_records','user_settings');
            " 2>/dev/null | head -1 | tr -d '[:space:]')
            
            if [ "$table_count" = "6" ]; then
                log_ok "All 6 tables created successfully"
                return 0
            elif [ -n "$table_count" ] && [ "$table_count" -gt 0 ]; then
                log_warn "Only $table_count/6 tables found, waiting more..."
            fi
        fi
        
        sleep 2
        waited=$((waited + 2))
        
        if [ $((waited % 10)) -eq 0 ]; then
            log_info "  Still waiting... ($waited/${max_wait}s)"
        fi
    done
    
    # If we get here, check what went wrong
    log_error "MySQL failed to become healthy within ${max_wait}s"
    $COMPOSE logs mysql | tail -30 | tee -a "$LOG_FILE"
    
    # Try to show current tables anyway
    log_info "Current tables in zenith database:"
    docker exec -i zenith-mysql mysql -uzenith -pzenith_pass zenith -e "SHOW TABLES;" 2>/dev/null || true
    
    return 1
}

# Run the seed script to import all data
seed_database() {
    log_info "=========================================="
    log_info "  SEEDING DATABASE - FULL RESTORATION"
    log_info "=========================================="
    
    cd "$APP_DIR"
    
    # Run seed using the built app container
    # The container has node, mysql2, and the seed.js script
    local seed_output
    seed_output=$($COMPOSE run --rm -e DATABASE_URL=mysql://zenith:zenith_pass@mysql:3306/zenith zenith \
        node db/seed/seed.js 2>&1) && {
        echo "$seed_output" | tee -a "$LOG_FILE"
        log_ok "Database seeded successfully"
        
        # Verify counts
        log_info "Verifying database contents..."
        local counts
        counts=$(docker exec -i zenith-mysql mysql -uzenith -pzenith_pass zenith -N -e "
            SELECT 'users', COUNT(*) FROM users
            UNION ALL SELECT 'banks', COUNT(*) FROM banks
            UNION ALL SELECT 'mock_exams', COUNT(*) FROM mock_exams
            UNION ALL SELECT 'practice_records', COUNT(*) FROM practice_records
            UNION ALL SELECT 'daily_records', COUNT(*) FROM daily_records
            UNION ALL SELECT 'user_settings', COUNT(*) FROM user_settings;
        " 2>/dev/null)
        
        log_info "Final database state:"
        echo "$counts" | while read -r line; do
            log_info "  $line"
        done
        
        return 0
    } || {
        log_error "Seed script failed"
        echo "$seed_output" | tee -a "$LOG_FILE"
        
        # Try alternative: run seed.js directly
        log_warn "Trying alternative seed method..."
        docker run --rm --network container:zenith-mysql \
            -v "$APP_DIR/db:/app/db:ro" \
            -e DATABASE_URL=mysql://zenith:zenith_pass@zenith-mysql:3306/zenith \
            node:20-alpine \
            sh -c "cd /app && node db/seed/seed.js" 2>&1 | tee -a "$LOG_FILE" && {
            log_ok "Alternative seed succeeded"
            return 0
        } || {
            log_error "Alternative seed also failed"
            return 1
        }
    }
}

# Start the main application
start_app() {
    log_info "Starting ZENITH application..."
    
    cd "$APP_DIR"
    $COMPOSE up -d zenith
    
    log_info "Waiting for app to start..."
    sleep 5
    
    local max_wait=30
    local waited=0
    
    while [ $waited -lt $max_wait ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -qE "200|304"; then
            log_ok "App is responding on port 3000"
            return 0
        fi
        
        # Check container logs for errors
        if $COMPOSE logs --tail=5 zenith 2>/dev/null | grep -qi "error\|fatal"; then
            log_warn "Possible errors in app startup"
        fi
        
        sleep 2
        waited=$((waited + 2))
    done
    
    log_warn "App health check timed out, but it may still be starting"
    return 0
}

# Display final status
show_status() {
    log_info "=========================================="
    log_info "  DEPLOYMENT COMPLETE"
    log_info "=========================================="
    log_info ""
    log_info "  App URL:    http://47.251.92.247:3000"
    log_info "  MySQL:      localhost:3306"
    log_info "  App Dir:    $APP_DIR"
    log_info "  Logs:       $COMPOSE logs -f"
    log_info ""
    
    cd "$APP_DIR"
    $COMPOSE ps 2>/dev/null | while read -r line; do
        log_info "  $line"
    done
    
    log_info ""
    log_info "  Useful commands:"
    log_info "    View logs:     cd $APP_DIR && $COMPOSE logs -f"
    log_info "    Restart app:   cd $APP_DIR && $COMPOSE restart zenith"
    log_info "    Restart all:   cd $APP_DIR && $COMPOSE restart"
    log_info "    Stop all:      cd $APP_DIR && $COMPOSE down"
    log_info "    MySQL shell:   docker exec -it zenith-mysql mysql -uzenith -pzenith_pass zenith"
    log_info "    Backup DB:     docker exec zenith-mysql mysqldump -uzenith -pzenith_pass zenith > backup.sql"
    log_info ""
    log_info "  Default login: username=1, password=1"
    log_info "=========================================="
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    echo -e "${GREEN}"
    echo "  _____   ______  ______  __  __  ____"
    echo " /__  /  / __  / / __  / / / / / /  _/"
    echo "   / /  / /_/ / / /_/ / / /_/ / / /"
    echo "  / /__/ ____/ / __  / / __  /_/ /"
    echo " /____/_/     /_/ /_/ /_/ /_____/"
    echo -e "${NC}"
    
    log_info "Starting ZENITH deployment..."
    log_info "Target: 47.251.92.247"
    
    mkdir -p "$(dirname "$LOG_FILE")"
    
    check_root
    extract_package
    install_docker
    detect_compose
    cleanup_old
    reset_mysql_volume
    build_images
    start_mysql || fatal "MySQL failed to start"
    seed_database || log_warn "Seeding had issues, but continuing..."
    start_app
    show_status
    
    log_ok "All done!"
}

main "$@"
