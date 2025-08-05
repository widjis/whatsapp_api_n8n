#!/bin/bash

# WhatsApp Docker Session Manager
# Comprehensive script for managing WhatsApp sessions in Docker environment

set -e

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-whatsapp-api}"
COMPOSE_FILE="docker-compose.yml"
SESSION_COMPOSE_FILE="docker-compose.session-fix.yml"
AUTH_INFO_DIR="./auth_info"
BAILEYS_STORE="./baileys_store.json"
BACKUP_DIR="./session_backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Check if container exists
check_container() {
    if ! docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        log_warning "Container '${CONTAINER_NAME}' not found."
        return 1
    fi
    return 0
}

# Create backup directory
setup_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_success "Created backup directory: $BACKUP_DIR"
    fi
}

# Check session health
check_session_health() {
    log_info "Checking WhatsApp session health..."
    
    # Check auth_info directory
    if [ -d "$AUTH_INFO_DIR" ]; then
        local file_count=$(find "$AUTH_INFO_DIR" -name "*.json" 2>/dev/null | wc -l)
        log_success "auth_info directory: EXISTS ($file_count session files)"
        
        if [ "$file_count" -gt 0 ]; then
            echo "   Sample files:"
            find "$AUTH_INFO_DIR" -name "*.json" | head -5 | while read -r file; do
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown")
                echo "   - $(basename "$file") (${size} bytes)"
            done
        fi
    else
        log_warning "auth_info directory: MISSING"
    fi
    
    # Check baileys_store.json
    if [ -f "$BAILEYS_STORE" ]; then
        local size=$(stat -f%z "$BAILEYS_STORE" 2>/dev/null || stat -c%s "$BAILEYS_STORE" 2>/dev/null || echo "unknown")
        log_success "baileys_store.json: EXISTS (${size} bytes)"
        
        # Check if file contains valid JSON
        if jq empty "$BAILEYS_STORE" 2>/dev/null; then
            local keys=$(jq -r 'keys | length' "$BAILEYS_STORE" 2>/dev/null || echo "0")
            echo "   - Contains $keys top-level keys"
        else
            log_warning "   - File contains invalid JSON"
        fi
    else
        log_warning "baileys_store.json: MISSING"
    fi
    
    # Check container status
    if check_container; then
        local status=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
        log_info "Container status: $status"
        
        if [ "$status" = "running" ]; then
            # Check if service is responding
            if docker exec "$CONTAINER_NAME" curl -f http://localhost:8192/health >/dev/null 2>&1; then
                log_success "WhatsApp API service: HEALTHY"
            else
                log_warning "WhatsApp API service: NOT RESPONDING"
            fi
        fi
    fi
    
    echo
    log_info "If experiencing 'Bad MAC Error', run: $0 --clean"
}

# Clean session files
clean_session() {
    log_info "Starting WhatsApp session cleanup..."
    setup_backup_dir
    
    # Create timestamp for backup
    local timestamp=$(date +"%Y-%m-%dT%H-%M-%S")
    
    # Backup baileys_store.json
    if [ -f "$BAILEYS_STORE" ]; then
        local backup_file="${BACKUP_DIR}/baileys_store_backup_${timestamp}.json"
        cp "$BAILEYS_STORE" "$backup_file"
        log_success "Backup created: $backup_file"
    fi
    
    # Backup auth_info directory
    if [ -d "$AUTH_INFO_DIR" ]; then
        local auth_backup="${BACKUP_DIR}/auth_info_backup_${timestamp}.tar.gz"
        tar -czf "$auth_backup" -C "$(dirname "$AUTH_INFO_DIR")" "$(basename "$AUTH_INFO_DIR")"
        log_success "Auth info backup created: $auth_backup"
    fi
    
    # Remove auth_info directory
    if [ -d "$AUTH_INFO_DIR" ]; then
        rm -rf "$AUTH_INFO_DIR"
        log_success "auth_info directory removed"
    fi
    
    # Clear baileys_store.json
    echo '{}' > "$BAILEYS_STORE"
    log_success "baileys_store.json cleared"
    
    log_success "Session cleanup completed successfully!"
    echo
    log_info "Next steps:"
    echo "1. Restart container: $0 --restart"
    echo "2. Monitor logs: $0 --logs"
    echo "3. Scan QR code to re-authenticate"
    echo "4. Bad MAC Error should be resolved"
}

# Start services
start_services() {
    log_info "Starting WhatsApp services..."
    
    if [ -f "$SESSION_COMPOSE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" -f "$SESSION_COMPOSE_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    log_success "Services started"
    
    # Wait a moment and check status
    sleep 3
    show_status
}

# Stop services
stop_services() {
    log_info "Stopping WhatsApp services..."
    
    if [ -f "$SESSION_COMPOSE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" -f "$SESSION_COMPOSE_FILE" down
    else
        docker-compose -f "$COMPOSE_FILE" down
    fi
    
    log_success "Services stopped"
}

# Restart services
restart_services() {
    log_info "Restarting WhatsApp services..."
    stop_services
    sleep 2
    start_services
}

# Show container status
show_status() {
    log_info "Container Status:"
    docker-compose ps
    
    if check_container && [ "$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME")" = "running" ]; then
        echo
        log_info "Recent logs:"
        docker logs --tail 10 "$CONTAINER_NAME"
    fi
}

# Show logs
show_logs() {
    if check_container; then
        log_info "Showing logs for $CONTAINER_NAME..."
        docker logs -f "$CONTAINER_NAME"
    else
        log_error "Container not found"
        exit 1
    fi
}

# Execute command in container
exec_container() {
    if check_container; then
        docker exec -it "$CONTAINER_NAME" "$@"
    else
        log_error "Container not found or not running"
        exit 1
    fi
}

# Show help
show_help() {
    cat << EOF
🐳 WhatsApp Docker Session Manager

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  health, check          Check session health status
  clean                  Clean corrupted session files
  start                  Start WhatsApp services
  stop                   Stop WhatsApp services
  restart                Restart WhatsApp services
  status                 Show container status
  logs                   Show container logs (follow mode)
  exec <command>         Execute command in container
  help                   Show this help message

Environment Variables:
  CONTAINER_NAME         Container name (default: whatsapp-api)

Examples:
  $0 health              # Check session health
  $0 clean               # Clean corrupted sessions
  $0 restart             # Restart services
  $0 logs                # Follow logs
  $0 exec bash           # Open shell in container

For Bad MAC Error resolution:
  1. $0 clean            # Clean corrupted session
  2. $0 restart          # Restart services
  3. Scan QR code        # Re-authenticate

EOF
}

# Main script logic
main() {
    check_docker
    
    case "${1:-help}" in
        "health"|"check")
            check_session_health
            ;;
        "clean")
            clean_session
            ;;
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "exec")
            shift
            exec_container "$@"
            ;;
        "help"|"--help"|"")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"