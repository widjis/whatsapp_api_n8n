# 🐳 Docker Session Management for WhatsApp API

This guide explains how to handle "Bad MAC Error" and session corruption issues in Docker environments.

## 🚨 Problem: Bad MAC Error in Docker

When running the WhatsApp API in Docker containers, you might encounter:
- "Bad MAC Error" messages in logs
- Failed message sending/receiving
- Session corruption after container restarts
- Authentication failures

## 🛠️ Solution: Docker Session Management Tools

### Quick Fix for Bad MAC Error

```bash
# 1. Check session health
./docker-session-manager.sh health

# 2. Clean corrupted sessions
./docker-session-manager.sh clean

# 3. Restart services
./docker-session-manager.sh restart

# 4. Monitor logs for QR code
./docker-session-manager.sh logs
```

## 📁 Available Tools

### 1. `docker-session-manager.sh` - Main Management Script

**Primary tool for Docker session management:**

```bash
# Check session health and container status
./docker-session-manager.sh health

# Clean corrupted session files
./docker-session-manager.sh clean

# Start/stop/restart services
./docker-session-manager.sh start
./docker-session-manager.sh stop
./docker-session-manager.sh restart

# Monitor container status and logs
./docker-session-manager.sh status
./docker-session-manager.sh logs

# Execute commands in container
./docker-session-manager.sh exec bash
./docker-session-manager.sh exec "ls -la /app/auth_info"
```

### 2. `fix-session-errors-docker.js` - Node.js Docker Tool

**For programmatic Docker session management:**

```bash
# Check session health in container
node fix-session-errors-docker.js

# Clean sessions in specific container
node fix-session-errors-docker.js --clean

# Restart container
node fix-session-errors-docker.js --restart

# Use custom container name
node fix-session-errors-docker.js --clean --container=my-whatsapp-api

# Set container name via environment
CONTAINER_NAME=my-app node fix-session-errors-docker.js --clean
```

### 3. Enhanced Docker Compose

**Use the enhanced compose file for better session management:**

```bash
# Start with session management features
docker-compose -f docker-compose.yml -f docker-compose.session-fix.yml up -d

# Include session monitoring
docker-compose -f docker-compose.yml -f docker-compose.session-fix.yml --profile monitoring up -d

# Stop services
docker-compose -f docker-compose.yml -f docker-compose.session-fix.yml down
```

### 4. Enhanced Dockerfile

**Build with session management capabilities:**

```bash
# Build enhanced image
docker build -f Dockerfile.session-enhanced -t whatsapp-api:session-enhanced .

# Run with session management
docker run -d \
  --name whatsapp-api \
  -p 8192:8192 \
  -v $(pwd)/auth_info:/app/auth_info \
  -v $(pwd)/baileys_store.json:/app/baileys_store.json \
  -v $(pwd)/session_backups:/app/session_backups \
  -e SESSION_CLEANUP_ENABLED=true \
  -e ENABLE_ERROR_MONITORING=true \
  whatsapp-api:session-enhanced
```

## 🔧 Configuration Options

### Environment Variables

```bash
# Session management
SESSION_CLEANUP_ENABLED=true          # Enable automatic cleanup
SESSION_ERROR_THRESHOLD=10            # Error count before cleanup
AUTO_CLEANUP_ON_ERROR=false           # Auto-cleanup on Bad MAC error
ENABLE_ERROR_MONITORING=true          # Monitor logs for errors

# Container identification
CONTAINER_NAME=whatsapp-api           # Default container name
```

### Volume Mapping

```yaml
volumes:
  - ./auth_info:/app/auth_info                    # Session files
  - ./baileys_store.json:/app/baileys_store.json  # Store data
  - ./session_backups:/app/session_backups        # Backup location
  - ./logs:/app/logs                              # Application logs
```

## 🚀 Step-by-Step Resolution Guide

### When Bad MAC Error Occurs:

1. **Identify the Problem**
   ```bash
   ./docker-session-manager.sh logs | grep "Bad MAC"
   ```

2. **Check Session Health**
   ```bash
   ./docker-session-manager.sh health
   ```

3. **Clean Corrupted Sessions**
   ```bash
   ./docker-session-manager.sh clean
   ```

4. **Restart Services**
   ```bash
   ./docker-session-manager.sh restart
   ```

5. **Monitor Startup**
   ```bash
   ./docker-session-manager.sh logs
   ```

6. **Re-authenticate**
   - Look for QR code in logs
   - Scan with WhatsApp mobile app
   - Wait for "connection.update: open" message

### For Persistent Issues:

1. **Complete Reset**
   ```bash
   # Stop services
   ./docker-session-manager.sh stop
   
   # Remove all session data
   rm -rf auth_info/
   echo '{}' > baileys_store.json
   
   # Start fresh
   ./docker-session-manager.sh start
   ```

2. **Check Container Resources**
   ```bash
   docker stats whatsapp-api
   docker exec whatsapp-api df -h
   ```

3. **Verify Network Connectivity**
   ```bash
   docker exec whatsapp-api ping -c 3 web.whatsapp.com
   ```

## 📊 Health Monitoring

### Built-in Health Checks

The enhanced Docker setup includes automatic health checks:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' whatsapp-api

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' whatsapp-api
```

### Manual Health Verification

```bash
# Check if service is responding
curl -f http://localhost:8192/health

# Verify container processes
docker exec whatsapp-api ps aux

# Check port binding
docker port whatsapp-api
```

## 🔍 Troubleshooting

### Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Bad MAC Error | Decryption failures, message send errors | `./docker-session-manager.sh clean` |
| Container Won't Start | Exit code 1, startup errors | Check logs, verify volumes |
| QR Code Not Appearing | No authentication prompt | Restart container, check logs |
| Session Not Persisting | Re-authentication after restart | Verify volume mounts |
| High Memory Usage | Container performance issues | Clean old session files |

### Debug Commands

```bash
# Container information
docker inspect whatsapp-api

# Resource usage
docker stats whatsapp-api

# File system check
docker exec whatsapp-api ls -la /app/

# Process list
docker exec whatsapp-api ps aux

# Network connectivity
docker exec whatsapp-api netstat -tlnp
```

## 📝 Best Practices

1. **Regular Backups**
   - Session files are automatically backed up before cleanup
   - Keep backups in persistent storage
   - Test restore procedures

2. **Monitoring**
   - Use health checks to monitor service status
   - Set up log monitoring for Bad MAC errors
   - Monitor container resource usage

3. **Volume Management**
   - Use named volumes for production
   - Ensure proper permissions on mounted directories
   - Regular cleanup of old backup files

4. **Security**
   - Protect session files with appropriate permissions
   - Use secrets management for sensitive data
   - Regular security updates for base images

## 🆘 Emergency Recovery

If all else fails:

```bash
# Nuclear option - complete reset
docker-compose down
docker volume prune
rm -rf auth_info/ session_backups/
echo '{}' > baileys_store.json
docker-compose up -d

# Then re-authenticate with QR code
```

## 📞 Support

For additional help:
1. Check the main project journal: `doc/journal.md`
2. Review container logs: `./docker-session-manager.sh logs`
3. Verify session health: `./docker-session-manager.sh health`
4. Test with basic functionality after cleanup

---

**Note**: Always backup your session files before performing cleanup operations. The tools provided automatically create backups, but manual backups are recommended for critical deployments.