// Function to get a response from Perplexity AI
async function getAIBrowser(prompt) {
  const apiUrl = 'https://api.perplexity.ai/chat/completions';
  const token = "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"; // Token entered inside the function
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        { 
          role: "system", 
          content: "You are a current news provider. You will be given a question and you must answer it accurately, clearly, and concisely. You must not answer questions that are not related to the news." 
        },
        { 
          role: "user", 
          content: String(prompt) // Ensure the prompt is a string
        }
      ],
      max_tokens: 1000,
      temperature: 0.2,
      top_p: 0.9,
      return_citations: true,
      search_domain_filter: ["perplexity.ai"],
      return_images: false,
      return_related_questions: false,
      search_recency_filter: "month",
      top_k: 0,
      stream: false,
      presence_penalty: 0,
      frequency_penalty: 1
    })
  };

  try {
    console.log('Sending request to Perplexity AI...');
    console.log('Request options:', options); // Log request options for debugging

    const response = await fetch(apiUrl, options);

    // Log the response status and headers for debugging
    console.log(`Response Status: ${response.status}`);
    console.log('Response Headers:', JSON.stringify([...response.headers]));

    // Read the response as text first to log it, then try parsing it as JSON
    const responseBody = await response.text();

    // Log the raw response body
    console.log('Raw Response Body:', responseBody);

    // Try to parse the response as JSON
    const data = JSON.parse(responseBody);

    // Check for errors in the response
    if (!response.ok || !data.choices || data.choices.length === 0) {
      console.error('Error: Failed to get a valid response from Perplexity AI');
      return `Error: Failed to get a valid response from Perplexity AI - ${response.status} - ${responseBody}`; // Return error with more details
    }

    // Extract the assistant's reply
    const assistantReply = data.choices[0].message.content;
    console.log('Assistant reply:', assistantReply); // Log the assistant's reply
    return assistantReply; // Return the response as text
  } catch (error) {
    console.error('Error fetching response from Perplexity AI:', error);
    return `Error: ${error.message}`; // Return error message as text
  }
}

// Export the function
module.exports = {
  getAIBrowser
};

// Example usage (uncomment to test in the same file):
// const userPrompt = 'berita terkini bandung';
// getAIBrowser(userPrompt)
//   .then(response => {
//     console.log('Assistant says:', response); // Output as text
//   })
//   .catch(error => {
//     console.error('An error occurred:', error);
//   });
