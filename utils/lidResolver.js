/**
 * LID (Linked ID) Resolution Utility
 * 
 * This module provides utilities to handle WhatsApp Linked IDs (@lid)
 * which are used to hide user phone numbers in group reactions.
 */

import NodeCache from 'node-cache';
import technicianContactsPkg from '../technicianContacts.js';
const { phoneNumberFormatter } = technicianContactsPkg;

// Cache for group metadata and participant mappings
const groupMetadataCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL
const participantMappingCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes TTL
const lidTechnicianCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

/**
 * Check if a participant ID is a Linked ID
 * @param {string} participant - The participant ID
 * @returns {boolean} True if it's a Linked ID
 */
function isLinkedId(participant) {
    return participant && participant.includes('@lid');
}

/**
 * Extract the base identifier from participant (removes @lid or @c.us)
 * @param {string} participant - The participant ID
 * @returns {string} The base identifier
 */
function extractBaseId(participant) {
    if (!participant) return '';
    return participant.split('@')[0];
}

/**
 * Cache group metadata for future LID resolution
 * @param {string} groupJid - Group JID
 * @param {Object} metadata - Group metadata from Baileys
 */
function cacheGroupMetadata(groupJid, metadata) {
    try {
        groupMetadataCache.set(groupJid, metadata);
        
        // Extract and cache participant mappings
        if (metadata.participants) {
            metadata.participants.forEach(participant => {
                const baseId = extractBaseId(participant.id);
                if (baseId && participant.id.includes('@c.us')) {
                    // Store mapping from potential LID to phone number
                    participantMappingCache.set(`${groupJid}:${baseId}`, participant.id);
                }
            });
        }
        
        console.log(`Cached metadata for group ${groupJid} with ${metadata.participants?.length || 0} participants`);
    } catch (error) {
        console.error('Error caching group metadata:', error);
    }
}

/**
 * Attempt to resolve a Linked ID to a phone number
 * @param {string} participant - The participant ID (potentially @lid)
 * @param {string} groupJid - Group JID where the reaction occurred
 * @param {Object} sock - Baileys socket instance
 * @returns {Promise<string>} Resolved phone number or original identifier
 */
async function resolveParticipant(participant, groupJid, sock) {
    if (!participant) return '';
    
    const baseId = extractBaseId(participant);
    
    // If it's not a LID, return the phone number directly
    if (!isLinkedId(participant)) {
        return phoneNumberFormatter(baseId);
    }
    
    console.log(`Attempting to resolve LID: ${participant} in group: ${groupJid}`);
    
    // Try to resolve from cached participant mapping
    const cachedMapping = participantMappingCache.get(`${groupJid}:${baseId}`);
    if (cachedMapping) {
        const resolvedNumber = phoneNumberFormatter(extractBaseId(cachedMapping));
        console.log(`Resolved LID ${participant} to ${resolvedNumber} from cache`);
        return resolvedNumber;
    }
    
    // Try to fetch fresh group metadata
    try {
        const metadata = await sock.groupMetadata(groupJid);
        cacheGroupMetadata(groupJid, metadata);
        
        // Look for participant in fresh metadata
        const participantInfo = metadata.participants?.find(p => {
            const pBaseId = extractBaseId(p.id);
            return pBaseId === baseId || p.id === participant;
        });
        
        if (participantInfo && participantInfo.id.includes('@c.us')) {
            const resolvedNumber = phoneNumberFormatter(extractBaseId(participantInfo.id));
            console.log(`Resolved LID ${participant} to ${resolvedNumber} from fresh metadata`);
            return resolvedNumber;
        }
    } catch (error) {
        console.warn(`Failed to fetch group metadata for LID resolution: ${error.message}`);
    }
    
    // Fallback: return formatted LID as identifier
    const lidIdentifier = phoneNumberFormatter(baseId);
    console.warn(`Could not resolve LID ${participant}, using LID-based identifier: ${lidIdentifier}`);
    return lidIdentifier;
}

/**
 * Store a mapping between LID and technician for future reference
 * @param {string} lidIdentifier - The LID-based identifier
 * @param {Object} technician - Technician object
 */
function cacheLidTechnician(lidIdentifier, technician) {
    if (lidIdentifier && technician) {
        lidTechnicianCache.set(lidIdentifier, technician);
        console.log(`Cached LID technician mapping: ${lidIdentifier} -> ${technician.ict_name}`);
    }
}

/**
 * Get cached technician by LID identifier
 * @param {string} lidIdentifier - The LID-based identifier
 * @returns {Object|null} Cached technician object or null
 */
function getCachedLidTechnician(lidIdentifier) {
    return lidTechnicianCache.get(lidIdentifier) || null;
}

/**
 * Enhanced technician lookup that handles both phone numbers and LIDs
 * @param {string} identifier - Phone number or LID identifier
 * @param {Function} getContactByPhone - Original phone lookup function
 * @returns {Object|null} Technician object or null
 */
function getContactByPhoneOrLid(identifier, getContactByPhone) {
    if (!identifier) return null;
    
    // First try normal phone lookup
    let contact = getContactByPhone(identifier);
    
    if (!contact) {
        // Try LID-based lookup from cache
        contact = getCachedLidTechnician(identifier);
        if (contact) {
            console.log(`Found technician via LID cache: ${contact.ict_name}`);
        }
    }
    
    return contact;
}

/**
 * Initialize group metadata caching for monitored groups
 * @param {Object} sock - Baileys socket instance
 * @param {Array} groupIds - Array of group IDs to monitor
 */
async function initializeGroupMetadataCache(sock, groupIds) {
    console.log('Initializing group metadata cache for LID resolution...');
    
    for (const groupId of groupIds) {
        try {
            const metadata = await sock.groupMetadata(groupId);
            cacheGroupMetadata(groupId, metadata);
        } catch (error) {
            console.warn(`Failed to cache metadata for group ${groupId}:`, error.message);
        }
    }
    
    console.log('Group metadata cache initialization completed');
}

/**
 * Set up event listeners for automatic group metadata caching
 * @param {Object} sock - Baileys socket instance
 */
function setupGroupMetadataCaching(sock) {
    // Cache metadata when groups are updated
    sock.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            if (update.id) {
                try {
                    const metadata = await sock.groupMetadata(update.id);
                    cacheGroupMetadata(update.id, metadata);
                } catch (error) {
                    console.warn(`Failed to update cached metadata for group ${update.id}:`, error.message);
                }
            }
        }
    });
    
    // Update participant mappings when participants change
    sock.ev.on('group-participants.update', async (event) => {
        if (event.id) {
            try {
                const metadata = await sock.groupMetadata(event.id);
                cacheGroupMetadata(event.id, metadata);
            } catch (error) {
                console.warn(`Failed to update participant cache for group ${event.id}:`, error.message);
            }
        }
    });
    
    console.log('Group metadata caching event listeners set up');
}

/**
 * Get statistics about LID resolution cache
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
    return {
        groupMetadata: {
            keys: groupMetadataCache.keys().length,
            stats: groupMetadataCache.getStats()
        },
        participantMappings: {
            keys: participantMappingCache.keys().length,
            stats: participantMappingCache.getStats()
        },
        lidTechnicians: {
            keys: lidTechnicianCache.keys().length,
            stats: lidTechnicianCache.getStats()
        }
    };
}

export {
    isLinkedId,
    extractBaseId,
    resolveParticipant,
    cacheGroupMetadata,
    cacheLidTechnician,
    getCachedLidTechnician,
    getContactByPhoneOrLid,
    initializeGroupMetadataCache,
    setupGroupMetadataCaching,
    getCacheStats
};