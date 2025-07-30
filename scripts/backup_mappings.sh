#!/bin/bash

# LID Mappings Backup Script
# Creates backups of LID-to-phone mappings with rotation

SERVER_URL="http://localhost:8192"
BACKUP_DIR="./backups/lid_mappings"
MAX_BACKUPS=30  # Keep 30 days of backups
DATE=$(date +%Y%m%d_%H%M%S)
SOURCE_FILE="lid_phone_mappings.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Starting LID Mappings Backup...${NC}"
echo "Date: $(date)"
echo "Backup directory: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Cannot create backup directory: $BACKUP_DIR${NC}"
    exit 1
fi

# Function to get current stats
get_mapping_count() {
    curl -s "$SERVER_URL/api/lid-resolver/stats" 2>/dev/null | jq -r '.stats.totalMappings // 0'
}

# Check server connectivity
echo -e "${BLUE}📡 Checking server connectivity...${NC}"
MAPPING_COUNT=$(get_mapping_count)
if [ "$MAPPING_COUNT" = "0" ] && ! curl -s "$SERVER_URL/api/lid-resolver/stats" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  WARNING: Cannot connect to server at $SERVER_URL${NC}"
    echo "Proceeding with file-based backup only..."
    SERVER_AVAILABLE=false
else
    echo -e "${GREEN}✅ Server connected - Found $MAPPING_COUNT mappings${NC}"
    SERVER_AVAILABLE=true
fi

# Backup 1: Copy the mappings file (if exists)
if [ -f "$SOURCE_FILE" ]; then
    echo -e "${BLUE}📁 Backing up mappings file...${NC}"
    cp "$SOURCE_FILE" "$BACKUP_DIR/lid_mappings_file_$DATE.json"
    if [ $? -eq 0 ]; then
        FILE_SIZE=$(ls -lh "$SOURCE_FILE" | awk '{print $5}')
        echo -e "${GREEN}✅ File backup completed: $FILE_SIZE${NC}"
    else
        echo -e "${RED}❌ ERROR: File backup failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No mappings file found at: $SOURCE_FILE${NC}"
fi

# Backup 2: Export via API (includes metadata)
if [ "$SERVER_AVAILABLE" = true ]; then
    echo -e "${BLUE}🌐 Exporting via API...${NC}"
    API_BACKUP="$BACKUP_DIR/lid_export_api_$DATE.json"
    
    # Get full export with stats
    {
        echo '{'
        echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",';
        echo '  "backup_type": "api_export",';
        echo '  "stats": ';
        curl -s "$SERVER_URL/api/lid-resolver/stats" | jq '.stats';
        echo '  ,"mappings": ';
        curl -s "$SERVER_URL/api/lid-resolver/mappings";
        echo '}'
    } > "$API_BACKUP"
    
    if [ $? -eq 0 ] && [ -s "$API_BACKUP" ]; then
        API_SIZE=$(ls -lh "$API_BACKUP" | awk '{print $5}')
        echo -e "${GREEN}✅ API export completed: $API_SIZE${NC}"
    else
        echo -e "${RED}❌ ERROR: API export failed${NC}"
        rm -f "$API_BACKUP"
    fi
fi

# Backup 3: Create summary report
echo -e "${BLUE}📊 Creating backup summary...${NC}"
SUMMARY_FILE="$BACKUP_DIR/backup_summary_$DATE.txt"
{
    echo "LID Mappings Backup Summary"
    echo "==========================="
    echo "Date: $(date)"
    echo "Backup ID: $DATE"
    echo ""
    echo "Files Created:"
    ls -la "$BACKUP_DIR"/*_$DATE.* 2>/dev/null | awk '{print "  " $9 " (" $5 " bytes)"}';
    echo ""
    if [ "$SERVER_AVAILABLE" = true ]; then
        echo "Server Stats:"
        echo "  Total Mappings: $MAPPING_COUNT"
        echo "  Server URL: $SERVER_URL"
        echo "  Connection: ✅ Success"
    else
        echo "Server Stats:"
        echo "  Connection: ❌ Failed"
        echo "  Backup Mode: File-only"
    fi
    echo ""
    echo "Backup completed at: $(date)"
} > "$SUMMARY_FILE"

echo -e "${GREEN}✅ Summary created: $SUMMARY_FILE${NC}"

# Cleanup old backups
echo -e "${BLUE}🧹 Cleaning up old backups (keeping $MAX_BACKUPS)...${NC}"
OLD_BACKUPS=$(ls -t "$BACKUP_DIR"/lid_mappings_file_*.json 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)))
if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        BASE_DATE=$(basename "$file" | sed 's/lid_mappings_file_\(.*\)\.json/\1/')
        echo -e "${YELLOW}🗑️  Removing old backup set: $BASE_DATE${NC}"
        rm -f "$BACKUP_DIR"/*_"$BASE_DATE".*
    done
else
    echo -e "${GREEN}✅ No old backups to clean${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo -e "${BLUE}📁 Backup location: $BACKUP_DIR${NC}"
echo -e "${BLUE}🏷️  Backup ID: $DATE${NC}"
if [ "$SERVER_AVAILABLE" = true ]; then
    echo -e "${BLUE}📊 Mappings backed up: $MAPPING_COUNT${NC}"
fi
echo ""
echo "To restore from this backup:"
echo "  cp $BACKUP_DIR/lid_mappings_file_$DATE.json $SOURCE_FILE"
echo "  # Then restart the server"
echo ""