# WhatsApp Number Change Tool

This tool provides a fast and easy way to change your WhatsApp number for the API service.

## Quick Start

### Option 1: Use the Shell Script (Recommended)
```bash
./change-number.sh
```

### Option 2: Use Node.js Directly
```bash
node change_number.js
```

## Features

### 🔄 **Change Number Options**
1. **Change to new number** - Clears authentication but keeps message history
2. **Fresh start** - Clears both authentication and message history
3. **Restore from backup** - Restore previous authentication/messages
4. **List backups** - View all available backups
5. **Just clear authentication** - Only clear auth, keep everything else

### 💾 **Backup System**
- Automatic backup creation before changes
- Timestamped backups in `./backups/` directory
- Backup includes:
  - Authentication state (`auth_info/`)
  - Message history (`baileys_store.json`)

### 🛡️ **Safety Features**
- Automatically stops running WhatsApp service
- Confirms actions before execution
- Creates backups before destructive operations
- Lists available backups with creation dates

## Usage Scenarios

### Scenario 1: Change to New Number (Keep Messages)
```bash
./change-number.sh
# Choose option 1
# Creates backup → Clears auth → Keeps message history
# Scan QR with new number
```

### Scenario 2: Complete Fresh Start
```bash
./change-number.sh
# Choose option 2
# Creates backup → Clears auth + messages
# Completely clean slate
```

### Scenario 3: Restore Previous Number
```bash
./change-number.sh
# Choose option 3
# Select from available backups
# Restores auth + messages
```

## File Structure

```
├── change_number.js      # Main Node.js script
├── change-number.sh      # Shell wrapper script
├── auth_info/           # WhatsApp authentication (cleared during change)
├── baileys_store.json   # Message history (optional to keep)
└── backups/            # Automatic backups
    ├── backup_2024-01-01T10-00-00-000Z/
    │   ├── auth_info/
    │   └── baileys_store.json
    └── backup_2024-01-02T15-30-00-000Z/
        ├── auth_info/
        └── baileys_store.json
```

## Manual Process (Advanced)

If you prefer manual control:

1. **Stop the service:**
   ```bash
   pkill -f "node index.js"
   ```

2. **Backup current state (optional):**
   ```bash
   cp -r auth_info backups/manual_backup_auth_$(date +%Y%m%d_%H%M%S)
   cp baileys_store.json backups/manual_backup_store_$(date +%Y%m%d_%H%M%S).json
   ```

3. **Clear authentication:**
   ```bash
   rm -rf auth_info
   ```

4. **Clear message history (optional):**
   ```bash
   rm baileys_store.json
   ```

5. **Start service:**
   ```bash
   node index.js
   ```

6. **Scan QR code** with your new WhatsApp number

## Troubleshooting

### Service Won't Stop
```bash
# Force kill all node processes
pkill -9 node

# Or find specific process
ps aux | grep "node index.js"
kill -9 <PID>
```

### Permission Denied
```bash
# Make scripts executable
chmod +x change_number.js
chmod +x change-number.sh
```

### Backup Restoration Failed
- Check if backup directory exists
- Verify backup contains `auth_info/` and/or `baileys_store.json`
- Ensure proper permissions on backup files

### QR Code Not Appearing
- Ensure `auth_info/` directory is completely removed
- Check console output for errors
- Verify WhatsApp Web is not already connected on another device

## Security Notes

- Backups contain sensitive authentication data
- Store backups securely
- Consider encrypting backup directory for production use
- Regularly clean old backups to save space

## Integration with Existing System

The tool integrates seamlessly with your existing WhatsApp API:
- Preserves all configuration files
- Maintains technician contacts
- Keeps alarm settings
- Preserves custom templates
- Only affects authentication and optionally message history

## API Usage

You can also use the functions programmatically:

```javascript
const {
  createBackup,
  clearAuthentication,
  clearMessageHistory,
  restoreBackup,
  listBackups,
  checkIfServiceRunning,
  stopService
} = require('./change_number.js');

// Example: Programmatic number change
async function changeNumber() {
  if (checkIfServiceRunning()) {
    stopService();
  }
  
  const backupPath = createBackup();
  console.log(`Backup created: ${backupPath}`);
  
  clearAuthentication();
  console.log('Ready for new number!');
}
```