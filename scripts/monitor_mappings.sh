#!/bin/bash

# LID Mapping Monitor Script
# Monitors the growth of LID-to-phone mappings in real-time

SERVER_URL="http://localhost:8192"
LOG_FILE="mapping_monitor.log"

echo "Starting LID Mapping Monitor..."
echo "Server: $SERVER_URL"
echo "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo ""

# Function to get current stats
get_stats() {
    curl -s "$SERVER_URL/api/lid-resolver/stats" 2>/dev/null | jq -r '.stats.totalMappings // "ERROR"'
}

# Function to log with timestamp
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Initial check
INITIAL_COUNT=$(get_stats)
if [ "$INITIAL_COUNT" = "ERROR" ]; then
    log_message "❌ ERROR: Cannot connect to server at $SERVER_URL"
    exit 1
fi

log_message "🚀 Monitor started - Initial mappings: $INITIAL_COUNT"

# Monitor loop
PREV_COUNT=$INITIAL_COUNT
while true; do
    sleep 300  # Check every 5 minutes
    
    CURRENT_COUNT=$(get_stats)
    
    if [ "$CURRENT_COUNT" = "ERROR" ]; then
        log_message "⚠️  WARNING: Server connection failed"
        continue
    fi
    
    if [ "$CURRENT_COUNT" -gt "$PREV_COUNT" ]; then
        DIFF=$((CURRENT_COUNT - PREV_COUNT))
        log_message "📈 NEW MAPPINGS: +$DIFF (Total: $CURRENT_COUNT)"
    elif [ "$CURRENT_COUNT" -lt "$PREV_COUNT" ]; then
        DIFF=$((PREV_COUNT - CURRENT_COUNT))
        log_message "📉 MAPPINGS DECREASED: -$DIFF (Total: $CURRENT_COUNT)"
    else
        log_message "📊 Stable: $CURRENT_COUNT mappings"
    fi
    
    PREV_COUNT=$CURRENT_COUNT
done