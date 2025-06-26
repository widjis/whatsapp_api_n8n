const axios = require('axios');
const https = require('https');
const fs = require('fs');
//const pdf = require('pdf-poppler');
//const { JSDOM } = require("jsdom");
// const path = require('path');
// const { Blob } = require('buffer');
// const FormData = require('form-data');
// const Tesseract = require('tesseract.js');

// //Google Gemini API 
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const genAI = new GoogleGenerativeAI("AIzaSyBzWIY6Vq-r47vF13C1id3blb02YBUJfXY");


// //OpenAI API
// const keyopenai="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";
// const OpenAI = require("openai");
// const openai = new OpenAI({ apiKey: keyopenai });

// //const base_url = "https://helpdesk.merdekabattery.com:8080/api/v3/"; // Updated with ServiceDesk Plus URL

// const base_url = "https://helpdesk.merdekabattery.com:8080";
// const headers = {
//   'authtoken': 'B5E4D2F5-024B-4400-9183-7DC13FD5457E', // Updated with your auth token
//   'Content-Type': 'application/x-www-form-urlencoded'
// };

// const agent = new https.Agent({
//     rejectUnauthorized: false
// });

// const serviceCategories = [
//     '01. PC/Laptop',
//     '02. Office Application',
//     '03. Printer&Scanner',
//     '04. IT Peripheral',
//     '05. LED Monitor',
//     '06. Television',
//     '07. Merdeka System Apps',
//     '08. File Server',
//     '09. Network',
//     '10. Radio HT',
//     '11. Deskphone',
//     '12. Access Card',
//     '13. CCTV',
//     '14. IT Service Request Form',
//     '15. Other',
//     '16. IT System and Mail',
//     '17. IT Project Related to System',
//     '18. IT Project Related to Network',
//     '19. Preventive Maintenance Support',
//     '20. Preventive Maintenance Network',
//     '21. Document Control'
// ];

// // Function to view request details
// /**
//  * Fetches the details of a request by its ID.
//  *
//  * @param {string} request_id - The ID of the request to view.
//  * @returns {Promise<Object>} A promise that resolves to the request data, or an empty object if an error occurs.
//  *
//  * @throws {Error} If an HTTP error or request exception occurs.
//  */
// async function view_request(request_id) {
//     const view_url = `${base_url}/api/v3/requests/${request_id}`;
  
//     try {
//         const response = await axios.get(view_url, {
//             headers: headers,
//             httpsAgent: agent // Use the predefined agent
//         });
  
//         return response.data.request || {};
  
//     } catch (error) {
//         if (error.response) {
//             console.error(`HTTP error occurred: ${error.message}`);
//             console.error(error.response.data);
//         } else {
//             console.error(`Request exception occurred: ${error.message}`);
//         }
//         return {};
//     }
// }

// async function updateRequest(changeId, { templateId, templateName, isServiceTemplate = false, serviceCategory, status, technicianName, ictTechnician, resolution, priority = 'Low' } = {}) {
//     if (!changeId) {
//         console.error('Invalid input parameters. Please provide changeId.');
//         return { success: false, message: 'Invalid input parameters. Please provide changeId.' };
//     }
  
//     const updateUrl = `${base_url}/api/v3/requests/${changeId}`;
//     const addResolutionUrl = `${updateUrl}/resolutions`;
  
//     // Prepare the request data to update
//     const updateData = {
//         request: {}
//     };
  
//     // Optionally include template details
//     if (templateId && templateName) {
//         updateData.request.template = {
//             is_service_template: isServiceTemplate,
//             service_category: serviceCategory ? { name: serviceCategory } : null,
//             name: templateName,
//             id: templateId
//         };
//     }
  
//     // Update status if provided
//     if (status) {
//         updateData.request.status = { name: status };
//     }
//     // Update service category if provided
//     if (serviceCategory) {
//         updateData.request.service_category = { name: serviceCategory };
//     }
//     // Update technician if provided
//     if (technicianName) {
//         updateData.request.technician = { name: technicianName };
//     }
  
//     // Update ICT Technician if provided
//     if (ictTechnician) {
//         updateData.request.udf_fields = {
//             udf_pick_601: ictTechnician  // Assuming udf_pick_601 is the correct field for ICT Technician
//         };
//     }
  
//     // Set the priority (defaulting to "Low" if not provided)
//     updateData.request.priority = { name: priority };
  
//     // Convert data to be URL-encoded
//     const data = `input_data=${encodeURIComponent(JSON.stringify(updateData))}`;
    
//     try {
//         // First, update the ticket
//         console.log(`Sending request to update request with changeId: ${changeId}`);
//         const response = await axios.put(updateUrl, data, { headers, httpsAgent: agent }); // Use the predefined agent
//         console.log(`Request with changeId: ${changeId} has been updated successfully.`);
  
//         // If a resolution is provided, add it
//         if (resolution) {
//             console.log(`Adding resolution to request with changeId: ${changeId}`);
//             const resolutionData = {
//                 resolution: {
//                     content: resolution
//                 }
//             };
  
//             const resolutionPayload = `input_data=${encodeURIComponent(JSON.stringify(resolutionData))}`;
  
//             try {
//                 const resolutionResponse = await axios.post(addResolutionUrl, resolutionPayload, { headers, httpsAgent: agent }); // Use the predefined agent
//                 console.log(`Resolution added successfully to request with changeId: ${changeId}.`);
//                 return { success: true, message: `Request and resolution for changeId: ${changeId} have been updated successfully.` };
//             } catch (resolutionError) {
//                 console.error(`Error occurred while adding resolution for changeId: ${changeId}.`, resolutionError.response ? resolutionError.response.data : resolutionError.message);
//                 return { success: false, message: `Request updated but failed to add resolution: ${resolutionError.message}` };
//             }
//         }
  
//         return { success: true, message: `Request with changeId: ${changeId} has been updated successfully.` };
  
//     } catch (error) {
//         if (error.response) {
//             console.error(`HTTP error occurred while updating request for changeId: ${changeId}. Status: ${error.response.status}, Data:`, JSON.stringify(error.response.data));
//             return { success: false, message: `HTTP error occurred: ${error.response.data}` };
//         } else {
//             console.error(`An error occurred while updating request for changeId: ${changeId}. Message:`, error.message);
//             return { success: false, message: `An error occurred: ${error.message}` };
//         }
//     }
// }


// async function get_all_requests(days = 7) {
//     const all_url = `${base_url}/api/v3/requests`;
//     const max_rows = 100;
//     const thirtyDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
//     let start_index = 1;
//     let filtered_requests = [];
//     let continue_fetching = true;
  
//     while (continue_fetching) {
//       const params = {
//         list_info: {
//           row_count: max_rows,
//           start_index,
//           sort_field: "created_time",
//           sort_order: "desc",
//           get_total_count: true
//         }
//       };
  
//       console.log(`Fetching requests from start index: ${start_index}`);
      
//       try {
//         const response = await axios.get(all_url, {
//           headers: headers,
//           params: { input_data: JSON.stringify(params) },
//           httpsAgent: new https.Agent({ rejectUnauthorized: false })
//         });
  
//         const data = response.data;
//         const requests = data.requests || [];
  
//         for (const request of requests) {
//           const request_id = request.id;
//           const created_time_str = request.created_time?.display_value;
  
//           if (created_time_str) {
//             const created_time = new Date(created_time_str);
            
//             if (created_time >= thirtyDaysAgo) {
//               filtered_requests.push(request_id);
//             } else {
//               // Stop fetching if we reach records older than 30 days
//               continue_fetching = false;
//               break;
//             }
//           }
//         }
  
//         // Stop if the current page has fewer records than max_rows (no more data to fetch)
//         if (requests.length < max_rows) {
//           break;
//         }
        
//         // Move to the next page
//         start_index += max_rows;
  
//       } catch (error) {
//         console.error(`Error fetching requests: ${error.message}`);
//         return filtered_requests;
//       }
//     }
  
//     console.log(`Total recent requests within ${days} days: ${filtered_requests.length}`);
//     return filtered_requests;
//   }

// // async function get_all_requests() {
// //     const all_url = `${base_url}requests`;
// //     const params = {
// //         list_info: {
// //             row_count: 300,
// //             start_index: 1,
// //             sort_field: "created_time",
// //             sort_order: "desc",  // Change sort order to descending to get newer dates first
// //             get_total_count: true,
// //             filter_by: {
// //                 id: "59"
// //             }
// //         }
// //     };
  
// //     try {
// //         // Making the API request to get the list of all requests
// //         const response = await axios.get(all_url, {
// //             headers: headers,
// //             params: { input_data: JSON.stringify(params) },
// //             httpsAgent: agent  // Use the predefined agent
// //         });
  
// //         // Extracting request ID and created time from the response
// //         const data = response.data;
// //         const filtered_requests = [];
// //         for (const request of data.requests || []) {
// //             const request_id = request.id;
// //             const created_time_str = request.created_time?.display_value;
// //             if (created_time_str) {
// //                 const created_time = new Date(created_time_str);
// //                 if (created_time >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {  // Check if within last 7 days
// //                     filtered_requests.push(request_id);
// //                 }
// //             }
// //         }
// //         return filtered_requests;
  
// //     } catch (error) {
// //         if (error.response) {
// //             console.error(`HTTP error occurred: ${error.message}`);
// //             console.error(error.response.data);
// //         } else {
// //             console.error(`Request exception occurred: ${error.message}`);
// //         }
// //         return [];
// //     }
// // }

// async function handleCreateTicket({ subject, description, email_id, service_category = null }) {
//     // Step 1: Validate the email
//     // const user = await findUserByEmail(email_id.toLowerCase());
//     // if (!user) {
//     //   console.log(`The email address ${email_id} is not registered. Please provide a valid email.`);
//     //   return `The email address ${email_id} is not registered. Please provide a valid email.`;
//     // }
  
//     // Step 2: Proceed with ticket creation
//     const createUrl = `${base_url}/api/v3/requests`;
  
//     // Input data for creating a new request
//     const inputData = {
//       request: {
//           subject: subject,
//           description: description,
//           requester: {
//               email_id: email_id
//           },
//           status: {
//               name: "Open"
//           },
//           priority: {
//               name: "Low"
//           },
//           template: {
//               is_service_template: false,
//               name: "Submit a New Request",
//               id: "305"
//           }
//       }
//   };
  
//     // Add service_category if provided
//     if (service_category) {
//         inputData.request.service_category = { name: service_category };
//     }
  
//     // Convert the inputData to URL-encoded form data
//     const data = `input_data=${encodeURIComponent(JSON.stringify(inputData))}`;
  
//     try {
//         const response = await axios.post(createUrl, data, {
//             headers,
//             httpsAgent: agent // Using the predefined agent
//         });
  
//         // Successful creation
//         const requestId = response.data.request.id;
//         return `Ticket created successfully with ID: ${requestId}, Summary: "${description}", Requester Email: ${email_id}.`;
//     } catch (error) {
//         if (error.response) {
//             console.error('HTTP error occurred:', error.message);
//             console.error('Response Data:', JSON.stringify(error.response.data, null, 2)); // Detailed error info
//         } else {
//             console.error('Request exception occurred:', error.message);
//         }
//         return "Could not create the ticket. Please try again later.";
//     }
// }




// async function getAnswerAI(prompt) {
//     //const input = `Here is a list of service categories: ${categories.join(", ")}.\nBased on the following subject and description, select the most appropriate category:\n\nSubject: ${subject}\nDescription: ${description}, answer only with the service category`;
  
//     try {
//       const chatCompletion = await openai.chat.completions.create({
//         messages: [{ role: 'user', content: prompt }],
//         model: 'gpt-4o-mini', // Use appropriate model here
//       });
//       return chatCompletion.choices[0].message.content;
//     } catch (error) {
//       console.error("Error processing AI chat completion: " + error.message);
//       throw new Error("Error processing AI chat completion: " + error.message);
//     }
//   }

//   async function analyzeImageGemini(base64Image, prompt) {
//     try {
//         // Define MIME type dynamically
//         const mimeType = base64Image.startsWith("/9j/") ? "image/jpeg" : "image/png";

//         // Create the generative part with the Base64 image data
//         const imagePart = {
//             inlineData: {
//                 data: base64Image, // Use the provided Base64 string directly
//                 mimeType,          // Set MIME type dynamically
//             },
//         };

//         // Initialize the Gemini model
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

//         // Generate content based on the image and the prompt
//         const result = await model.generateContent([
//             imagePart,  // Image data
//             prompt,     // Custom prompt
//         ]);

//         // Validate and return the AI response
//         if (result && result.response && result.response.text) {
//             return result.response.text();
//         } else {
//             console.error("Unexpected response format:", result);
//             return "Error: Unexpected response format.";
//         }
//     } catch (error) {
//         console.error("Error analyzing image:", error.message, error.stack);
//         return `Error: ${error.message}`;
//     }
// }

// // Function to analyze the image with a prompt
// async function analyzeImageWithPrompt(base64Image, prompt) {
//     try {
//       // Prepare the message with the image and text
//       const messages =[
//         {
//           "role": "user",
//           "content": [
//             {"type": "text", "text": prompt},
//             {
//               "type": "image_url",
//               "image_url": {
//                 "url": `data:image/jpeg;base64,${base64Image}`,
//               },
//             },
//           ],
//         }
//       ];
  
//       // Send the request using OpenAI client
//       const chatCompletion = await openai.chat.completions.create({
//         model: 'gpt-4o',
//         messages: messages,
//         max_tokens: 300,
//         temperature: 0.7, // Adjust this value to set creativity (0 to 1)
//       });
  
//       // Extract the 'content' field from the response
//       const contentResponse = chatCompletion.choices[0].message.content;
  
//       return contentResponse;
//     } catch (error) {
//       console.error(error);
//       throw new Error('Error processing AI chat completion: ' + error.message);
//     }
//   }

// // async function defineServiceCategory(changeId) {
// //     try {
// //       // Step 1: Retrieve the request data
// //       const requestData = await view_request(changeId);
      
// //       // Step 2: Extract the subject and description
// //       const { subject, description } = requestData;
  
// //       if (!subject && !description) {
// //         console.error("No subject or description found for request.");
// //         return null;
// //       }
  
// //       // Step 3: Prepare the input for the AI
// //       const input = `Here is a list of service categories: ${serviceCategories.join(", ")}.\nBased on the following subject and description, select the most appropriate category:\n\nSubject: ${subject}\nDescription: ${description}, answer only with the service category`;
  
// //       // Step 4: Call the AI to analyze the subject and description
// //       let aiResponse;
// //       try {
// //         const chatCompletion = await openai.chat.completions.create({
// //           messages: [{ role: 'user', content: input }],
// //           model: 'gpt-4o-mini', // Use the appropriate model here
// //         });
// //         aiResponse = chatCompletion.choices[0].message.content;
// //         console.log("AI Response:", aiResponse);
// //         return aiResponse;
// //       } catch (aiError) {
// //         console.error("Error calling OpenAI:", aiError.message);
// //         console.log("Defaulting to '15. Other' due to AI error.");
// //         return '15. Other';
// //       }
  
// //       // Step 5: Match the AI's response to the service categories
// //       for (const category of serviceCategories) {
// //         if (aiResponse.toLowerCase().includes(category.split('. ')[1].toLowerCase())) {
// //           console.log(`Service category determined: ${category}`);
// //           return category; // Return the entire string like '01. PC/Laptop'
// //         }
// //       }
  
// //       // Default if no match is found
// //       console.log("No matching service category found. Defaulting to '15. Other'.");
// //       return '15. Other';
  
// //     } catch (error) {
// //       console.error("Error defining service category:", error.message);
// //       throw new Error("Error defining service category: " + error.message);
// //     }
// // }

// async function defineServiceCategory(changeId) {
//     try {
//       // Step 1: Retrieve the request data
//       console.log(`Starting service category definition for Change ID: ${changeId}`);
//       const requestData = await view_request(changeId);
      
//       //console.log(`Request Data Retrieved for Change ID ${changeId}:`, JSON.stringify(requestData, null, 2));
//       // Step 2: Extract the subject and description
//       const { subject, description } = requestData;
  
//       if (!subject && !description) {
//         console.error(`No subject or description found for request with Change ID: ${changeId}.`);
//         return null;
//       }
  
//       // Step 3: Send the text along with service categories to the AI for analysis
//       console.log(`Sending subject and description to AI for Change ID ${changeId}.`);
//       const input = `Here is a list of service categories: ${serviceCategories.join(", ")}.\nBased on the following subject and description, select the most appropriate category:\n\nSubject: ${subject}\nDescription: ${description}, answer only with the service category`;
//       const aiResponse = await getAnswerAI(input);
      
//       console.log(`AI Response for Change ID ${changeId}:`, aiResponse);
  
//       // Step 4: Match the AI's response to the service categories
//       for (const category of serviceCategories) {
//         if (aiResponse.toLowerCase().includes(category.split('. ')[1].toLowerCase())) {
//           console.log(`Service category determined for Change ID ${changeId}: ${category}`);
//           return category; // Return the entire string like '01. PC/Laptop'
//         }
//       }
  
//       // Default if no match is found
//       console.log(`No matching service category found for Change ID ${changeId}. Defaulting to '15. Other'.`);
//       return '15. Other';
//     } catch (error) {
//       console.error(`Error defining service category for Change ID ${changeId}:`, error.message);
//     }
//   }

// async function ticket_report({ days = 7, technicianName = "" } = {}) { // Default to 7 days if no period specified
//     console.log("Fetching all request IDs...");
//     const request_ids = await get_all_requests(days);
//     console.log(`Retrieved ${request_ids.length} request IDs.`);
//     const report_data = [];
    
//     for (const request_id of request_ids) { // Iterate directly over request IDs
//         const request_details = await view_request(request_id);
//         if (request_details) {
//             const requester_name = request_details.requester?.name || 'N/A';
//             const service_category = request_details.service_category?.name || 'N/A';
//             const status = request_details.status?.name || 'N/A';
//             const ict_technician = request_details.udf_fields?.udf_pick_601 || 'N/A';
//             const technician_name = request_details.technician?.name || 'N/A';
            
//             // Check if the ict_technician name contains the technicianName parameter
//             if (technicianName && !ict_technician.toLowerCase().includes(technicianName.toLowerCase())) {
//                 continue; // Skip this request if it doesn't match the filter
//             }

//             report_data.push({
//                 request_id,
//                 requester_name,
//                 created_time: request_details.created_time?.display_value || 'N/A',
//                 service_category,
//                 status,
//                 ict_technician,
//                 technician_name
//             });
//         }
//     }
  
//     // Aggregating data by technician
//     const technician_data = {};
//     for (const data of report_data) {
//         const technician = data.ict_technician;
//         if (!technician_data[technician]) {
//             technician_data[technician] = {
//                 status: {},
//                 service_category: {},
//                 total_tickets: 0
//             };
//         }
  
//         // Count status
//         if (!technician_data[technician].status[data.status]) {
//             technician_data[technician].status[data.status] = 0;
//         }
//         technician_data[technician].status[data.status]++;
  
//         // Count service category
//         if (!technician_data[technician].service_category[data.service_category]) {
//             technician_data[technician].service_category[data.service_category] = 0;
//         }
//         technician_data[technician].service_category[data.service_category]++;
        
//         // Increment total tickets
//         technician_data[technician].total_tickets++;
//     }
  
//     // Building the report text
//     let report_text = `*Ticket Report for Last ${days} Days*\n\n`;
//     if (technicianName) {
//         report_text += `Filtered by Technician: ${technicianName}\n\n`;
//     }

//     for (const [technician, details] of Object.entries(technician_data)) {
//         report_text += `### ${technician} (Total: ${details.total_tickets} Tickets)\n`;
//         report_text += `- Status:\n`;
//         for (const [status, count] of Object.entries(details.status)) {
//             report_text += `  - ${status}: ${count} Tiket\n`;
//         }
//         report_text += `- Service Category:\n`;
//         for (const [category, count] of Object.entries(details.service_category)) {
//             report_text += `  - ${category}: ${count} Tiket\n`;
//         }
//         report_text += `\n`;
//     }
  
//     // Add total tickets at the end
//     const totalTickets = report_data.length;
//     report_text += `*Total Tickets in Last ${days} Days: ${totalTickets}*`;
  
//     return report_text;
// }

// // async function downloadPDF(downloadUrl, attachmentName) {
// //     const outputDir = path.join(__dirname, 'temp_pdf_files'); // Directory to store temporary PDFs

// //     // Ensure the output directory exists
// //     if (!fs.existsSync(outputDir)) {
// //         fs.mkdirSync(outputDir, { recursive: true });
// //     }

// //     const pdfPath = path.join(outputDir, attachmentName);
// //     console.log(`Attachment Name: ${attachmentName}`);
// //     console.log(`Download URL: ${downloadUrl}`);
// //     try {
// //         console.log(`Downloading PDF: ${attachmentName} from ${downloadUrl}`);
// //         const response = await axios.get(downloadUrl, {
// //             headers: headers,
// //             httpsAgent: new https.Agent({ rejectUnauthorized: false }),
// //             responseType: 'arraybuffer', // Important for binary file download
// //         });
 
// //         fs.writeFileSync(pdfPath, response.data); // Save the PDF to a file
// //         console.log(`PDF saved to: ${pdfPath}`);

// //         return pdfPath; // Return the path of the downloaded file
// //     } catch (error) {
// //         console.error(`Error downloading PDF: ${attachmentName}`, error.message);
// //         throw error;
// //     }
// // }

// async function downloadPDF(downloadUrl, attachmentName) {
//     const outputDir = path.join(__dirname, 'temp_pdf_files'); // Directory to store temporary PDFs

//     // Ensure the output directory exists
//     if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//     }

//     const pdfPath = path.join(outputDir, attachmentName);

//     // Validate input parameters
//     if (!downloadUrl) {
//         console.error('Download URL is undefined.');
//         throw new Error('Download URL is undefined.');
//     }
//     if (!headers || typeof headers !== 'object') {
//         console.error('Headers are undefined or invalid.');
//         throw new Error('Headers are undefined or invalid.');
//     }

//     console.log(`Downloading PDF: ${attachmentName} from ${downloadUrl}`);
//     console.log('Headers:', headers);

//     try {
//         const response = await axios.get(downloadUrl, {
//             headers: headers,
//             httpsAgent: new https.Agent({ rejectUnauthorized: false }),
//             responseType: 'arraybuffer', // Important for binary file download
//         });

//         console.log('Response Status:', response.status);
//         console.log('Response Headers:', response.headers);
//         console.log('Response Content-Type:', response.headers['content-type']);

//         if (response.headers['content-type'] !== 'application/pdf') {
//             console.error('Unexpected Content-Type:', response.headers['content-type']);
//             console.error('Response Data:', response.data.toString('utf-8')); // Assuming it's not binary
//             throw new Error('Response is not a PDF');
//         }

//         // Ensure response.data is a valid buffer
//         if (!Buffer.isBuffer(response.data)) {
//             console.error('Response data is not a binary buffer.');
//             throw new Error('Invalid binary data received.');
//         }

//         // Save the PDF to a file
//         fs.writeFileSync(pdfPath, response.data);
//         console.log(`PDF saved to: ${pdfPath}`);

//         return pdfPath; // Return the path of the downloaded file
//     } catch (error) {
//         console.error(`Error downloading PDF: ${attachmentName}`);
//         console.error('Error Message:', error.message);

//         // Log additional Axios error details if available
//         if (error.response) {
//             console.error('Response Status:', error.response.status);
//             console.error('Response Data:', error.response.data);
//             console.error('Response Headers:', error.response.headers);
//         }

//         throw error; // Re-throw the error to be handled by the caller
//     }
// }



// async function extractTextFromImage(imagePath) {
//     try {
//         const { data: { text } } = await Tesseract.recognize(imagePath, 'eng+chi_sim+ind');
//         return text;
//     } catch (error) {
//         console.error('Error during OCR processing:', error.message);
//         throw error;
//     }
// }

// // Helper function to extract text from the first page of a PDF
// async function extractTextFromPdfFirstPage(pdfPath) {
//     const outputDir = path.dirname(pdfPath); // Use the same directory for temporary files
//     //const firstPageImagePath = path.join(outputDir, `temp_first_page.jpg`);

//     const timestamp = Date.now();
//     const firstPageImagePath = path.join(outputDir, `temp_first_page_${timestamp}-1.jpg`);

//     try {
//         // Convert the first page of the PDF to an image
//         await pdf.convert(pdfPath, {
//             format: 'jpeg',
//             out_dir: outputDir,
//             out_prefix: `temp_first_page_${timestamp}`,
//             page: 1, // Process only the first page
//         });

//         // Extract text from the converted image
//         const extractedText = await extractTextFromImage(firstPageImagePath);

//         // Clean up the temporary image
//         // Clean up the temporary image and any other files in the output directory
//         const files = fs.readdirSync(outputDir);
//         for (const file of files) {
//             fs.unlinkSync(path.join(outputDir, file));
//         }

//         return extractedText;
//     } catch (error) {
//         console.error('Error extracting text from PDF first page:', error.message);
//         // Clean up the temporary image
//         const files = fs.readdirSync(outputDir);
//         for (const file of files) {
//             fs.unlinkSync(path.join(outputDir, file));
//         }
//         throw error;
//     }
// }

// // async function isSrfRequest(requestDetails) {
// //     // Define keywords indicating an SRF request with possible variations
// //     const srfKeywords = [
// //         /service request form/i,
// //         /\bsrf\b/i, // Matches 'SRF' as a whole word, case insensitive
// //         /service request/i,
// //         /request/i
// //     ];

// //     // Clean the description and ensure it is a string
// //     const description = extractContent(requestDetails.description || '');

// //     // Helper function to check if any keyword matches a given text
// //     const matchesKeywords = (text) =>
// //         typeof text === 'string' && srfKeywords.some((regex) => regex.test(text));

// //     // Check if any keyword is found in the subject or description
// //     const subjectContainsKeyword = matchesKeywords(requestDetails.subject || '');
// //     const descriptionContainsKeyword = matchesKeywords(description);

// //     // Check if any attachment name contains the keyword
// //     const attachmentsContainKeyword = Array.isArray(requestDetails.attachments) &&
// //         requestDetails.attachments.some((attachment) =>
// //             matchesKeywords(attachment.name || '')
// //         );

// //     // Return true if at least one of the conditions is met
// //     const isSrf = subjectContainsKeyword || descriptionContainsKeyword || attachmentsContainKeyword;

// //     // Check if there are any attachments
// //     const hasAttachments = Array.isArray(requestDetails.attachments) && requestDetails.attachments.length > 0;

// //     // Return true if SRF keywords are found and attachments exist
// //     return isSrf && hasAttachments;
// // }

// //Last known good version
// // async function isSrfRequest(requestDetails) {
// //     // Define keywords indicating an SRF request with possible variations
// //     const srfKeywords = [
// //         /service request form/i,
// //         /\bsrf\b/i, // Matches 'SRF' as a whole word, case insensitive
// //         /service request/i,
// //         /request/i
// //     ];

// //     // Clean the description and ensure it is a string
// //     const description = extractContent(requestDetails.description || '');

// //     // Helper function to check if any keyword matches a given text
// //     const matchesKeywords = (text) =>
// //         typeof text === 'string' && srfKeywords.some((regex) => regex.test(text));

// //     // Check if any keyword is found in the subject or description
// //     const subjectContainsKeyword = matchesKeywords(requestDetails.subject || '');
// //     const descriptionContainsKeyword = matchesKeywords(description);

// //     // Check if any attachment name contains the keyword
// //     const attachmentsContainKeyword = Array.isArray(requestDetails.attachments) &&
// //         requestDetails.attachments.some((attachment) =>
// //             matchesKeywords(attachment.name || '')
// //         );

// //     // Check the first page of each attached PDF for keywords
// //     const pdfAttachmentsContainKeyword = Array.isArray(requestDetails.attachments) &&
// //         await Promise.any(
// //             requestDetails.attachments.map(async (attachment) => {
// //                 if (attachment.name.endsWith('.pdf')) {
// //                     const downloadUrl = `${base_url}${attachment.content_url}`;attachment.content_url;
// //                     console.log(`Checking PDF attachment: ${attachment.name} with download URL: ${downloadUrl}}`);
// //                     const pdfPath = await downloadPDF(downloadUrl, attachment.name);
// //                     const firstPageText = await extractTextFromPdfFirstPage(pdfPath);
// //                     return matchesKeywords(firstPageText);
// //                 }
// //                 return false; // Non-PDF files skip this check
// //             })
// //         ).catch(() => false); // Handle if none of the PDFs match

// //     // Return true if SRF keywords are found in any condition and attachments exist
// //     const hasAttachments = Array.isArray(requestDetails.attachments) && requestDetails.attachments.length > 0;

// //     console.log(`Subject contains keyword: ${subjectContainsKeyword}`);
// //     console.log(`Description contains keyword: ${descriptionContainsKeyword}`);
// //     console.log(`Attachments contain keyword: ${attachmentsContainKeyword}`);
// //     console.log(`PDF attachments contain keyword: ${pdfAttachmentsContainKeyword}`);
// //     console.log(`Has attachments: ${hasAttachments}`);
    
// //     return (subjectContainsKeyword || descriptionContainsKeyword || attachmentsContainKeyword || pdfAttachmentsContainKeyword) && hasAttachments;
// // }


// async function isSrfRequest(requestDetails) {
//     // Define keywords indicating an SRF request with possible variations
//     const srfKeywords = [
//         /service request form/i,
//         /\bsrf\b/i,
//         /service request/i,
//         /request/i,
//     ];

//     // Helper function to check if any keyword matches a given text
//     const matchesKeywords = (text) =>
//         typeof text === 'string' && srfKeywords.some((regex) => regex.test(text));

//     // Check if any keyword is found in the subject or description
//     const subjectContainsKeyword = matchesKeywords(requestDetails.subject || '');
//     const descriptionContainsKeyword = matchesKeywords(requestDetails.description || '');

//     // Check if any attachment name or first page of a PDF contains the keyword
//     let attachmentsContainKeyword = false;
//     if (Array.isArray(requestDetails.attachments)) {
//         for (const attachment of requestDetails.attachments) {
//             if (matchesKeywords(attachment.name || '')) {
//                 attachmentsContainKeyword = true;
//                 break;
//             }

//             if (attachment.name.endsWith('.pdf')) {
//                 const downloadUrl = `${base_url}${attachment.content_url}`;
//                 console.log(`Checking PDF attachment: ${attachment.name} with download URL: ${downloadUrl}`);
//                 try {
//                     const pdfPath = await downloadPDF(downloadUrl, attachment.name);
//                     const firstPageText = await extractTextFromPdfFirstPage(pdfPath);
//                     if (matchesKeywords(firstPageText)) {
//                         attachmentsContainKeyword = true;
//                         break;
//                     }
//                 } catch (error) {
//                     console.error(`Error processing PDF ${attachment.name}:`, error);
//                 }
//             }
//         }
//     }

//     // Return true if any SRF-related keyword is found
//     return subjectContainsKeyword || descriptionContainsKeyword || attachmentsContainKeyword;
// }

// function extractContent(html) {
//     // Parse the HTML using JSDOM
//     const dom = new JSDOM(html);
//     const document = dom.window.document;

//     // Extract and clean all paragraph text
//     const paragraphs = Array.from(document.querySelectorAll("p")).map(p => p.textContent.trim());

//     return paragraphs;
// }


// async function convertPDFToImages(pdfPath, outputDir) {
//     // Ensure output directory exists
//     if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//     }
//     // Generate a temporary, sanitized file name for processing
//     const tempPDFName = `temp_${Date.now()}.pdf`;
//     const tempPDFPath = path.join(outputDir, tempPDFName);
//     console.log(`The pdf now renamed to: ${tempPDFName}`);
//     try {

//         fs.copyFileSync(pdfPath, tempPDFPath);
//         console.log(`Temporary sanitized PDF created: ${tempPDFPath}`);

//         const options = {
//             format: 'jpeg',
//             out_dir: outputDir,
//             out_prefix: 'page',
//             page: null, // Convert all pages
//         };


//         console.log(`Converting PDF at path "${tempPDFPath}" to images...`);
//         const result = await pdf.convert(tempPDFPath, options);
//         console.log(`PDF converted to images: ${result}`);

//         // List all generated image paths
//         const imagePaths = fs.readdirSync(outputDir)
//             .filter(file => file.startsWith('page') && file.endsWith('.jpg'))
//             .map(file => path.join(outputDir, file));
//         // Clean up the temporary PDF file
//         fs.unlinkSync(tempPDFPath);
//         console.log(`Temporary PDF deleted: ${tempPDFPath}`);
//         console.log('Generated image paths:', imagePaths);
//         return imagePaths;
//     } catch (error) {
//         console.error('Error converting PDF to images:', error.message);
//         // Clean up on error
//         if (fs.existsSync(tempPDFPath)) {
//             fs.unlinkSync(tempPDFPath);
//         }
//         throw error;
//     }
// }

// const isTestEnvironment = false; // Set to true if the environment is test
// const chatId = isTestEnvironment ? '120363123402010871@g.us' : '120363162455880145@g.us'; // Choose chatId based on environment
// async function sendGroupMessage(chatId, message, mentions = [], documentPath = null, imagePath = null) {
//     const url = 'http://localhost:8192/send-group-message';
//     const formData = new FormData();

//     formData.append('id', chatId);
//     formData.append('message', message);

//     if (mentions.length > 0) {
//         const mentionsJids = mentions.map(phone => `${phone}`);
//         console.log('Mentions added to the message:', mentionsJids.join(','));
//         //formData.append('mention', mentionsJids.join(','));
//         formData.append('mention', JSON.stringify(mentionsJids)); // Send as JSON array
//     }

//     if (documentPath) {
//         const extension = path.extname(documentPath).toLowerCase();
//         let contentType;
//         if (extension === '.xls' || extension === '.xlsx') {
//             contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
//         } else if (extension === '.pdf') {
//             contentType = 'application/pdf';
//         }
//         if (contentType) {
//             formData.append('document', fs.createReadStream(documentPath), {
//                 filename: path.basename(documentPath),
//                 contentType: contentType
//             });
//             console.log('Document added to the message:', path.basename(documentPath));
//         }
//     }

//     if (imagePath) {
//         formData.append('image', fs.createReadStream(imagePath), {
//             filename: path.basename(imagePath),
//             contentType: 'image/png'
//         });
//         console.log('Image added to the message:', path.basename(imagePath));
//     }

//     try {
//         const response = await axios.post(url, formData, {
//             headers: {
//                 ...formData.getHeaders()
//             }
//         });

//         if (response.status === 200) {
//             console.log('Message sent successfully!');
//             return response.data;
//         } else {
//             console.error('Error sending message:', response.data);
//             throw new Error('Failed to send message');
//         }
//     } catch (error) {
//         console.error('Error sending message:', error.message);
//         throw error;
//     } finally {
//         // Clean up files if needed
//         //if (documentPath) fs.unlinkSync(documentPath);
//         if (imagePath) fs.unlinkSync(imagePath);
//     }
// }


// // async function sendGroupMessage(chatId, message, mentions = [], documentPath = null, imagePath = null) {
// //     const url = 'http://localhost:8192/send-group-message';
// //     const formData = new FormData();

// //     formData.append('id', chatId);
// //     formData.append('message', message);

// //     if (mentions.length > 0) {
// //         const mentionsJids = mentions.map(phone => `${phone}`);
// //         console.log('Mentions added to the message:', mentionsJids.join(','));
// //         formData.append('mention', mentionsJids.join(','));
// //     }

// //     if (documentPath) {
// //         const documentBuffer = fs.readFileSync(documentPath);
// //         const extension = path.extname(documentPath).toLowerCase();
// //         let contentType;
// //         if (extension === '.xls' || extension === '.xlsx') {
// //             contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// //         } else if (extension === '.pdf') {
// //             contentType = 'application/pdf';
// //         }
// //         if (contentType) {
// //             formData.append('document', documentBuffer, { filename: path.basename(documentPath), contentType: contentType });
// //         }
// //     }

// //     if (imagePath) {
// //         const imageBuffer = fs.readFileSync(imagePath);
// //         formData.append('image', imageBuffer, { filename: path.basename(imagePath), contentType: 'image/png' });
// //     }

// //     try {
// //         const response = await axios.post(url, formData, {
// //             headers: {
// //                 ...formData.getHeaders()
// //             }
// //         });

// //         if (response.status === 200) {
// //             console.log('Message sent successfully!');
// //             return response.data;
// //         } else {
// //             console.error('Error sending message:', response.data);
// //             throw new Error('Failed to send message');
// //         }
// //     } catch (error) {
// //         console.error('Error sending message:', error.message);
// //         throw error;
// //     } finally {
// //         // Clean up files if needed
// //         //if (documentPath) fs.unlinkSync(documentPath);
// //         if (imagePath) fs.unlinkSync(imagePath);
// //     }
// // }

// // async function downloadPDF(url, name) {
// //     const outputDir = path.join(__dirname, 'temp'); // Directory to store temporary PDFs

// //     // Ensure the output directory exists
// //     if (!fs.existsSync(outputDir)) {
// //         fs.mkdirSync(outputDir, { recursive: true });
// //     }

// //     const pdfPath = path.join(outputDir, name);

// //     try {
// //         console.log(`Downloading PDF from ${url}`);
// //         const response = await axios.get(url, {
// //             responseType: 'arraybuffer',
// //             httpsAgent: new https.Agent({ rejectUnauthorized: false }),
// //         });

// //         fs.writeFileSync(pdfPath, response.data);
// //         console.log(`PDF saved to: ${pdfPath}`);
// //         return pdfPath;
// //     } catch (error) {
// //         console.error(`Error downloading PDF from ${url}:`, error.message);
// //         throw error;
// //     }
// // }

// async function handleAndAnalyzeAttachments(requestDetails) {
//     // Check if the ticket is an SRF request and has attachments

    
//     const description = extractContent(requestDetails.description);
//     const prompt = `Analyze the following ticket details:\n\nTicket ID: ${requestDetails.id}\nSubject: ${requestDetails.subject}\nDescription: ${description || 'No description provided.'}\n`;

//     const analyzedResults = [];

//     await Promise.all(
//         requestDetails.attachments.map(async (attachment) => {
//             try {
//                 const attachmentName = attachment.name;
//                 const contentType = attachment.content_type;
//                 const downloadUrl = `${base_url}${attachment.content_url}`;

//                 console.log(`Processing Attachment: ${attachmentName}`);
//                 console.log(`Content Type: ${contentType}`);
//                 console.log(`Download URL: ${downloadUrl}`);

//                 // Download the attachment
//                 const response = await axios.get(downloadUrl, {
//                     headers: headers,
//                     httpsAgent: new https.Agent({ rejectUnauthorized: false }),
//                     responseType: 'arraybuffer', // Important for binary file download
//                 });

//                 // Process Images
//                 if (contentType.startsWith('image/')) {
//                     const base64Image = Buffer.from(response.data).toString('base64');
//                     const analysis = await analyzeImageWithPrompt(base64Image, prompt);
//                     console.log(`Analysis for ${attachmentName}: ${analysis}`);
//                     analyzedResults.push({ name: attachmentName, analysis });
//                 }
//                 // Process PDFs
//                 if (contentType.startsWith('application/pdf')) {
//                     console.log(`Processing PDF: ${attachmentName}`);

//                     const isSrf = await isSrfRequest({
//                         subject: requestDetails.subject,
//                         description: description,
//                         attachments: [attachment],
//                     });
//                     // if (isSrf){
//                     //     console.log('Contain SRF');
//                     // }

//                     if (isSrf) {
//                         console.log(`PDF contains SRF-related content: ${attachmentName}`);

//                         const outputDir = path.join(__dirname, 'temp_pdf_images');
//                         if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

//                         const pdfPath = await downloadPDF(downloadUrl, attachmentName);
//                         const imagePaths = await convertPDFToImages(pdfPath, outputDir);

//                         // Analyze all PDF pages in parallel
//                         const pdfPrompt = `Extract requester name, the thing the user requested, and approval status from the direct manager.\n`;
//                         const pdfAnalysisResults = await Promise.all(
//                             imagePaths.map(async (imagePath) => {
//                                 const base64Image = fs.readFileSync(imagePath).toString('base64');
//                                 return await analyzeImageGemini(base64Image, pdfPrompt);
//                             })
//                         );

//                         const mentions = isTestEnvironment
//                             ? ['6285712612218', '6281130569787']
//                             : ['6282323336511', '6285712612218'];

//                         const combinedResult = pdfAnalysisResults.join('\n');

//                         const updatedPrompt = `
//                             Kamu adala  h MTI ICT Helpdesk. Berdasarkan data yang akan saya berikan, kirimkan pesan dengan format:
//                             Pak ${mentions.map(mention => `@${mention}`).join(', ')}, terlampir SRF ${attachmentName}, dengan ticket ID ${requestDetails.id} dari (requester), terkait (jelaskan isi requestnya). Silahkan direview untuk approvalnya.
//                             Data:\n\n ${prompt} ${combinedResult}
//                         `;

//                         const finalAnalysis = await getAnswerAI(updatedPrompt);

//                         await sendGroupMessage(chatId, finalAnalysis, mentions, documentPath = pdfPath);

//                         // Store the result
//                         analyzedResults.push({ name: attachmentName, analysis: finalAnalysis, pdfPath });

//                         // Clean up generated images
//                         await Promise.all(imagePaths.map((imagePath) => fs.unlinkSync(imagePath)));
//                     } 
//                     else {
//                         console.log(`PDF does not contain SRF-related content: ${attachmentName}`);
//                     }
//                 }


//                 // else if (contentType.startsWith('application/pdf')) {
//                 //     console.log(`Processing PDF: ${attachmentName}`);

//                 //     const outputDir = path.join(__dirname, 'temp_pdf_images');
//                 //     if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

//                 //     const pdfBuffer = response.data;
//                 //     const pdfPath = path.join(outputDir, attachmentName);
//                 //     fs.writeFileSync(pdfPath, pdfBuffer);
//                 //     console.log(`PDF saved to: ${pdfPath}`);

//                 //     const imagePaths = await convertPDFToImages(pdfPath, outputDir);

//                 //     // Analyze all PDF pages in parallel
//                 //     const pdfPrompt = `Extract requester name, the thing the user requested, and approval status from the direct manager.\n`;
//                 //     const pdfAnalysisResults = await Promise.all(
//                 //         imagePaths.map(async (imagePath) => {
//                 //             const base64Image = fs.readFileSync(imagePath).toString('base64');
//                 //             return await analyzeImageGemini(base64Image, pdfPrompt);
//                 //         })
//                 //     );
//                 //     const mentions = isTestEnvironment 
//                 //         ? ['6285712612218', '6281130569787'] 
//                 //         : ['6282323336511', '6285712612218', '6285758070996'];
//                 //     // Combine and process results
//                 //     const combinedResult = pdfAnalysisResults.join('\n');
    
//                 //     const updatedPrompt = `
//                 //         Kamu adalah MTI ICT Helpdesk. Berdasarkan data yang akan saya berikan, kirimkan pesan dengan format:
//                 //         Pak ${mentions.map(mention => `@${mention}`).join(', ')}, terlampir SRF ${attachmentName}, dengan ticket ID ${requestDetails.id} dari (requester), terkait (jelaskan isi requestnya). Silahkan direview untuk approvalnya.
//                 //         Data:\n\n ${prompt} ${combinedResult}
//                 //     `;

//                 //     console.log(updatedPrompt);

//                 //     const finalAnalysis = await getAnswerAI(updatedPrompt);
                    
//                 //     await sendGroupMessage(chatId, finalAnalysis, mentions, documentPath = pdfPath);

//                 //     // Store the result
//                 //     analyzedResults.push({ name: attachmentName, analysis: finalAnalysis, pdfPath });

//                 //     // Clean up generated images
//                 //     await Promise.all(imagePaths.map((imagePath) => fs.unlinkSync(imagePath)));
//                 // }
//                  else {
//                     console.log(`Skipping unsupported attachment: ${attachmentName}`);
//                 }
//             } catch (error) {
//                 console.error(`Error handling attachment ${attachment.name}:`, error.message);
//             }
//         })
//     );

//     return analyzedResults;
// }


// // async function ticket_report(days = 7) { // Default to 7 days if no period specified
// //     console.log("Fetching all request IDs...");
// //     const request_ids = await get_all_requests(days);
// //     console.log(`Retrieved ${request_ids.length} request IDs.`);
// //     const report_data = [];
    
// //     for (const request_id of request_ids) { // Iterate directly over request IDs
// //         //console.log(`Fetching details for request ID: ${request_id}`);
// //         const request_details = await view_request(request_id);
// //         //console.log(`Retrieved details for request ID: ${request_id}`);
// //         if (request_details) {
// //             const requester_name = request_details.requester?.name || 'N/A';
// //             const service_category = request_details.service_category?.name || 'N/A';
// //             const status = request_details.status?.name || 'N/A';
// //             const ict_technician = request_details.udf_fields?.udf_pick_601 || 'N/A';
// //             const technician_name = request_details.technician?.name || 'N/A';
// //             report_data.push({
// //                 request_id,
// //                 requester_name,
// //                 created_time: request_details.created_time?.display_value || 'N/A',
// //                 service_category,
// //                 status,
// //                 ict_technician,
// //                 technician_name
// //             });
// //         }
// //     }
  
// //     // Aggregating data by technician
// //     const technician_data = {};
// //     for (const data of report_data) {
// //         const technician = data.ict_technician;
// //         if (!technician_data[technician]) {
// //             technician_data[technician] = {
// //                 status: {},
// //                 service_category: {},
// //                 total_tickets: 0
// //             };
// //         }
  
// //         // Count status
// //         if (!technician_data[technician].status[data.status]) {
// //             technician_data[technician].status[data.status] = 0;
// //         }
// //         technician_data[technician].status[data.status]++;
  
// //         // Count service category
// //         if (!technician_data[technician].service_category[data.service_category]) {
// //             technician_data[technician].service_category[data.service_category] = 0;
// //         }
// //         technician_data[technician].service_category[data.service_category]++;
        
// //         // Increment total tickets
// //         technician_data[technician].total_tickets++;
// //     }
  
// //     // Building the report text
// //     let report_text = `*Ticket Report for Last ${days} Days*\n\n`;
// //     for (const [technician, details] of Object.entries(technician_data)) {
// //         report_text += `### ${technician} (Total: ${details.total_tickets} Tickets)\n`;
// //         report_text += `- Status:\n`;
// //         for (const [status, count] of Object.entries(details.status)) {
// //             report_text += `  - ${status}: ${count} Tiket\n`;
// //         }
// //         report_text += `- Service Category:\n`;
// //         for (const [category, count] of Object.entries(details.service_category)) {
// //             report_text += `  - ${category}: ${count} Tiket\n`;
// //         }
// //         report_text += `\n`;
// //     }
  
// //     // Add total tickets at the end
// //     const totalTickets = report_data.length;
// //     report_text += `*Total Tickets in Last ${days} Days: ${totalTickets}*`;
  
// //     return report_text;
// //   }

// module.exports = {
//     get_all_requests,
//     view_request,
//     updateRequest,
//     handleCreateTicket, 
//     defineServiceCategory,
//     ticket_report, // Added ticket_report to the exports
//     handleAndAnalyzeAttachments
// };