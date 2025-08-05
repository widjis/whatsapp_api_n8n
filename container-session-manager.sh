#!/bin/bash

# Container Session Manager
# Internal script for managing sessions within the container

AUTH_INFO_DIR="/app/auth_info"
BAILEYS_STORE="/app/baileys_store.json"
BACKUP_DIR="/app/session_backups"

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Health check function
health_check() {
    # Check if the main process is running
    if ! pgrep -f "node index.js" > /dev/null; then
        log_error "Main Node.js process not running"
        exit 1
    fi
    
    # Check if port 8192 is listening
    if ! netstat -ln | grep -q ":8192 "; then
        log_error "Port 8192 not listening"
        exit 1
    fi
    
    # Try to connect to the health endpoint
    if ! curl -f http://localhost:8192/health > /dev/null 2>&1; then
        log_error "Health endpoint not responding"
        exit 1
    fi
    
    log_info "Health check passed"
    exit 0
}

# Session cleanup function
cleanup_session() {
    log_info "Starting session cleanup..."
    
    # Create backup
    timestamp=$(date +"%Y-%m-%dT%H-%M-%S")
    
    if [ -f "$BAILEYS_STORE" ]; then
        cp "$BAILEYS_STORE" "${BACKUP_DIR}/baileys_store_backup_${timestamp}.json"
        log_info "Backup created"
    fi
    
    # Remove auth_info
    if [ -d "$AUTH_INFO_DIR" ]; then
        rm -rf "$AUTH_INFO_DIR"
        log_info "auth_info directory removed"
    fi
    
    # Clear baileys_store
    echo '{}' > "$BAILEYS_STORE"
    log_info "baileys_store.json cleared"
    
    log_info "Session cleanup completed"
}

# Monitor for Bad MAC errors
monitor_errors() {
    log_info "Starting error monitoring..."
    
    # Monitor logs for Bad MAC errors
    tail -f /app/logs/app.log 2>/dev/null | while read line; do
        if echo "$line" | grep -q "Bad MAC"; then
            log_error "Bad MAC Error detected: $line"
            
            # Optional: Auto-cleanup on error threshold
            if [ "${AUTO_CLEANUP_ON_ERROR:-false}" = "true" ]; then
                log_info "Auto-cleanup triggered"
                cleanup_session
                # Signal main process to restart
                pkill -SIGUSR1 -f "node index.js"
            fi
        fi
    done
}

case "$1" in
    "health")
        health_check
        ;;
    "cleanup")
        cleanup_session
        ;;
    "monitor")
        monitor_errors
        ;;
    *)
        echo "Usage: $0 {health|cleanup|monitor}"
        exit 1
        ;;
esac