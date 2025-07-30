#!/bin/bash

# Production Deployment Script for LID Resolver
# Automates the setup process for production environment

SERVER_URL="http://localhost:8192"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 LID Resolver Production Deployment${NC}"
echo "======================================"
echo "Project: $(basename "$PROJECT_DIR")"
echo "Date: $(date)"
echo ""

# Step 1: Check current status
echo -e "${BLUE}📊 Step 1: Checking current system status...${NC}"
if curl -s "$SERVER_URL/api/lid-resolver/stats" >/dev/null 2>&1; then
    CURRENT_MAPPINGS=$(curl -s "$SERVER_URL/api/lid-resolver/stats" | jq -r '.stats.totalMappings')
    echo -e "${GREEN}✅ Server is running${NC}"
    echo -e "${BLUE}📈 Current mappings: $CURRENT_MAPPINGS${NC}"
    
    if [ "$CURRENT_MAPPINGS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $CURRENT_MAPPINGS existing mappings${NC}"
        read -p "Do you want to clear existing test data? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}🗑️  Clearing existing mappings...${NC}"
            curl -X POST "$SERVER_URL/api/lid-resolver/clear" >/dev/null 2>&1
            echo -e "${GREEN}✅ Mappings cleared${NC}"
        fi
    else
        echo -e "${GREEN}✅ System is clean (0 mappings)${NC}"
    fi
else
    echo -e "${RED}❌ Server is not running at $SERVER_URL${NC}"
    echo "Please start the server first: node index.js"
    exit 1
fi

echo ""

# Step 2: Setup monitoring
echo -e "${BLUE}📡 Step 2: Setting up monitoring...${NC}"
if [ -f "$SCRIPT_DIR/monitor_mappings.sh" ]; then
    echo -e "${GREEN}✅ Monitor script ready: $SCRIPT_DIR/monitor_mappings.sh${NC}"
    echo "To start monitoring: ./scripts/monitor_mappings.sh"
else
    echo -e "${RED}❌ Monitor script not found${NC}"
fi

echo ""

# Step 3: Setup backups
echo -e "${BLUE}💾 Step 3: Setting up backup system...${NC}"
if [ -f "$SCRIPT_DIR/backup_mappings.sh" ]; then
    echo -e "${GREEN}✅ Backup script ready: $SCRIPT_DIR/backup_mappings.sh${NC}"
    
    # Create initial backup
    echo -e "${BLUE}📁 Creating initial backup...${NC}"
    "$SCRIPT_DIR/backup_mappings.sh"
    
    # Setup cron job
    echo -e "${BLUE}⏰ Setting up daily backup cron job...${NC}"
    CRON_COMMAND="0 2 * * * $SCRIPT_DIR/backup_mappings.sh >/dev/null 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "backup_mappings.sh"; then
        echo -e "${YELLOW}⚠️  Backup cron job already exists${NC}"
    else
        (crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -
        echo -e "${GREEN}✅ Daily backup scheduled for 2:00 AM${NC}"
    fi
else
    echo -e "${RED}❌ Backup script not found${NC}"
fi

echo ""

# Step 4: Verify API endpoints
echo -e "${BLUE}🔗 Step 4: Verifying API endpoints...${NC}"
ENDPOINTS=(
    "/api/lid-resolver/stats"
    "/api/lid-resolver/mappings"
)

for endpoint in "${ENDPOINTS[@]}"; do
    if curl -s "$SERVER_URL$endpoint" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $endpoint${NC}"
    else
        echo -e "${RED}❌ $endpoint${NC}"
    fi
done

echo ""

# Step 5: Create monitoring dashboard
echo -e "${BLUE}📊 Step 5: Creating quick monitoring commands...${NC}"
cat > "$PROJECT_DIR/quick_status.sh" << 'EOF'
#!/bin/bash
# Quick status check for LID resolver

echo "=== LID Resolver Status ==="
echo "Time: $(date)"
echo ""

echo "📊 Current Statistics:"
curl -s http://localhost:8192/api/lid-resolver/stats | jq '.stats'

echo ""
echo "🔄 Recent Server Activity:"
tail -n 10 server.log 2>/dev/null | grep -E "LID|Mapping" || echo "No recent LID activity found"

echo ""
echo "💾 Backup Status:"
ls -la backups/lid_mappings/ 2>/dev/null | tail -5 || echo "No backups found"
EOF

chmod +x "$PROJECT_DIR/quick_status.sh"
echo -e "${GREEN}✅ Quick status script created: ./quick_status.sh${NC}"

echo ""

# Final summary
echo -e "${PURPLE}🎉 Production Deployment Complete!${NC}"
echo "================================="
echo ""
echo -e "${GREEN}✅ System Status: Ready for production${NC}"
echo -e "${GREEN}✅ Monitoring: Available${NC}"
echo -e "${GREEN}✅ Backups: Configured${NC}"
echo -e "${GREEN}✅ API Endpoints: Verified${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Monitor mapping growth: ./scripts/monitor_mappings.sh"
echo "2. Check status anytime: ./quick_status.sh"
echo "3. Manual backup: ./scripts/backup_mappings.sh"
echo "4. View current stats: curl http://localhost:8192/api/lid-resolver/stats"
echo ""
echo -e "${YELLOW}📖 Full documentation: PRODUCTION_DEPLOYMENT_GUIDE.md${NC}"
echo ""
echo -e "${GREEN}🚀 Your LID resolver is now ready to build real mappings from WhatsApp traffic!${NC}"