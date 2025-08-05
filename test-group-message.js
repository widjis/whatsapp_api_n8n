import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8192;
const BASE_URL = `http://localhost:${PORT}`;

async function testGroupMessage() {
  try {
    console.log('Testing /send-group-message endpoint...');
    console.log(`Sending request to: ${BASE_URL}/send-group-message`);
    
    const response = await fetch(`${BASE_URL}/send-group-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '::1' // Use localhost IP to pass checkIP middleware
      },
      body: JSON.stringify({
        name: 'ChatBot',
        message: 'Test message from test script'
      })
    });

    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers));
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Test message sent successfully!');
    } else {
      console.log('❌ Test failed:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Error testing group message:', error.message);
  }
}

// Run the test
testGroupMessage();