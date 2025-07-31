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
  
  const formattedPhone = phoneNumberFormatter(phoneNumber)
  const cleanJid = jid.split('@')[0] // Remove @s.whatsapp.net or @lid parts
  
  // Store both directions for faster lookup
  contactMapping[cleanJid] = formattedPhone
  contactMapping[formattedPhone] = cleanJid
  
  console.log(`Added contact mapping: ${cleanJid} <-> ${formattedPhone}`)
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
 * Process incoming message to extract and store contact mapping
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
    
    // Try to extract phone number from participant JID
    if (/^\d+$/.test(participantJid)) {
      // It's a regular phone number
      addContactMapping(participant, participantJid)
    } else {
      // It's a LID, we need to store it for future reference
      // We'll update this when we get more information
      console.log(`Found LID in group message: ${participantJid}`)
    }
  } else if (!remoteJid.endsWith('@g.us')) {
    // For direct messages, use remoteJid
    const senderJid = remoteJid.split('@')[0]
    
    if (/^\d+$/.test(senderJid)) {
      // It's a regular phone number
      addContactMapping(remoteJid, senderJid)
    } else {
      // It's a LID
      console.log(`Found LID in direct message: ${senderJid}`)
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
 * Initialize the contact mapping system
 */
export const initContactMapping = () => {
  loadContactMapping()
  
  // Save mapping every 5 minutes
  setInterval(saveContactMapping, 5 * 60 * 1000)
  
  // Save on process exit
  process.on('SIGINT', () => {
    saveContactMapping()
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    saveContactMapping()
    process.exit(0)
  })
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
  initContactMapping
}