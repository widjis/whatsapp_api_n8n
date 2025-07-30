# Production Deployment Guide for LID Resolver

This guide explains how to deploy the WhatsApp LID (Linked ID) resolver system to production and build real mappings from actual WhatsApp traffic.

## Current Status
✅ **System is ready for production** - Currently has 0 test mappings (clean state)

## Step-by-Step Production Deployment

### 1. Clear Test Data (✅ Already Done)

Your system currently shows:
```json
{
  "totalMappings": 0,
  "totalPushNames": 0,
  "totalJids": 0
}
```

**If you had test data, you would clear it with:**
```bash
# API method (recommended)
curl -X POST http://localhost:8192/api/lid-resolver/clear

# Or manually delete the file
rm lid_phone_mappings.json
```

### 2. Deploy to Production

#### A. Environment Setup
```bash
# Ensure production environment variables
export NODE_ENV=production
export WHATSAPP_SESSION_PATH=/path/to/production/session

# Start the server
node index.js
```

#### B. Verify Services
```bash
# Check server status
curl http://localhost:8192/health

# Check LID resolver stats
curl http://localhost:8192/api/lid-resolver/stats
```

### 3. Monitor Mapping Growth

#### A. Real-time Monitoring Commands
```bash
# Check current mapping count
curl -s http://localhost:8192/api/lid-resolver/stats | jq '.stats.totalMappings'

# View all current mappings
curl -s http://localhost:8192/api/lid-resolver/mappings | jq

# Monitor server logs for new mappings
tail -f server.log | grep "LID Mapping created"
```

#### B. Expected Growth Pattern
- **Hour 1-6**: 0-5 mappings (initial contacts)
- **Day 1**: 10-50 mappings (active users)
- **Week 1**: 50-200 mappings (regular participants)
- **Month 1**: 200+ mappings (full user base)

#### C. Monitoring Script
Create `monitor_mappings.sh`:
```bash
#!/bin/bash
while true; do
    COUNT=$(curl -s http://localhost:8192/api/lid-resolver/stats | jq -r '.stats.totalMappings')
    echo "$(date): $COUNT LID mappings"
    sleep 300  # Check every 5 minutes
done
```

### 4. Backup Mappings

#### A. Automatic Backup Script
Create `backup_mappings.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups/lid_mappings"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup the mappings file
cp lid_phone_mappings.json "$BACKUP_DIR/lid_mappings_$DATE.json"

# Export via API (includes metadata)
curl -s http://localhost:8192/api/lid-resolver/mappings > "$BACKUP_DIR/lid_export_$DATE.json"

echo "Backup completed: $DATE"
```

#### B. Schedule Regular Backups
```bash
# Add to crontab for daily backups at 2 AM
crontab -e
# Add this line:
0 2 * * * /path/to/backup_mappings.sh
```

#### C. Restore from Backup
```bash
# Stop the server
pkill -f "node index.js"

# Restore mappings file
cp /path/to/backups/lid_mappings/lid_mappings_YYYYMMDD_HHMMSS.json lid_phone_mappings.json

# Restart server
node index.js
```

## How Real Mappings Are Built

### Automatic Detection Methods

1. **Message Processing**: Every incoming WhatsApp message is analyzed
   - Extracts sender's JID and pushName
   - Links LID format JIDs to phone numbers via shared pushNames

2. **Contact Updates**: When contacts are synced
   - Maps known contacts to their LIDs
   - Updates existing mappings with new information

3. **Group Metadata**: From group participant lists
   - Discovers LID ↔ phone relationships
   - Cross-references with pushName data

### Manual Mapping (Emergency)

For critical LIDs that need immediate resolution:
```bash
# Force a specific mapping
curl -X POST http://localhost:8192/api/lid-resolver/force-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "lidJid": "123456789012345@lid",
    "phoneJid": "6281234567890@s.whatsapp.net",
    "pushName": "John Doe"
  }'
```

## Production Checklist

- [ ] ✅ Test data cleared (0 mappings)
- [ ] Server running in production environment
- [ ] Monitoring script deployed
- [ ] Backup script configured
- [ ] Cron job for daily backups set
- [ ] Log rotation configured
- [ ] Health check endpoints verified

## Troubleshooting

### Low Mapping Growth
```bash
# Check if message processing is working
grep "Processing message for LID" server.log

# Verify pushName extraction
grep "pushName" server.log | tail -10
```

### Mapping Conflicts
```bash
# Check for duplicate mappings
curl -s http://localhost:8192/api/lid-resolver/stats | jq '.stats.mappings[] | select(.conflicts > 0)'
```

### Performance Issues
```bash
# Monitor memory usage
ps aux | grep "node index.js"

# Check mapping file size
ls -lh lid_phone_mappings.json
```

## API Endpoints for Production

- `GET /api/lid-resolver/stats` - Current statistics
- `GET /api/lid-resolver/mappings` - All mappings
- `GET /api/lid-resolver/resolve/:jid` - Resolve specific LID
- `POST /api/lid-resolver/force-mapping` - Manual mapping
- `POST /api/lid-resolver/clear` - Clear all mappings (use with caution)

## Success Metrics

- **Mapping Coverage**: >80% of active LIDs resolved
- **Resolution Speed**: <100ms average response time
- **Data Persistence**: Zero mapping loss incidents
- **Growth Rate**: Steady increase in mapping count

Your system is now ready for production deployment! 🚀