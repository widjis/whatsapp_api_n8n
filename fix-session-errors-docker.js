#!/usr/bin/env node

/**
 * WhatsApp Session Error Fix for Docker Environment
 * Handles "Bad MAC Error" and session corruption in containerized deployment
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const CONTAINER_NAME = 'whatsapp-api'; // Default container name
const AUTH_INFO_PATH = '/app/auth_info';
const BAILEYS_STORE_PATH = '/app/baileys_store.json';

class DockerSessionManager {
    constructor(containerName = CONTAINER_NAME) {
        this.containerName = containerName;
    }

    async checkContainerExists() {
        try {
            execSync(`docker ps -q -f name=${this.containerName}`, { stdio: 'pipe' });
            return true;
        } catch (error) {
            console.log(`❌ Container '${this.containerName}' not found or not running`);
            return false;
        }
    }

    async executeInContainer(command) {
        try {
            const result = execSync(`docker exec ${this.containerName} ${command}`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return result;
        } catch (error) {
            throw new Error(`Docker command failed: ${error.message}`);
        }
    }

    async checkSessionHealth() {
        console.log('🔍 Checking WhatsApp session health in Docker container...');
        
        if (!await this.checkContainerExists()) {
            return;
        }

        try {
            // Check auth_info directory
            const authInfoExists = await this.executeInContainer(`test -d ${AUTH_INFO_PATH} && echo "exists" || echo "missing"`);
            console.log(`📁 auth_info directory: ${authInfoExists.trim().toUpperCase()}`);
            
            if (authInfoExists.trim() === 'exists') {
                const authFiles = await this.executeInContainer(`find ${AUTH_INFO_PATH} -name "*.json" | wc -l`);
                console.log(`   - Contains ${authFiles.trim()} session files`);
                
                // List some session files
                const sessionFiles = await this.executeInContainer(`find ${AUTH_INFO_PATH} -name "*.json" | head -10`);
                if (sessionFiles.trim()) {
                    console.log('   - Sample files:');
                    sessionFiles.trim().split('\n').forEach(file => {
                        console.log(`     - ${path.basename(file)}`);
                    });
                }
            }

            // Check baileys_store.json
            const storeExists = await this.executeInContainer(`test -f ${BAILEYS_STORE_PATH} && echo "exists" || echo "missing"`);
            console.log(`📄 baileys_store.json: ${storeExists.trim().toUpperCase()}`);
            
            if (storeExists.trim() === 'exists') {
                const storeSize = await this.executeInContainer(`stat -c%s ${BAILEYS_STORE_PATH}`);
                console.log(`   - Size: ${parseInt(storeSize.trim()).toLocaleString()} bytes`);
            }

            console.log('\n💡 If experiencing "Bad MAC Error", run: node fix-session-errors-docker.js --clean');
            
        } catch (error) {
            console.error('❌ Error checking session health:', error.message);
        }
    }

    async cleanupSession() {
        console.log('🧹 Starting WhatsApp session cleanup in Docker container...');
        
        if (!await this.checkContainerExists()) {
            return;
        }

        try {
            // Backup baileys_store.json
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `/app/baileys_store_backup_${timestamp}.json`;
            
            console.log('💾 Backing up baileys_store.json...');
            await this.executeInContainer(`cp ${BAILEYS_STORE_PATH} ${backupPath} 2>/dev/null || echo "No store file to backup"`);
            console.log(`✅ Backup created: ${backupPath}`);

            // Remove auth_info directory
            console.log('📁 Removing auth_info directory...');
            await this.executeInContainer(`rm -rf ${AUTH_INFO_PATH}`);
            console.log('✅ auth_info directory removed');

            // Clear baileys_store.json
            console.log('🗑️  Clearing baileys_store.json...');
            await this.executeInContainer(`echo '{}' > ${BAILEYS_STORE_PATH}`);
            console.log('✅ baileys_store.json cleared');

            console.log('\n🎉 Session cleanup completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('1. Restart the Docker container: docker restart ' + this.containerName);
            console.log('2. Check logs: docker logs -f ' + this.containerName);
            console.log('3. Scan the QR code to re-authenticate');
            console.log('4. The "Bad MAC Error" should be resolved');
            
        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
        }
    }

    async restartContainer() {
        console.log('🔄 Restarting Docker container...');
        
        try {
            execSync(`docker restart ${this.containerName}`, { stdio: 'inherit' });
            console.log('✅ Container restarted successfully');
            
            console.log('📋 Monitoring container startup...');
            setTimeout(() => {
                try {
                    execSync(`docker logs --tail 20 ${this.containerName}`, { stdio: 'inherit' });
                } catch (error) {
                    console.log('Could not fetch logs:', error.message);
                }
            }, 3000);
            
        } catch (error) {
            console.error('❌ Error restarting container:', error.message);
        }
    }
}

// CLI Interface
const args = process.argv.slice(2);
const containerName = process.env.CONTAINER_NAME || args.find(arg => arg.startsWith('--container='))?.split('=')[1] || CONTAINER_NAME;
const sessionManager = new DockerSessionManager(containerName);

if (args.includes('--clean')) {
    await sessionManager.cleanupSession();
} else if (args.includes('--restart')) {
    await sessionManager.restartContainer();
} else if (args.includes('--help')) {
    console.log(`
🐳 WhatsApp Session Error Fix for Docker

Usage:
  node fix-session-errors-docker.js [options]

Options:
  --clean                    Clean corrupted session files
  --restart                  Restart the Docker container
  --container=<name>         Specify container name (default: ${CONTAINER_NAME})
  --help                     Show this help message

Environment Variables:
  CONTAINER_NAME            Override default container name

Examples:
  node fix-session-errors-docker.js
  node fix-session-errors-docker.js --clean
  node fix-session-errors-docker.js --clean --container=my-whatsapp-api
  CONTAINER_NAME=my-app node fix-session-errors-docker.js --clean
`);
} else {
    await sessionManager.checkSessionHealth();
}