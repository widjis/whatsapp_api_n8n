import { scanBaileysStore, loadContactMapping, getPushNameStats } from './utils/lidResolver.js'

console.log('🔍 Testing Baileys Store Scan...')
console.log('================================')

// Load existing mappings first
loadContactMapping()

// Run the scan
scanBaileysStore()

// Show pushName statistics
console.log('\n📊 PushName Statistics:')
console.log(getPushNameStats())

console.log('\n✅ Test completed!')