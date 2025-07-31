import fs from 'fs'
import { phoneNumberFormatter } from '../index.js'

// Contact mapping file to store JID to phone number relationships
const contactMappingFile = './contact_mapping.json'

// In-memory cache for faster lookups
let contactMapping = {}

// PushName to JID mapping for similarity matching
let pushNameMappings = {
  lidToPushName: {}, // LID -> pushName
  phoneToPushName: {}, // phone -> pushName
  pushNameToLids: {}, // pushName -> [LIDs]
  pushNameToPhones: {} // pushName -> [phones]
}

/**
 * Load contact mapping from file
 */
export const loadContactMapping = () => {
  if (fs.existsSync(contactMappingFile)) {
    try {
      const data = fs.readFileSync(contactMappingFile, 'utf-8')
      const loadedData = JSON.parse(data)
      
      // Load contact mappings
      contactMapping = loadedData.contactMapping || loadedData
      
      // Load pushName mappings if available
      if (loadedData.pushNameMappings) {
        pushNameMappings = loadedData.pushNameMappings
      }
      
      console.log(`Loaded ${Object.keys(contactMapping).length} contact mappings`)
    } catch (err) {
      console.error('Failed to load contact mapping:', err)
      contactMapping = {}
      pushNameMappings = {
        lidToPushName: {},
        phoneToPushName: {},
        pushNameToLids: {},
        pushNameToPhones: {}
      }
    }
  } else {
    contactMapping = {}
    pushNameMappings = {
      lidToPushName: {},
      phoneToPushName: {},
      pushNameToLids: {},
      pushNameToPhones: {}
    }
  }
}

/**
 * Save contact mapping to file
 */
export const saveContactMapping = () => {
  try {
    const dataToSave = {
      contactMapping,
      pushNameMappings,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '2.0.0',
        description: 'WhatsApp JID to Phone Number mapping with pushName similarity matching'
      }
    }
    fs.writeFileSync(contactMappingFile, JSON.stringify(dataToSave, null, 2))
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
 * Store pushName mapping for similarity matching
 * @param {string} jid - The JID (LID or phone)
 * @param {string} pushName - The display name
 */
const storePushNameMapping = (jid, pushName) => {
  if (!jid || !pushName) return
  
  const cleanJid = jid.split('@')[0]
  const normalizedPushName = pushName.toLowerCase().trim()
  
  if (/^\d+$/.test(cleanJid)) {
    // It's a phone number
    const formattedPhone = phoneNumberFormatter(cleanJid)
    pushNameMappings.phoneToPushName[formattedPhone] = normalizedPushName
    
    if (!pushNameMappings.pushNameToPhones[normalizedPushName]) {
      pushNameMappings.pushNameToPhones[normalizedPushName] = []
    }
    if (!pushNameMappings.pushNameToPhones[normalizedPushName].includes(formattedPhone)) {
      pushNameMappings.pushNameToPhones[normalizedPushName].push(formattedPhone)
    }
  } else {
    // It's a LID
    pushNameMappings.lidToPushName[cleanJid] = normalizedPushName
    
    if (!pushNameMappings.pushNameToLids[normalizedPushName]) {
      pushNameMappings.pushNameToLids[normalizedPushName] = []
    }
    if (!pushNameMappings.pushNameToLids[normalizedPushName].includes(cleanJid)) {
      pushNameMappings.pushNameToLids[normalizedPushName].push(cleanJid)
    }
  }
}

/**
 * Attempt to map LID to phone number based on pushName similarity
 * @param {string} lidJid - The LID JID
 * @param {string} pushName - The pushName to match
 */
const attemptPushNameMapping = (lidJid, pushName) => {
  if (!lidJid || !pushName) return
  
  const normalizedPushName = pushName.toLowerCase().trim()
  
  // Direct match
  if (pushNameMappings.pushNameToPhones[normalizedPushName]) {
    const matchingPhones = pushNameMappings.pushNameToPhones[normalizedPushName]
    if (matchingPhones.length === 1) {
      addContactMapping(lidJid, matchingPhones[0])
      console.log(`✅ Auto-mapped LID ${lidJid.split('@')[0]} to ${matchingPhones[0]} via pushName: ${pushName}`)
      return
    } else if (matchingPhones.length > 1) {
      console.log(`⚠️ Multiple phone numbers found for pushName "${pushName}": ${matchingPhones.join(', ')} - manual resolution needed`)
      return
    }
  }
  
  // Fuzzy matching for similar names
  const similarMatches = []
  for (const [storedPushName, phones] of Object.entries(pushNameMappings.pushNameToPhones)) {
    if (calculateSimilarity(normalizedPushName, storedPushName) > 0.8) {
      similarMatches.push({ pushName: storedPushName, phones, similarity: calculateSimilarity(normalizedPushName, storedPushName) })
    }
  }
  
  if (similarMatches.length === 1 && similarMatches[0].phones.length === 1) {
    addContactMapping(lidJid, similarMatches[0].phones[0])
    console.log(`✅ Auto-mapped LID ${lidJid.split('@')[0]} to ${similarMatches[0].phones[0]} via similar pushName: "${pushName}" ≈ "${similarMatches[0].pushName}" (${Math.round(similarMatches[0].similarity * 100)}% match)`)
  } else if (similarMatches.length > 0) {
    console.log(`🔍 Found ${similarMatches.length} similar pushName matches for "${pushName}" - manual resolution needed`)
    similarMatches.forEach(match => {
      console.log(`   - "${match.pushName}" (${Math.round(match.similarity * 100)}% match): ${match.phones.join(', ')}`)
    })
  }
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Process incoming messages for contact mapping
 * Runtime behavior: Check if sender exists in mapping, if not - map it automatically
 * @param {object} msg - The WhatsApp message object
 */
export const processMessageForMapping = (msg) => {
  if (!msg || !msg.key) return
  
  const { remoteJid, participant, fromMe } = msg.key
  const pushName = msg.pushName || msg.verifiedBizName || msg.notify || null
  
  // Skip messages from ourselves
  if (fromMe) return
  
  // For group messages, use participant JID
  if (remoteJid.endsWith('@g.us') && participant) {
    const participantJid = participant.split('@')[0]
    
    // Store pushName mapping for both LIDs and regular phone numbers
    if (pushName && pushName.trim()) {
      storePushNameMapping(participant, pushName.trim())
    }
    
    // Only process LIDs (non-numeric JIDs) - regular phone numbers don't need mapping
    if (!/^\d+$/.test(participantJid)) {
      // It's a LID, check if we already have a mapping
      const existingMapping = getPhoneFromJid(participant)
      
      if (!existingMapping) {
        console.log(`🔍 New LID detected in group message: ${participantJid} (${pushName || 'Unknown'}) - attempting pushName matching...`)
        // Try to find matching phone number based on pushName similarity
        attemptPushNameMapping(participant, pushName)
      }
    }
  } else if (!remoteJid.endsWith('@g.us')) {
    // For direct messages, use remoteJid
    const senderJid = remoteJid.split('@')[0]
    
    // Store pushName mapping for both LIDs and regular phone numbers
    if (pushName && pushName.trim()) {
      storePushNameMapping(remoteJid, pushName.trim())
    }
    
    // Only process LIDs (non-numeric JIDs) - regular phone numbers don't need mapping
    if (!/^\d+$/.test(senderJid)) {
      // It's a LID, check if we already have a mapping
      const existingMapping = getPhoneFromJid(remoteJid)
      
      if (!existingMapping) {
        console.log(`🔍 New LID detected in direct message: ${senderJid} (${pushName || 'Unknown'}) - attempting pushName matching...`)
        // Try to find matching phone number based on pushName similarity
        attemptPushNameMapping(remoteJid, pushName)
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
      Object.values(store.messages).forEach(chatMessages => {
        if (Array.isArray(chatMessages)) {
          chatMessages.forEach(msg => {
            if (msg && msg.key) {
              const { remoteJid, participant, fromMe } = msg.key
              const pushName = msg.pushName || msg.verifiedBizName || msg.notify || null
              
              // Skip our own messages
              if (fromMe) return
              
              // Process group messages
              if (remoteJid && remoteJid.endsWith('@g.us') && participant) {
                const participantJid = participant.split('@')[0]
                
                // Store pushName mapping for both LIDs and regular phone numbers
                if (pushName && pushName.trim()) {
                  storePushNameMapping(participant, pushName.trim())
                }
                
                // Only process LIDs (non-numeric JIDs)
                if (!/^\d+$/.test(participantJid)) {
                  console.log(`Found LID in stored group message: ${participantJid} (${pushName || 'Unknown'})`)
                  mappingsFound++
                }
              }
              
              // Process direct messages
              if (remoteJid && !remoteJid.endsWith('@g.us')) {
                const senderJid = remoteJid.split('@')[0]
                
                // Store pushName mapping for both LIDs and regular phone numbers
                if (pushName && pushName.trim()) {
                  storePushNameMapping(remoteJid, pushName.trim())
                }
                
                // Only process LIDs (non-numeric JIDs)
                if (!/^\d+$/.test(senderJid)) {
                  console.log(`Found LID in stored direct message: ${senderJid} (${pushName || 'Unknown'})`)
                  mappingsFound++
                }
              }
            }
          })
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

/**
 * Get pushName mapping statistics
 * @returns {object} - Statistics about pushName mappings
 */
export const getPushNameStats = () => {
  return {
    totalLidPushNames: Object.keys(pushNameMappings.lidToPushName).length,
    totalPhonePushNames: Object.keys(pushNameMappings.phoneToPushName).length,
    totalUniquePushNames: new Set([
      ...Object.values(pushNameMappings.lidToPushName),
      ...Object.values(pushNameMappings.phoneToPushName)
    ]).size,
    pushNameToLidsCount: Object.keys(pushNameMappings.pushNameToLids).length,
    pushNameToPhonesCount: Object.keys(pushNameMappings.pushNameToPhones).length
  }
}

/**
 * Get detailed pushName mappings for debugging
 * @returns {object} - All pushName mappings
 */
export const getPushNameMappings = () => {
  return pushNameMappings
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
  initContactMapping,
  getPushNameStats,
  getPushNameMappings
}