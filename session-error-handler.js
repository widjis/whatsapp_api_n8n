import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced session error handler for WhatsApp API
 * Automatically detects and recovers from "Bad MAC Error" and other session corruption issues
 */

class SessionErrorHandler {
  constructor() {
    this.errorCount = 0;
    this.maxErrors = 5; // Maximum consecutive errors before forcing cleanup
    this.errorWindow = 60000; // 1 minute window for error counting
    this.lastErrorTime = 0;
    this.authDir = path.join(__dirname, 'auth_info');
    this.baileysStore = path.join(__dirname, 'baileys_store.json');
  }

  /**
   * Handle session errors and determine if cleanup is needed
   * @param {Error} error - The error object
   * @returns {boolean} - Whether cleanup was performed
   */
  handleSessionError(error) {
    const errorMessage = error.message || error.toString();
    const isBadMacError = errorMessage.includes('Bad MAC');
    const isSessionError = errorMessage.includes('session') || errorMessage.includes('decrypt');
    
    if (!isBadMacError && !isSessionError) {
      return false; // Not a session error, don't handle
    }

    console.log(`🚨 Session error detected: ${errorMessage}`);
    
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > this.errorWindow) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;
    
    console.log(`📊 Session error count: ${this.errorCount}/${this.maxErrors} (within ${this.errorWindow/1000}s window)`);
    
    // If we've hit the error threshold, perform cleanup
    if (this.errorCount >= this.maxErrors) {
      console.log('🔧 Error threshold reached, performing automatic session cleanup...');
      this.performCleanup();
      this.errorCount = 0; // Reset counter after cleanup
      return true;
    }
    
    return false;
  }

  /**
   * Perform session cleanup
   */
  performCleanup() {
    try {
      console.log('🧹 Starting automatic session cleanup...');
      
      // 1. Backup current session if it exists
      this.backupSession();
      
      // 2. Remove auth_info directory
      if (fs.existsSync(this.authDir)) {
        console.log('📁 Removing corrupted auth_info directory...');
        fs.rmSync(this.authDir, { recursive: true, force: true });
        console.log('✅ auth_info directory removed');
      }
      
      // 3. Clear baileys_store.json but keep a backup
      if (fs.existsSync(this.baileysStore)) {
        console.log('🗑️  Clearing baileys_store.json...');
        fs.writeFileSync(this.baileysStore, '{}');
        console.log('✅ baileys_store.json cleared');
      }
      
      console.log('✅ Automatic session cleanup completed');
      console.log('🔄 Server will need to restart and re-authenticate');
      
    } catch (error) {
      console.error('❌ Error during automatic cleanup:', error.message);
    }
  }

  /**
   * Backup current session data
   */
  backupSession() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'session_backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    try {
      // Backup auth_info directory
      if (fs.existsSync(this.authDir)) {
        const authBackup = path.join(backupDir, `auth_info_${timestamp}`);
        fs.cpSync(this.authDir, authBackup, { recursive: true });
        console.log(`💾 Auth info backed up to: ${authBackup}`);
      }
      
      // Backup baileys_store.json
      if (fs.existsSync(this.baileysStore)) {
        const storeBackup = path.join(backupDir, `baileys_store_${timestamp}.json`);
        fs.copyFileSync(this.baileysStore, storeBackup);
        console.log(`💾 Baileys store backed up to: ${storeBackup}`);
      }
      
    } catch (error) {
      console.error('⚠️  Warning: Could not create backup:', error.message);
    }
  }

  /**
   * Check if session files are healthy
   * @returns {object} - Health status object
   */
  checkSessionHealth() {
    const health = {
      authDir: { exists: false, files: 0, healthy: false },
      baileysStore: { exists: false, size: 0, healthy: false },
      overall: false
    };
    
    // Check auth_info directory
    if (fs.existsSync(this.authDir)) {
      const files = fs.readdirSync(this.authDir);
      health.authDir = {
        exists: true,
        files: files.length,
        healthy: files.length > 0 && files.includes('creds.json')
      };
    }
    
    // Check baileys_store.json
    if (fs.existsSync(this.baileysStore)) {
      const stats = fs.statSync(this.baileysStore);
      health.baileysStore = {
        exists: true,
        size: stats.size,
        healthy: stats.size > 2 // More than just '{}'
      };
      
      // Try to parse JSON
      try {
        JSON.parse(fs.readFileSync(this.baileysStore, 'utf8'));
      } catch (e) {
        health.baileysStore.healthy = false;
      }
    }
    
    health.overall = health.authDir.healthy && health.baileysStore.healthy;
    
    return health;
  }

  /**
   * Get session statistics
   * @returns {object} - Session statistics
   */
  getSessionStats() {
    return {
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      lastErrorTime: this.lastErrorTime,
      errorWindow: this.errorWindow,
      timeUntilReset: Math.max(0, this.errorWindow - (Date.now() - this.lastErrorTime))
    };
  }
}

// Export singleton instance
export const sessionErrorHandler = new SessionErrorHandler();

// Export class for custom instances
export { SessionErrorHandler };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const handler = new SessionErrorHandler();
  const health = handler.checkSessionHealth();
  
  console.log('📊 WhatsApp Session Health Check');
  console.log('================================');
  console.log(`Auth Directory: ${health.authDir.healthy ? '✅ Healthy' : '❌ Unhealthy'} (${health.authDir.files} files)`);
  console.log(`Baileys Store: ${health.baileysStore.healthy ? '✅ Healthy' : '❌ Unhealthy'} (${health.baileysStore.size} bytes)`);
  console.log(`Overall Status: ${health.overall ? '✅ Healthy' : '❌ Needs Attention'}`);
  
  if (!health.overall) {
    console.log('\n💡 Recommendation: Run session cleanup to fix issues');
    console.log('   Command: node fix-session-errors.js --clean');
  }
}