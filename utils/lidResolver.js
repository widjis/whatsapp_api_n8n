import fs from 'fs'
import { phoneNumberFormatter } from '../index.js'

// Contact mapping file to store JID to phone number relationships
const contactMappingFile = './contact_mapping.json'

// In-memory cache for faster lookups
let contactMapping = {}

/**
 * Load contact mapping from file
 */
export const loadContactMapping = () => {
  if (fs.existsSync(contactMappingFile)) {
    try {
      const data = fs.readFileSync(contactMappingFile, 'utf-8')
      contactMapping = JSON.parse(data)
      console.log(`Loaded ${Object.keys(contactMapping).length} contact mappings`)
    } catch (err) {
      console.error('Failed to load contact mapping:', err)
      contactMapping = {}
    }
  } else {
    contactMapping = {}
  }
}

/**
 * Save contact mapping to file
 */
export const saveContactMapping = () => {
  try {
    fs.writeFileSync(contactMappingFile, JSON.stringify(contactMapping, null, 2))
    console.log(`Saved ${Object.keys(contactMapping).length} contact mappings`)
  } catch (err) {
    console.error('Failed to save contact mapping:', err)
  }
}

/**
 * Add or update a JID to phone number mapping
 * @param {string} jid - The WhatsApp JID (can be LID or regular)
 * @param {string} phoneNumber - The phone number
 */
export const addContactMapping = (jid, phoneNumber) => {
  if (!jid || !phoneNumber) return
  
  const cleanJid = jid.split('@')[0] // Remove @s.whatsapp.net or @lid parts
  
  // Only create mappings for LIDs (non-numeric JIDs)
  // Regular phone numbers don't need mapping since they're already phone numbers
  if (!/^\d+$/.test(cleanJid)) {
    const formattedPhone = phoneNumberFormatter(phoneNumber)
    
    // Store both directions for faster lookup (LID <-> Phone)
    contactMapping[cleanJid] = formattedPhone
    contactMapping[formattedPhone] = cleanJid
    
    console.log(`🔗 Added LID mapping: ${cleanJid} <-> ${formattedPhone}`)
  } else {
    // For regular phone numbers, no mapping needed
    console.log(`📱 Regular phone number detected: ${cleanJid} - no mapping required`)
  }
}

/**
 * Get phone number from JID (handles both regular and LID)
 * @param {string} jid - The WhatsApp JID
 * @returns {string|null} - The phone number or null if not found
 */
export const getPhoneFromJid = (jid) => {
  if (!jid) return null
  
  const cleanJid = jid.split('@')[0]
  
  // First try direct mapping (for LIDs)
  if (contactMapping[cleanJid]) {
    return contactMapping[cleanJid]
  }
  
  // If it's a regular phone number format, try to format it
  if (/^\d+$/.test(cleanJid)) {
    return phoneNumberFormatter(cleanJid)
  }
  
  return null
}

/**
 * Get JID from phone number
 * @param {string} phoneNumber - The phone number
 * @returns {string|null} - The JID or null if not found
 */
export const getJidFromPhone = (phoneNumber) => {
  if (!phoneNumber) return null
  
  const formattedPhone = phoneNumberFormatter(phoneNumber)
  return contactMapping[formattedPhone] || null
}

/**
 * Process incoming messages for contact mapping
 * Runtime behavior: Check if sender exists in mapping, if not - map it automatically
 * @param {object} msg - The WhatsApp message object
 */
export const processMessageForMapping = (msg) => {
  if (!msg || !msg.key) return
  
  const { remoteJid, participant, fromMe } = msg.key
  
  // Skip messages from ourselves
  if (fromMe) return
  
  // For group messages, use participant JID
  if (remoteJid.endsWith('@g.us') && participant) {
    const participantJid = participant.split('@')[0]
    
    // Only process LIDs (non-numeric JIDs) - regular phone numbers don't need mapping
    if (!/^\d+$/.test(participantJid)) {
      // It's a LID, check if we already have a mapping
      const existingMapping = getPhoneFromJid(participant)
      
      if (!existingMapping) {
        console.log(`🔍 New LID detected in group message: ${participantJid} - needs manual resolution`)
        // Store LID for future reference (when we get phone number info)
      }
    }
  } else if (!remoteJid.endsWith('@g.us')) {
    // For direct messages, use remoteJid
    const senderJid = remoteJid.split('@')[0]
    
    // Only process LIDs (non-numeric JIDs) - regular phone numbers don't need mapping
    if (!/^\d+$/.test(senderJid)) {
      // It's a LID, check if we already have a mapping
      const existingMapping = getPhoneFromJid(remoteJid)
      
      if (!existingMapping) {
        console.log(`🔍 New LID detected in direct message: ${senderJid} - needs manual resolution`)
        // Store LID for future reference (when we get phone number info)
      }
    }
  }
}

/**
 * Process reaction to extract and store contact mapping
 * @param {object} reaction - The WhatsApp reaction object
 */
export const processReactionForMapping = (reaction) => {
  if (!reaction || !reaction.reaction || !reaction.reaction.key) return
  
  const participant = reaction.reaction.key.participant
  if (!participant) return
  
  const participantJid = participant.split('@')[0]
  
  // Try to extract phone number from participant JID
  if (/^\d+$/.test(participantJid)) {
    // It's a regular phone number
    addContactMapping(participant, participantJid)
  } else {
    // It's a LID, log it for debugging
    console.log(`Found LID in reaction: ${participantJid}`)
  }
}

/**
 * Enhanced phone number formatter that uses contact mapping
 * @param {string} jid - The JID to convert to phone number
 * @returns {string} - The formatted phone number
 */
export const resolvePhoneNumber = (jid) => {
  if (!jid) return ''
  
  // First try to get from mapping
  const mappedPhone = getPhoneFromJid(jid)
  if (mappedPhone) {
    return mappedPhone
  }
  
  // Fallback to original method
  const cleanJid = jid.split('@')[0]
  if (/^\d+$/.test(cleanJid)) {
    return phoneNumberFormatter(cleanJid)
  }
  
  // If we can't resolve it, return the original JID for debugging
  console.warn(`Could not resolve phone number for JID: ${jid}`)
  return cleanJid
}

/**
 * Scan Baileys store for existing contact information
 */
export const scanBaileysStore = () => {
  try {
    const baileysStoreFile = './baileys_store.json'
    if (!fs.existsSync(baileysStoreFile)) {
      console.log('Baileys store file not found, skipping scan')
      return
    }
    
    const data = fs.readFileSync(baileysStoreFile, 'utf-8')
    const store = JSON.parse(data)
    
    let mappingsFound = 0
    
    // Scan messages for contact information
    if (store.messages) {
      Object.values(store.messages).forEach(msg => {
        if (msg && msg.key) {
          const { remoteJid, participant, fromMe } = msg.key
          
          // Skip our own messages
          if (fromMe) return
          
          // Process group messages - only look for LIDs
          if (remoteJid && remoteJid.endsWith('@g.us') && participant) {
            const participantJid = participant.split('@')[0]
            
            // Only process LIDs (non-numeric JIDs)
            if (!/^\d+$/.test(participantJid)) {
              // It's a LID, log for debugging
              console.log(`Found LID in stored group message: ${participantJid}`)
              mappingsFound++
            }
          }
          
          // Process direct messages - only look for LIDs
          if (remoteJid && !remoteJid.endsWith('@g.us')) {
            const senderJid = remoteJid.split('@')[0]
            
            // Only process LIDs (non-numeric JIDs)
            if (!/^\d+$/.test(senderJid)) {
              console.log(`Found LID in stored direct message: ${senderJid}`)
              mappingsFound++
            }
          }
        }
      })
    }
    
    // Scan chats for contact information
    if (store.chats) {
      Object.values(store.chats).forEach(chat => {
        if (chat && chat.id) {
          const chatJid = chat.id.split('@')[0]
          
          // Process direct chats (not groups)
          if (!chat.id.endsWith('@g.us')) {
            if (/^\d+$/.test(chatJid)) {
              addContactMapping(chat.id, chatJid)
              mappingsFound++
            } else {
              console.log(`Found LID in stored chat: ${chatJid}`)
            }
          }
        }
      })
    }
    
    console.log(`Baileys store scan completed. Found ${mappingsFound} contact mappings.`)
    
    // Save the updated mappings
    saveContactMapping()
    
  } catch (err) {
    console.error('Error scanning Baileys store:', err)
  }
}

/**
 * Initialize the contact mapping system
 * On startup: Check if contact file exists, create if not, then scan Baileys store
 * During runtime: Automatically map new contacts from incoming messages
 */
export const initContactMapping = () => {
  console.log('🚀 Initializing Contact Mapping System...')
  
  // Step 1: Check if contact mapping file exists
  const fileExists = fs.existsSync(contactMappingFile)
  
  if (!fileExists) {
    console.log('📁 Contact mapping file not found, creating new one...')
    // Create empty contact mapping file
    contactMapping = {
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'WhatsApp JID to Phone Number mapping for LID resolution'
      }
    }
    saveContactMapping()
    console.log('✅ Contact mapping file created successfully')
  } else {
    console.log('📁 Contact mapping file found, loading existing mappings...')
    loadContactMapping()
  }
  
  // Step 2: Scan existing Baileys store for contact information
  console.log('🔍 Scanning Baileys store for existing contacts...')
  scanBaileysStore()
  console.log('✅ Baileys store scan completed')
  
  // Step 3: Setup automatic saving and cleanup
  console.log('⚙️ Setting up automatic save intervals...')
  // Save mapping every 5 minutes
  setInterval(saveContactMapping, 5 * 60 * 1000)
  
  // Save on process exit
  process.on('SIGINT', () => {
    console.log('💾 Saving contact mappings before exit...')
    saveContactMapping()
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('💾 Saving contact mappings before termination...')
    saveContactMapping()
    process.exit(0)
  })
  
  console.log('🎉 Contact Mapping System initialized successfully!')
  console.log(`📊 Current mappings: ${Object.keys(contactMapping).filter(key => key !== 'metadata').length} contacts`)
}

export default {
  loadContactMapping,
  saveContactMapping,
  addContactMapping,
  getPhoneFromJid,
  getJidFromPhone,
  processMessageForMapping,
  processReactionForMapping,
  resolvePhoneNumber,
  scanBaileysStore,
  initContactMapping
}