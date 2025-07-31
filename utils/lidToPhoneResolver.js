/**
 * LID to Phone Number Resolver Service
 * Automatically maps @lid IDs to real phone numbers using pushName matching
 * Similar to WAHA's approach
 */

const fs = require('fs');
const path = require('path');

class LidToPhoneResolver {
    constructor() {
        this.mappings = new Map(); // lid -> phone mappings
        this.pushNameToJids = new Map(); // pushName -> Set of JIDs
        this.jidToPushName = new Map(); // jid -> pushName
        this.phoneToLid = new Map(); // phone -> lid (reverse mapping)
        this.pendingContacts = new Map(); // phoneNumber -> {pushName, jid, timestamp}
        // Use DATA_DIR environment variable if available, otherwise use default path
        const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
        this.storageFile = path.join(dataDir, 'lid_phone_mappings.json');
        this.sock = null;
        
        // Load existing mappings and track if file existed
        this.mappingFileExists = this.loadMappings();
        
        // Clean up old pending contacts every 30 minutes
        setInterval(() => {
            this.cleanupPendingContacts();
        }, 30 * 60 * 1000);
    }

    /**
     * Clean up old pending contacts
     */
    cleanupPendingContacts() {
        if (!this.pendingContacts) return;
        
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [phoneNumber, contactInfo] of this.pendingContacts.entries()) {
            if (now - contactInfo.timestamp > maxAge) {
                this.pendingContacts.delete(phoneNumber);
            }
        }
    }

    /**
     * Initialize the resolver with WhatsApp socket
     */
    initialize(sock) {
        this.sock = sock;
        console.log('LID to Phone Resolver initialized');
    }

    /**
     * Process incoming message to extract and map JIDs
     */
    processMessage(msg) {
        if (!msg || !msg.key) return;

        const jid = msg.key.remoteJid;
        const fromJid = msg.key.fromMe ? null : msg.key.participant || jid;
        
        if (!fromJid) return;

        // Extract pushName from multiple sources
        const pushName = msg.pushName || msg.verifiedBizName || msg.notify || null;
        
        if (pushName && pushName.trim()) {
            this.addJidMapping(fromJid, pushName.trim());
        }

        // Also process the remote JID if it's different from fromJid
        if (jid && jid !== fromJid) {
            const remotePushName = msg.pushName || msg.verifiedBizName || msg.notify || null;
            if (remotePushName && remotePushName.trim()) {
                this.addJidMapping(jid, remotePushName.trim());
            }
        }

        // Extract contact info from message metadata if available
        if (msg.messageContextInfo && msg.messageContextInfo.deviceListMetadata) {
            // Process device list metadata for additional contact info
            const deviceList = msg.messageContextInfo.deviceListMetadata;
            if (deviceList.senderKeyHash && deviceList.senderTimestamp) {
                // Additional processing can be added here for device metadata
            }
        }

        // Process quoted message if present (for context)
        if (msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) {
            const contextInfo = msg.message.extendedTextMessage.contextInfo;
            if (contextInfo.participant && contextInfo.quotedMessage) {
                // Try to extract pushName from quoted message context
                const quotedPushName = contextInfo.pushName || null;
                if (quotedPushName && quotedPushName.trim()) {
                    this.addJidMapping(contextInfo.participant, quotedPushName.trim());
                }
            }
        }
    }

    /**
     * Process contacts update event
     */
    processContactsUpdate(contacts) {
        if (!Array.isArray(contacts)) return;

        contacts.forEach(contact => {
            if (contact.id && contact.name) {
                this.addJidMapping(contact.id, contact.name);
            }
        });
    }

    /**
     * Add JID mapping based on pushName
     */
    addJidMapping(jid, pushName) {
        if (!jid || !pushName) return;

        // Store JID to pushName mapping
        this.jidToPushName.set(jid, pushName);

        // Get or create set of JIDs for this pushName
        if (!this.pushNameToJids.has(pushName)) {
            this.pushNameToJids.set(pushName, new Set());
        }
        this.pushNameToJids.get(pushName).add(jid);

        // Check if we can create a mapping
        this.attemptMapping(pushName);
    }

    /**
     * Attempt to create LID to phone mapping based on pushName
     */
    attemptMapping(pushName) {
        const jids = this.pushNameToJids.get(pushName);
        if (!jids || jids.size === 0) return;

        let lidJid = null;
        let phoneJid = null;

        // Find LID and phone JIDs with same pushName
        for (const jid of jids) {
            if (jid.includes('@lid')) {
                lidJid = jid;
            } else if (jid.includes('@s.whatsapp.net')) {
                phoneJid = jid;
            }
        }

        // Create mapping if both found
        if (lidJid && phoneJid) {
            const lidId = lidJid.split('@')[0];
            const phoneNumber = phoneJid.split('@')[0];
            
            // Store the mapping
            this.mappings.set(lidId, phoneNumber);
            this.phoneToLid.set(phoneNumber, lidId);
            
            console.log(`✅ LID Mapping created: ${lidId}@lid → ${phoneNumber}@s.whatsapp.net (via pushName: "${pushName}")`);
            
            // Save to file
            this.saveMappings();
        } else if (jids.size >= 1) {
            // Enhanced: Try to create contact mapping even with single JID
            this.attemptContactCreation(pushName, Array.from(jids));
        }
    }

    /**
     * Attempt to create contact mapping from available JIDs
     */
    attemptContactCreation(pushName, jids) {
        if (!pushName || !jids || jids.length === 0) return;

        // Process each JID to see if we can extract useful contact info
        for (const jid of jids) {
            if (jid.includes('@s.whatsapp.net')) {
                // This is a phone number JID
                const phoneNumber = jid.split('@')[0];
                
                // Check if we already have a mapping for this phone
                if (!this.phoneToLid.has(phoneNumber)) {
                    console.log(`📱 Contact detected: ${pushName} → ${phoneNumber} (waiting for LID)`);
                    
                    // Store this contact info for future LID matching
                    if (!this.pendingContacts) {
                        this.pendingContacts = new Map();
                    }
                    this.pendingContacts.set(phoneNumber, {
                        pushName: pushName,
                        jid: jid,
                        timestamp: Date.now()
                    });
                }
            } else if (jid.includes('@lid')) {
                // This is a LID JID
                const lidId = jid.split('@')[0];
                
                // Check if we already have a mapping for this LID
                if (!this.mappings.has(lidId)) {
                    console.log(`🆔 LID detected: ${pushName} → ${lidId} (waiting for phone)`);
                    
                    // Check pending contacts for a match
                    if (this.pendingContacts) {
                        for (const [phoneNumber, contactInfo] of this.pendingContacts.entries()) {
                            if (contactInfo.pushName === pushName) {
                                // Found a match! Create the mapping
                                this.mappings.set(lidId, phoneNumber);
                                this.phoneToLid.set(phoneNumber, lidId);
                                
                                console.log(`✅ Auto-created LID Mapping: ${lidId}@lid → ${phoneNumber}@s.whatsapp.net (via contact: "${pushName}")`);
                                
                                // Remove from pending
                                this.pendingContacts.delete(phoneNumber);
                                
                                // Save to file
                                this.saveMappings();
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Resolve JID to best known phone number
     */
    resolveJid(jid) {
        if (!jid) return null;

        // If it's already a phone number, return as-is
        if (jid.includes('@s.whatsapp.net')) {
            return jid.split('@')[0];
        }

        // If it's a LID, try to resolve
        if (jid.includes('@lid')) {
            const lidId = jid.split('@')[0];
            const phoneNumber = this.mappings.get(lidId);
            return phoneNumber || null;
        }

        // If it's just a number, check if we have it
        if (/^\d+$/.test(jid)) {
            return this.mappings.get(jid) || jid;
        }

        return null;
    }

    /**
     * Get LID for a phone number (reverse lookup)
     */
    getlidForPhone(phoneNumber) {
        return this.phoneToLid.get(phoneNumber) || null;
    }

    /**
     * Get all JIDs associated with a pushName
     */
    getJidsForPushName(pushName) {
        const jids = this.pushNameToJids.get(pushName);
        return jids ? Array.from(jids) : [];
    }

    /**
     * Get pushName for a JID
     */
    getPushNameForJid(jid) {
        return this.jidToPushName.get(jid) || null;
    }

    /**
     * Verify JID using onWhatsApp (optional)
     */
    async verifyJid(jid) {
        if (!this.sock || !jid) return false;

        try {
            const result = await this.sock.onWhatsApp(jid);
            return result && result.length > 0 && result[0].exists;
        } catch (error) {
            console.warn(`Failed to verify JID ${jid}:`, error.message);
            return false;
        }
    }

    /**
     * Get mapping statistics
     */
    getStats() {
        const pendingContactsArray = this.pendingContacts ? 
            Array.from(this.pendingContacts.entries()).map(([phone, info]) => ({
                phone: `${phone}@s.whatsapp.net`,
                pushName: info.pushName,
                waitingTime: Math.round((Date.now() - info.timestamp) / 1000 / 60) + ' minutes'
            })) : [];

        return {
            totalMappings: this.mappings.size,
            totalPushNames: this.pushNameToJids.size,
            totalJids: this.jidToPushName.size,
            pendingContacts: pendingContactsArray.length,
            mappings: Array.from(this.mappings.entries()).map(([lid, phone]) => ({
                lid: lid.includes('@') ? lid : `${lid}@lid`,
                phone: phone.includes('@') ? phone : `${phone}@s.whatsapp.net`,
                pushName: this.jidToPushName.get(`${lid}@lid`) || this.jidToPushName.get(`${phone}@s.whatsapp.net`) || 'Unknown'
            })),
            pendingContactsList: pendingContactsArray
        };
    }

    /**
     * Force create mapping (manual override)
     */
    forceMapping(lidId, phoneNumber, pushName = null) {
        // Extract clean IDs without domain suffixes
        const cleanLidId = lidId.replace('@lid', '');
        const cleanPhoneNumber = phoneNumber.replace('@s.whatsapp.net', '');
        
        this.mappings.set(cleanLidId, cleanPhoneNumber);
        this.phoneToLid.set(cleanPhoneNumber, cleanLidId);
        
        if (pushName) {
            this.addJidMapping(`${cleanLidId}@lid`, pushName);
            this.addJidMapping(`${cleanPhoneNumber}@s.whatsapp.net`, pushName);
        }
        
        console.log(`🔧 Manual mapping created: ${cleanLidId}@lid → ${cleanPhoneNumber}@s.whatsapp.net`);
        this.saveMappings();
    }

    /**
     * Load mappings from file
     */
    loadMappings() {
        try {
            if (fs.existsSync(this.storageFile)) {
                const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
                
                // Load mappings
                if (data.mappings) {
                    this.mappings = new Map(Object.entries(data.mappings));
                }
                
                // Load reverse mappings
                if (data.phoneToLid) {
                    this.phoneToLid = new Map(Object.entries(data.phoneToLid));
                }
                
                // Load pushName mappings
                if (data.pushNameToJids) {
                    Object.entries(data.pushNameToJids).forEach(([pushName, jids]) => {
                        this.pushNameToJids.set(pushName, new Set(jids));
                    });
                }
                
                // Load JID to pushName mappings
                if (data.jidToPushName) {
                    this.jidToPushName = new Map(Object.entries(data.jidToPushName));
                }
                
                console.log(`📂 Loaded ${this.mappings.size} LID mappings from storage`);
                return true; // File existed and was loaded
            } else {
                console.log(`📂 No existing LID mappings file found at ${this.storageFile}`);
                return false; // File doesn't exist
            }
        } catch (error) {
            console.error('Error loading LID mappings:', error.message);
            return false; // Error loading file
        }
    }

    /**
     * Save mappings to file
     */
    saveMappings() {
        try {
            const data = {
                mappings: Object.fromEntries(this.mappings),
                phoneToLid: Object.fromEntries(this.phoneToLid),
                pushNameToJids: Object.fromEntries(
                    Array.from(this.pushNameToJids.entries()).map(([key, set]) => [key, Array.from(set)])
                ),
                jidToPushName: Object.fromEntries(this.jidToPushName),
                lastUpdated: new Date().toISOString()
            };
            
            fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving LID mappings:', error.message);
        }
    }

    /**
     * Process existing baileys store data to extract LID mappings
     * @param {Object} store - The loaded baileys store with messages and chats
     */
    processExistingStore(store) {
        if (!store || !store.messages) {
            console.log('📂 No existing messages found in baileys store');
            return;
        }

        console.log('📂 Processing existing baileys store for LID mappings...');
        let processedCount = 0;
        let mappingsCreated = 0;
        const initialMappingCount = this.mappings.size;

        // Process all stored messages
        Object.values(store.messages).forEach(msg => {
            if (msg && msg.key) {
                processedCount++;
                const beforeCount = this.mappings.size;
                this.processMessage(msg);
                if (this.mappings.size > beforeCount) {
                    mappingsCreated++;
                }
            }
        });

        const finalMappingCount = this.mappings.size;
        const newMappings = finalMappingCount - initialMappingCount;

        console.log(`📂 Processed ${processedCount} existing messages`);
        console.log(`📈 Created ${newMappings} new LID mappings from existing data`);
        console.log(`📊 Total mappings: ${finalMappingCount}`);

        // Save the new mappings
        if (newMappings > 0) {
            this.saveMappings();
            console.log('💾 Saved new mappings to storage');
        }
    }

    /**
     * Process group metadata to extract contact information from all group members
     * This helps build a comprehensive contact database even for users who haven't messaged directly
     */
    async processGroupMetadata(sock, groupIds) {
        if (!sock || !Array.isArray(groupIds)) {
            console.log('📱 Invalid parameters for group metadata processing');
            return;
        }

        console.log('📱 Processing group metadata for contact extraction...');
        let processedGroups = 0;
        let processedMembers = 0;
        let newMappingsCount = 0;
        const initialMappingCount = this.mappings.size;

        for (const groupId of groupIds) {
            try {
                console.log(`📱 Fetching metadata for group: ${groupId}`);
                const metadata = await sock.groupMetadata(groupId);
                
                if (metadata && metadata.participants) {
                    processedGroups++;
                    
                    for (const participant of metadata.participants) {
                        processedMembers++;
                        
                        // Extract phone number from regular participants
                        if (participant.id && participant.id.includes('@c.us')) {
                            const phoneNumber = participant.id.split('@')[0];
                            const formattedPhone = `${phoneNumber}@s.whatsapp.net`;
                            
                            // Create a synthetic message-like object to process
                            const syntheticMsg = {
                                key: {
                                    remoteJid: groupId,
                                    fromMe: false,
                                    participant: participant.id
                                },
                                pushName: participant.pushName || participant.notify || null,
                                verifiedBizName: participant.verifiedBizName || null
                            };
                            
                            this.processMessage(syntheticMsg);
                        }
                        
                        // For LID participants, store them as pending contacts
                        else if (participant.id && participant.id.includes('@lid')) {
                            const lidNumber = participant.id.split('@')[0];
                            const pushName = participant.pushName || participant.notify || null;
                            
                            if (pushName) {
                                // Store as pending contact for future resolution
                                if (!this.pendingContacts) {
                                    this.pendingContacts = new Map();
                                }
                                
                                this.pendingContacts.set(lidNumber, {
                                    pushName: pushName,
                                    timestamp: Date.now(),
                                    source: 'group_metadata',
                                    groupId: groupId
                                });
                                
                                console.log(`📱 Added LID ${lidNumber} as pending contact with name: ${pushName}`);
                            }
                        }
                    }
                    
                    console.log(`📱 ✅ Processed group ${metadata.subject || groupId} with ${metadata.participants.length} members`);
                } else {
                    console.log(`📱 ⚠️ No participants found for group: ${groupId}`);
                }
                
            } catch (error) {
                console.error(`📱 ❌ Error processing group ${groupId}:`, error.message);
            }
        }

        newMappingsCount = this.mappings.size - initialMappingCount;
        
        if (newMappingsCount > 0) {
            this.saveMappings();
        }
        
        console.log(`📱 Group metadata processing complete:`);
        console.log(`   - Groups processed: ${processedGroups}/${groupIds.length}`);
        console.log(`   - Members processed: ${processedMembers}`);
        console.log(`   - New mappings created: ${newMappingsCount}`);
        console.log(`   - Pending contacts: ${this.pendingContacts ? this.pendingContacts.size : 0}`);
    }

    /**
     * Clear all mappings
     */
    clearMappings() {
        this.mappings.clear();
        this.pushNameToJids.clear();
        this.jidToPushName.clear();
        this.phoneToLid.clear();
        
        try {
            if (fs.existsSync(this.storageFile)) {
                fs.unlinkSync(this.storageFile);
            }
        } catch (error) {
            console.error('Error clearing mappings file:', error.message);
        }
        
        console.log('🗑️ All LID mappings cleared');
    }
}

// Export singleton instance
const lidToPhoneResolver = new LidToPhoneResolver();
module.exports = lidToPhoneResolver;