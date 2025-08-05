import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8192;
const BASE_URL = `http://localhost:${PORT}`;

// Test cases
const testCases = [
  {
    name: 'Simple text message',
    payload: {
      name: 'ChatBot',
      message: 'Test message from comprehensive test script'
    }
  },
  {
    name: 'Message with mentions',
    payload: {
      name: 'ChatBot',
      message: 'Hello @6281130569787, this is a test with mention',
      mention: '6281130569787'
    }
  },
  {
    name: 'Test with group ID instead of name',
    payload: {
      id: '120363123402010871@g.us',
      message: 'Test message using group ID'
    }
  },
  {
    name: 'Invalid request - missing both id and name',
    payload: {
      message: 'This should fail'
    },
    expectError: true
  },
  {
    name: 'Invalid request - non-existent group',
    payload: {
      name: 'NonExistentGroup',
      message: 'This should fail'
    },
    expectError: true
  }
];

async function runTest(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('Payload:', JSON.stringify(testCase.payload, null, 2));
    
    const response = await fetch(`${BASE_URL}/send-group-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '::1' // Use localhost IP to pass checkIP middleware
      },
      body: JSON.stringify(testCase.payload)
    });

    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (testCase.expectError) {
      if (!response.ok) {
        console.log('✅ Expected error occurred - Test passed!');
      } else {
        console.log('❌ Expected error but got success - Test failed!');
      }
    } else {
      if (response.ok) {
        console.log('✅ Test passed!');
      } else {
        console.log('❌ Test failed:', result.error || 'Unknown error');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive /send-group-message endpoint tests...');
  console.log(`📡 Server URL: ${BASE_URL}`);
  
  for (const testCase of testCases) {
    await runTest(testCase);
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 All tests completed!');
}

// Run all tests
runAllTests();