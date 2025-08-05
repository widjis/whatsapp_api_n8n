import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fix WhatsApp session errors by cleaning up corrupted session data
 * This script addresses "Bad MAC Error" issues that occur when session state becomes corrupted
 */

const AUTH_DIR = path.join(__dirname, 'auth_info');
const BAILEYS_STORE = path.join(__dirname, 'baileys_store.json');

function cleanupSessionFiles() {
  console.log('🧹 Starting WhatsApp session cleanup...');
  
  try {
    // 1. Remove auth_info directory (contains session keys)
    if (fs.existsSync(AUTH_DIR)) {
      console.log('📁 Removing auth_info directory...');
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      console.log('✅ auth_info directory removed');
    } else {
      console.log('ℹ️  auth_info directory not found');
    }
    
    // 2. Backup and clear baileys_store.json (contains message history and contacts)
    if (fs.existsSync(BAILEYS_STORE)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(__dirname, `baileys_store_backup_${timestamp}.json`);
      
      console.log('💾 Backing up baileys_store.json...');
      fs.copyFileSync(BAILEYS_STORE, backupPath);
      console.log(`✅ Backup created: ${backupPath}`);
      
      console.log('🗑️  Clearing baileys_store.json...');
      fs.writeFileSync(BAILEYS_STORE, '{}');
      console.log('✅ baileys_store.json cleared');
    } else {
      console.log('ℹ️  baileys_store.json not found');
    }
    
    console.log('\n🎉 Session cleanup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your WhatsApp API server');
    console.log('2. Scan the QR code to re-authenticate');
    console.log('3. The "Bad MAC Error" should be resolved');
    
  } catch (error) {
    console.error('❌ Error during session cleanup:', error.message);
    process.exit(1);
  }
}

function showSessionInfo() {
  console.log('📊 WhatsApp Session Information:');
  console.log('================================');
  
  // Check auth_info directory
  if (fs.existsSync(AUTH_DIR)) {
    const authFiles = fs.readdirSync(AUTH_DIR);
    console.log(`📁 auth_info directory: EXISTS (${authFiles.length} files)`);
    authFiles.forEach(file => {
      const filePath = path.join(AUTH_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`);
    });
  } else {
    console.log('📁 auth_info directory: NOT FOUND');
  }
  
  // Check baileys_store.json
  if (fs.existsSync(BAILEYS_STORE)) {
    const stats = fs.statSync(BAILEYS_STORE);
    console.log(`📄 baileys_store.json: EXISTS (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`);
    
    try {
      const content = JSON.parse(fs.readFileSync(BAILEYS_STORE, 'utf8'));
      const keys = Object.keys(content);
      console.log(`   - Contains ${keys.length} top-level keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
    } catch (e) {
      console.log('   - ⚠️  File exists but contains invalid JSON');
    }
  } else {
    console.log('📄 baileys_store.json: NOT FOUND');
  }
  
  console.log('\n💡 If you\'re experiencing "Bad MAC Error", run: node fix-session-errors.js --clean');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--clean') || args.includes('-c')) {
  cleanupSessionFiles();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('WhatsApp Session Error Fix Tool');
  console.log('===============================');
  console.log('');
  console.log('Usage:');
  console.log('  node fix-session-errors.js           Show session information');
  console.log('  node fix-session-errors.js --clean   Clean up corrupted session files');
  console.log('  node fix-session-errors.js --help    Show this help message');
  console.log('');
  console.log('This tool fixes "Bad MAC Error" issues by cleaning corrupted WhatsApp session data.');
} else {
  showSessionInfo();
}