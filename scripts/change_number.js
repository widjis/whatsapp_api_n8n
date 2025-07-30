#!/usr/bin/env node

/**
 * WhatsApp Number Change Script
 * This script helps you quickly change the WhatsApp number by clearing authentication
 * and providing options to backup/restore message history.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const AUTH_DIR = './auth_info';
const BAILEYS_STORE = './baileys_store.json';
const BACKUP_DIR = './backups';

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

function checkIfServiceRunning() {
  try {
    const result = execSync('ps aux | grep "node index.js" | grep -v grep', { encoding: 'utf8' });
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}

function stopService() {
  try {
    log('Stopping WhatsApp service...');
    execSync('pkill -f "node index.js"');
    log('Service stopped successfully.');
    return true;
  } catch (error) {
    log('No running service found or failed to stop.');
    return false;
  }
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  fs.mkdirSync(backupPath, { recursive: true });
  
  // Backup auth_info directory
  if (fs.existsSync(AUTH_DIR)) {
    execSync(`cp -r ${AUTH_DIR} ${path.join(backupPath, 'auth_info')}`);
    log(`Authentication backed up to: ${backupPath}/auth_info`);
  }
  
  // Backup baileys_store.json
  if (fs.existsSync(BAILEYS_STORE)) {
    execSync(`cp ${BAILEYS_STORE} ${path.join(backupPath, 'baileys_store.json')}`);
    log(`Message history backed up to: ${backupPath}/baileys_store.json`);
  }
  
  return backupPath;
}

function clearAuthentication() {
  if (fs.existsSync(AUTH_DIR)) {
    execSync(`rm -rf ${AUTH_DIR}`);
    log('Authentication directory cleared.');
  } else {
    log('No authentication directory found.');
  }
}

function clearMessageHistory() {
  if (fs.existsSync(BAILEYS_STORE)) {
    fs.unlinkSync(BAILEYS_STORE);
    log('Message history cleared.');
  } else {
    log('No message history file found.');
  }
}

function startService() {
  log('Starting WhatsApp service...');
  log('Please check the console for QR code to scan with your new number.');
  execSync('node index.js', { stdio: 'inherit' });
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    log('No backups directory found.');
    return [];
  }
  
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(item => fs.statSync(path.join(BACKUP_DIR, item)).isDirectory())
    .sort((a, b) => b.localeCompare(a)); // Sort by newest first
  
  if (backups.length === 0) {
    log('No backups found.');
    return [];
  }
  
  log('Available backups:');
  backups.forEach((backup, index) => {
    const backupPath = path.join(BACKUP_DIR, backup);
    const stats = fs.statSync(backupPath);
    log(`${index + 1}. ${backup} (Created: ${stats.birthtime.toLocaleString()})`);
  });
  
  return backups;
}

function restoreBackup(backupName) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  if (!fs.existsSync(backupPath)) {
    log(`Backup not found: ${backupName}`);
    return false;
  }
  
  // Restore auth_info
  const authBackupPath = path.join(backupPath, 'auth_info');
  if (fs.existsSync(authBackupPath)) {
    if (fs.existsSync(AUTH_DIR)) {
      execSync(`rm -rf ${AUTH_DIR}`);
    }
    execSync(`cp -r ${authBackupPath} ${AUTH_DIR}`);
    log('Authentication restored.');
  }
  
  // Restore baileys_store.json
  const storeBackupPath = path.join(backupPath, 'baileys_store.json');
  if (fs.existsSync(storeBackupPath)) {
    if (fs.existsSync(BAILEYS_STORE)) {
      fs.unlinkSync(BAILEYS_STORE);
    }
    execSync(`cp ${storeBackupPath} ${BAILEYS_STORE}`);
    log('Message history restored.');
  }
  
  return true;
}

async function main() {
  console.log('=== WhatsApp Number Change Tool ===\n');
  
  const action = await askQuestion(
    'What would you like to do?\n' +
    '1. Change to new number (clear auth + keep messages)\n' +
    '2. Fresh start (clear auth + clear messages)\n' +
    '3. Restore from backup\n' +
    '4. List backups\n' +
    '5. Just clear authentication\n' +
    'Enter choice (1-5): '
  );
  
  switch (action) {
    case '1':
      // Change number but keep message history
      if (checkIfServiceRunning()) {
        stopService();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
      
      const backup1 = await askQuestion('Create backup before changing? (y/n): ');
      if (backup1 === 'y' || backup1 === 'yes') {
        createBackup();
      }
      
      clearAuthentication();
      log('Authentication cleared. Message history preserved.');
      
      const start1 = await askQuestion('Start service now? (y/n): ');
      if (start1 === 'y' || start1 === 'yes') {
        startService();
      } else {
        log('Run "node index.js" when ready to scan QR code with new number.');
      }
      break;
      
    case '2':
      // Fresh start
      if (checkIfServiceRunning()) {
        stopService();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const backup2 = await askQuestion('Create backup before fresh start? (y/n): ');
      if (backup2 === 'y' || backup2 === 'yes') {
        createBackup();
      }
      
      clearAuthentication();
      clearMessageHistory();
      log('Complete fresh start - authentication and message history cleared.');
      
      const start2 = await askQuestion('Start service now? (y/n): ');
      if (start2 === 'y' || start2 === 'yes') {
        startService();
      } else {
        log('Run "node index.js" when ready to scan QR code with new number.');
      }
      break;
      
    case '3':
      // Restore from backup
      const backups = listBackups();
      if (backups.length === 0) {
        break;
      }
      
      const choice = await askQuestion('Enter backup number to restore: ');
      const backupIndex = parseInt(choice) - 1;
      
      if (backupIndex >= 0 && backupIndex < backups.length) {
        if (checkIfServiceRunning()) {
          stopService();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (restoreBackup(backups[backupIndex])) {
          log('Backup restored successfully.');
          
          const start3 = await askQuestion('Start service now? (y/n): ');
          if (start3 === 'y' || start3 === 'yes') {
            startService();
          }
        }
      } else {
        log('Invalid backup selection.');
      }
      break;
      
    case '4':
      // List backups
      listBackups();
      break;
      
    case '5':
      // Just clear authentication
      if (checkIfServiceRunning()) {
        stopService();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      clearAuthentication();
      log('Authentication cleared only.');
      break;
      
    default:
      log('Invalid choice.');
      break;
  }
  
  rl.close();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createBackup,
  clearAuthentication,
  clearMessageHistory,
  restoreBackup,
  listBackups,
  checkIfServiceRunning,
  stopService
};