/**
 * LID to Phone Resolver Test Script
 * 
 * This script demonstrates how to use the LID resolver functionality
 * both programmatically and via API endpoints.
 */

import lidToPhoneResolver from '../utils/lidToPhoneResolver.js';

// Example 1: Direct usage (when you have access to the resolver instance)
function directUsageExample() {
  console.log('=== Direct Usage Example ===');
  
  // Simulate some mappings (normally these would come from actual messages)
  lidToPhoneResolver.addJidMapping('80444922015783@lid', 'John Doe');
  lidToPhoneResolver.addJidMapping('6281130569787@s.whatsapp.net', 'John Doe');
  
  // The resolver will automatically create the mapping
  console.log('Resolving LID:', lidToPhoneResolver.resolveJid('80444922015783@lid'));
  console.log('Getting LID for phone:', lidToPhoneResolver.getLidForPhone('6281130569787@s.whatsapp.net'));
  console.log('JIDs for John Doe:', lidToPhoneResolver.getJidsForPushName('John Doe'));
  
  // Get statistics
  console.log('Statistics:', lidToPhoneResolver.getStats());
}

// Example 2: API usage examples
function apiUsageExamples() {
  console.log('\n=== API Usage Examples ===');
  
  const baseUrl = 'http://localhost:3000';
  
  console.log('API Endpoints:');
  console.log(`1. Resolve JID: GET ${baseUrl}/api/lid-resolver/resolve/80444922015783@lid`);
  console.log(`2. Get stats: GET ${baseUrl}/api/lid-resolver/stats`);
  console.log(`3. Get mappings: GET ${baseUrl}/api/lid-resolver/mappings?pushName=John%20Doe`);
  console.log(`4. Force mapping: POST ${baseUrl}/api/lid-resolver/force-mapping`);
  console.log('   Body: { "lidJid": "80444922015783@lid", "phoneJid": "6281130569787@s.whatsapp.net" }');
}

// Example 3: Curl commands for testing
function curlExamples() {
  console.log('\n=== Curl Examples ===');
  
  console.log('# Resolve a LID to phone number');
  console.log('curl "http://localhost:3000/api/lid-resolver/resolve/80444922015783@lid"');
  
  console.log('\n# Get resolver statistics');
  console.log('curl "http://localhost:3000/api/lid-resolver/stats"');
  
  console.log('\n# Get JIDs for a specific pushName');
  console.log('curl "http://localhost:3000/api/lid-resolver/mappings?pushName=John%20Doe"');
  
  console.log('\n# Force a mapping between LID and phone');
  console.log('curl -X POST "http://localhost:3000/api/lid-resolver/force-mapping" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{ "lidJid": "80444922015783@lid", "phoneJid": "6281130569787@s.whatsapp.net" }\'');
}

// Example 4: How the resolver works automatically
function howItWorksExample() {
  console.log('\n=== How It Works Automatically ===');
  
  console.log('1. When a message comes from "80444922015783@lid" with pushName "John Doe":');
  console.log('   - Resolver stores: 80444922015783@lid -> John Doe');
  
  console.log('\n2. When a message comes from "6281130569787@s.whatsapp.net" with pushName "John Doe":');
  console.log('   - Resolver stores: 6281130569787@s.whatsapp.net -> John Doe');
  console.log('   - Resolver creates mapping: 80444922015783@lid -> 6281130569787@s.whatsapp.net');
  
  console.log('\n3. Now when you call resolveJid("80444922015783@lid"):');
  console.log('   - Returns: "6281130569787@s.whatsapp.net"');
  
  console.log('\n4. The resolver also handles:');
  console.log('   - contacts.update events for new JID notifications');
  console.log('   - Persistent storage (saves to lid-mappings.json)');
  console.log('   - JID verification using onWhatsApp() when available');
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  directUsageExample();
  apiUsageExamples();
  curlExamples();
  howItWorksExample();
}

export {
  directUsageExample,
  apiUsageExamples,
  curlExamples,
  howItWorksExample
};