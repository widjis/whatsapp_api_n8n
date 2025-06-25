// oneDrive.js
const msal = require('@azure/msal-node');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // Import exec to run the Edge command
const ExcelJS = require('exceljs');

// Replace these values with your tenant information
const clientId = '7a998675-357c-49ea-a462-fcf70afd6557';
const tenantId = 'b428d519-22b4-458f-af45-f020150f5839';



// Authority URL
const authorityUrl = `https://login.microsoftonline.com/${tenantId}`;

// The scope needed to access OneDrive
const scopes = ["Files.ReadWrite.All"];

// Create a MSAL public client application
const msalConfig = {
    auth: {
        clientId: clientId,
        authority: authorityUrl,
    }
};

// Cache file location
const cacheFilePath = path.join(__dirname, 'token_cache.json');
const excelSheetFilePath = path.join(__dirname, 'IT_PRF_Status_Sheet.xlsx'); // Define the local file path for the sheet

const cca = new msal.PublicClientApplication(msalConfig);

// Function to load cache from file
function loadCache() {
    console.log('Attempting to load cache from file:', cacheFilePath);
    if (fs.existsSync(cacheFilePath)) {
        console.log('Cache file exists. Reading data...');
        const cacheData = fs.readFileSync(cacheFilePath, 'utf8');
        console.log('Cache data loaded successfully.');
        return JSON.parse(cacheData);
    }
    console.log('Cache file does not exist. Returning null.');
    return null;
}

// Function to save cache to file
function saveCache(cache) {
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache), 'utf8');
}

// Load cache
const cache = loadCache();
if (cache) {
    cca.tokenCache.deserialize(cache);
}

async function getAccessToken() {
    let tokenResponse;

    try {
        // Attempt to acquire token silently (from cache)
        const accounts = await cca.getAllAccounts();
        console.log('Accounts in cache:', accounts);
        
        if (accounts.length > 0) {
            console.log('Attempting to acquire token silently...');
            tokenResponse = await cca.acquireTokenSilent({
                scopes: scopes,
                account: accounts[0],
            });
            console.log('Token acquired silently from cache.');
        } else {
            console.log('No accounts found in cache.');
        }

        // Check if silent acquisition returned a valid token
        if (!tokenResponse) {
            console.log('Silent token acquisition did not return a valid token. Attempting device code flow...');
            // Attempt to acquire token interactively
            const deviceCodeResponse = await cca.acquireTokenByDeviceCode({
                scopes: scopes,
                deviceCodeCallback: (response) => {
                    console.log('Device code flow response message:', response.message);
                    console.log('Please open the following URL in your browser and enter the code to authenticate:');
                    console.log(`URL: ${response.verificationUri}`);
                    console.log(`User Code: ${response.userCode}`);

                    // Open the URL using Microsoft Edge
                    const edgeCommand = process.platform === 'win32' 
                        ? `start microsoft-edge:${response.verificationUri}` // Windows command to open Edge
                        : `open -a "Microsoft Edge" ${response.verificationUri}`; // macOS command to open Edge
                    exec(edgeCommand, (error) => {
                        if (error) {
                            console.error('Failed to open Microsoft Edge:', error);
                        }
                    });
                }
            });
            tokenResponse = deviceCodeResponse;
            console.log('Token acquired interactively using device code.');
        }

    } catch (error) {
        console.error('Unexpected error during token acquisition:', error);
        throw error;
    }

    if (tokenResponse) {
        // Save the cache after acquiring the token
        saveCache(cca.tokenCache.serialize());
        return tokenResponse.accessToken;
    } else {
        throw new Error("Failed to acquire token");
    }
}

async function createAxiosInstance() {
    const accessToken = await getAccessToken();
    return axios.create({
        baseURL: 'https://graph.microsoft.com/v1.0/',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
}

// List shared files in OneDrive
async function listSharedFiles() {
    const axiosInstance = await createAxiosInstance();
    try {
        const response = await axiosInstance.get('me/drive/sharedWithMe');
        const files = response.data.value;
        files.forEach(file => {
            const name = file.name || 'No Name';
            const fileId = file.id || 'No ID';
            const createdBy = file.createdBy || {};
            const ownerName = createdBy.user ? createdBy.user.displayName : 'Unknown';
            console.log(`Name: ${name}, Id: ${fileId}, Owner: ${ownerName}`);
        });
    } catch (error) {
        console.error('Error fetching shared files:', error.response?.status);
        console.error(error.response?.data);
    }
}

// Find a file by name in "Shared with Me"
async function findSharedFileByName(fileName) {
    const axiosInstance = await createAxiosInstance();
    try {
        const response = await axiosInstance.get('me/drive/sharedWithMe');
        const files = response.data.value;

        // Filter files by name
        const matchingFiles = files.filter(file => file.name && file.name.includes(fileName));

        if (matchingFiles.length > 0) {
            console.log(`Found ${matchingFiles.length} file(s) matching '${fileName}':`);
            matchingFiles.forEach(file => {
                const name = file.name || 'No Name';
                const fileId = file.remoteItem.id || 'No ID';
                
                // Extract web URL
                let webUrl = 'No URL';
                if (file.remoteItem && file.remoteItem.webUrl) {
                    webUrl = file.remoteItem.webUrl;
                }

                console.log(`Name: ${name}, Id: ${fileId}, Web URL: ${webUrl}`);
            });

            // Return the ID and parentReference of the first matching file
            const firstFile = matchingFiles[0];
            return {
                fileId: firstFile.remoteItem.id,
                parentReference: firstFile.remoteItem.parentReference // Use this for the correct site and drive IDs
            };
        } else {
            console.log(`No files found matching '${fileName}'.`);
            return null; // Return null if no files are found
        }
    } catch (error) {
        console.error('Error searching for shared files:', error.message);
        
        if (error.response) {
            console.error('Error response status:', error.response.status);
            console.error('Error response data:', error.response.data);
        } else if (error.request) {
            console.error('Error request data:', error.request);
        } else {
            console.error('General Error:', error.message);
        }
        return null; // Return null if an error occurs
    }
}

// Read the "MTI Mailing List" sheet
async function readMTIMailingListSheet(fileName) {
    const fileData = await findSharedFileByName(fileName);

    if (!fileData) {
        console.log(`File '${fileName}' not found.`);
        return null;
    }

    const { fileId, parentReference } = fileData;
    const axiosInstance = await createAxiosInstance();

    try {
        // Use the parentReference if available to get the original location
        const url = parentReference 
            ? `sites/${parentReference.siteId}/drives/${parentReference.driveId}/items/${fileId}/content`
            : `me/drive/items/${fileId}/content`; // fallback to default

        const response = await axiosInstance.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.getWorksheet('List New Hire');
        if (!worksheet) {
            console.log('Sheet "List New Hire" not found.');
            return null;
        }

        return worksheet; // Return the loaded worksheet
    } catch (error) {
        console.error('Error reading MTI Mailing List sheet:', error.response?.status);
        
        if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response headers:', error.response.headers);

            const errorMessage = error.response.data?.error?.message || 'No error message provided';
            console.error('Detailed error message:', errorMessage);
        } else {
            console.error('Error:', error.message);
        }
        return null;
    }
}
// Read the "MTI Mailing List.xlsx" in sheet "List New Hire"

async function readMTIMailingList() {
    const fileName = 'MTI Mailing List.xlsx';
    const worksheet = await readMTIMailingListSheet(fileName);

    if (!worksheet) {
        console.log('Failed to read the MTI Mailing List sheet.');
        return null;  // Ensure you return null if the worksheet is not found
    }

    return worksheet;  // Returning the worksheet directly
}



// async function readMTIMailingList() {
//     const fileName = 'MTI Mailing List.xlsx';
//     const worksheet = await readMTIMailingListSheet(fileName);

//     if (!worksheet) {
//         console.log('Failed to read the MTI Mailing List sheet.');
//         return;
//     }

//     // Create a table header
//     console.log('Processing MTI Mailing List for new user account creation:');
    
//     worksheet.eachRow((row, rowNumber) => {
//         if (rowNumber === 1) return; // Skip the header row
//         // Extract values from the row, ensuring we access the actual text content
//         const name = row.getCell(2).text || row.getCell(2).value || ''; // Handles both text and value
//         const title = row.getCell(3).text || row.getCell(3).value || '';
//         const department = row.getCell(4).text || row.getCell(4).value || '';
//         const email = row.getCell(5).text || row.getCell(5).value || '';
//         const directReport = row.getCell(6).text || row.getCell(6).value || '';
//         const noHP = row.getCell(7).text || row.getCell(7).value || 'N/A'; // Optional field
//         const accountCreation = row.getCell(10).text || row.getCell(10).value || ''; // Account creation status

//         // Initialize an array to collect missing fields
//         const missingFields = [];

//         // Check if at least one mandatory field (except email) is filled
//         if (name || title || department || directReport) {
//             const missingFields = [];
//             if (!name) missingFields.push('Name');
//             if (!title) missingFields.push('Title');
//             if (!department) missingFields.push('Department');
//             if (!directReport) missingFields.push('Direct Report');

//             // If there are missing fields, log them and skip the row
//             if (missingFields.length > 0) {
//                 console.log(`Skipping row ${rowNumber}: Missing fields: ${missingFields.join(', ')}`);
//                 return;
//             }
//         }

//         // Email is mandatory, check if it's missing or incomplete
//         if (!email || email === '@merdekabattery.com') {
//             //console.log(`Skipping row ${rowNumber}: Incomplete or missing Email`);
//             return;
//         }
//         // If account creation is already done, skip the row
//         if (accountCreation && accountCreation.trim().toLowerCase() === 'done') {
//             //console.log(`Skipping ${name}: Account already created`);
//             return;
//         }
//         // If account creation is not done, create a new account
//         console.log(`Creating account for ${name}, Title: ${title}, Department: ${department}, Email: ${email}, Direct Report: ${directReport}, No HP: ${noHP}`);
        
//         // Add your account creation logic here
//         // Example:
//         // await createAccount({ name, title, department, email, directReport, noHP });

//         // Mark account creation as done
//         //row.getCell(10).value = 'Done';
//         console.log(`Account creation done for ${name}`);
//     });
//     // Convert the workbook back to a buffer to upload
//     //const buffer = await worksheet.workbook.xlsx.writeBuffer();

//     // Upload the modified file back to OneDrive
//     //await uploadFileToOneDrive(buffer, fileName);
// }


// Read the "IT PRF Status" sheet
// async function readITPRFStatusSheet(fileName) {
//     const fileData = await findSharedFileByName(fileName);

//     if (!fileData) {
//         console.log(`File '${fileName}' not found.`);
//         return null;
//     }

//     const { fileId, parentReference } = fileData;
//     const axiosInstance = await createAxiosInstance();

//     try {
//         // Use the parentReference if available to get the original location
//         const url = parentReference 
//             ? `sites/${parentReference.siteId}/drives/${parentReference.driveId}/items/${fileId}/content`
//             : `me/drive/items/${fileId}/content`; // fallback to default

//         const response = await axiosInstance.get(url, { responseType: 'arraybuffer' });
//         const buffer = Buffer.from(response.data);
        
//         const workbook = new ExcelJS.Workbook();
//         await workbook.xlsx.load(buffer);
        
//         const worksheet = workbook.getWorksheet('IT PRF Status');
//         if (!worksheet) {
//             console.log('Sheet "IT PRF Status" not found.');
//             return null;
//         }

//         return worksheet; // Return the loaded worksheet
//     } catch (error) {
//         console.error('Error reading IT PRF Status sheet:', error.response?.status);
        
//         if (error.response) {
//             console.error('Error response data:', error.response.data);
//             console.error('Error response headers:', error.response.headers);

//             const errorMessage = error.response.data?.error?.message || 'No error message provided';
//             console.error('Detailed error message:', errorMessage);
//         } else {
//             console.error('Error:', error.message);
//         }
//         return null;
//     }
// }


// Function to delete the existing file if it exists
function deleteExistingFile() {
    if (fs.existsSync(excelSheetFilePath)) {
        fs.unlinkSync(excelSheetFilePath);
        console.log('Existing file deleted.');
    }
}

async function readITPRFStatusSheet(fileName) {
    let workbook;

    // Check if the file is already saved locally
    if (fs.existsSync(excelSheetFilePath)) {
        console.log(`Loading IT PRF Status sheet from local cache: ${excelSheetFilePath}`);
        workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelSheetFilePath);
    } else {
        // If not found locally, download it from OneDrive
        console.log(`File not found locally, downloading from OneDrive: ${fileName}`);
        const fileData = await findSharedFileByName(fileName);

        if (!fileData) {
            console.log(`File '${fileName}' not found.`);
            return null;
        }

        const { fileId, parentReference } = fileData;
        const axiosInstance = await createAxiosInstance();

        try {
            // Use the parentReference if available to get the original location
            const url = parentReference 
                ? `sites/${parentReference.siteId}/drives/${parentReference.driveId}/items/${fileId}/content`
                : `me/drive/items/${fileId}/content`; // fallback to default

            const response = await axiosInstance.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            const fullWorkbook = new ExcelJS.Workbook();
            await fullWorkbook.xlsx.load(buffer);

            // Extract only the "IT PRF Status" worksheet
            const worksheet = fullWorkbook.getWorksheet('IT PRF Status');
            if (!worksheet) {
                console.log('Sheet "IT PRF Status" not found.');
                return null;
            }

            // Create a new workbook and add the extracted worksheet
            workbook = new ExcelJS.Workbook();
            const newWorksheet = workbook.addWorksheet('IT PRF Status');

            // Copy the data from the original worksheet to the new worksheet
            worksheet.eachRow((row, rowNumber) => {
                const newRow = newWorksheet.getRow(rowNumber);
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    newRow.getCell(colNumber).value = cell.value;
                });
                newRow.commit();
            });

            // Save the new workbook locally
            await workbook.xlsx.writeFile(excelSheetFilePath);
            console.log(`Sheet "IT PRF Status" saved locally as ${excelSheetFilePath}`);

        } catch (error) {
            console.error('Error reading IT PRF Status sheet:', error.response?.status);
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Error response headers:', error.response.headers);
                const errorMessage = error.response.data?.error?.message || 'No error message provided';
                console.error('Detailed error message:', errorMessage);
            } else {
                console.error('Error:', error.message);
            }
            return null;
        }
    }

    const worksheet = workbook.getWorksheet('IT PRF Status');
    if (!worksheet) {
        console.log('Sheet "IT PRF Status" not found.');
        return null;
    }

    return worksheet; // Return the loaded worksheet
}


// Perform flexible queries on the PRF data
function flexibleQueryPRFData(worksheet, options = {}) {
    const {
        description = '',
        submitter = '',
        prfNumber = '',
        status = '',
        additionalKeywords = []
    } = options;

    const results = [];

    console.log("Starting flexible query on PRF data...");
    console.log(`Query Options - Description: "${description}", Submitter: "${submitter}", PRF Number: "${prfNumber}", Status: "${status}", Additional Keywords: ${additionalKeywords}`);

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            console.log("Skipping header row...");
            return; // Skip header row
        }
        // Commented out logging for processing row number
        // console.log(`Processing row number: ${rowNumber}`);

        // Safely retrieve cell values with optional chaining and default values
        const rowDescription = row.getCell(5)?.text?.toString() || ""; 
        const rowSubmitter = row.getCell(3)?.text?.toString() || "";
        const rowPRFNumber = row.getCell(4)?.text?.toString() || "";
        const rowStatus = row.getCell(8)?.text?.toString() || "";

        // Commented out logging for row data
        // console.log(`Row Data - Description: "${rowDescription}", Submitter: "${rowSubmitter}", PRF Number: "${rowPRFNumber}", Status: "${rowStatus}"`);

        let matches = true;

        // Apply filters if provided in options
        if (description && !rowDescription.toLowerCase().includes(description.toLowerCase())) {
            // Commented out logging for description filter
            // console.log(`Row ${rowNumber} does not match the description filter.`);
            matches = false;
        }
        if (submitter && !rowSubmitter.toLowerCase().includes(submitter.toLowerCase())) {
            // Commented out logging for submitter filter
            // console.log(`Row ${rowNumber} does not match the submitter filter.`);
            matches = false;
        }
        if (prfNumber && rowPRFNumber !== prfNumber) {
            // Commented out logging for PRF number filter
            // console.log(`Row ${rowNumber} does not match the PRF number filter.`);
            matches = false;
        }
        if (status && !rowStatus.toLowerCase().includes(status.toLowerCase())) {
            // Commented out logging for status filter
            // console.log(`Row ${rowNumber} does not match the status filter.`);
            matches = false;
        }

        // Check additional keywords if provided
        if (additionalKeywords && additionalKeywords.length > 0) {
            for (let keyword of additionalKeywords) {
                if (!rowDescription.toLowerCase().includes(keyword.toLowerCase())) {
                    // Commented out logging for additional keyword filter
                    // console.log(`Row ${rowNumber} does not match the additional keyword filter: "${keyword}".`);
                    matches = false;
                    break;
                }
            }
        }

        if (matches) {
            // Commented out logging for matching rows
            // console.log(`Row ${rowNumber} matches all filters.`);
            const rowData = [];
            for (let i = 1; i <= 12; i++) {
                // Safely get cell text or an empty string
                const cellValue = row.getCell(i)?.text || "";
                // Commented out logging for cell values
                // console.log(`Cell ${i} Value: "${cellValue}"`);
                rowData.push(cellValue.toString());
            }
            results.push(rowData);
        } else {
            // Commented out logging for non-matching rows
            // console.log(`Row ${rowNumber} does not match the query criteria.`);
        }
    });

    console.log(`Query completed. Total matching rows: ${results.length}`);
    return results;
}



// Handle PRF queries
async function handlePRFQuery({ fileName = 'IT PRF MONITORING - Updated.xlsx', description = '', submitter = '', prfNumber = '', status = '', additionalKeywords = [] }) {
    try {
        const worksheet = await readITPRFStatusSheet(fileName);
        
        if (!worksheet) {
            console.log(`Worksheet not found in the file '${fileName}'.`);
            return 'Worksheet not found in the specified file.';
        }

        // Perform the query with the provided parameters
        const result = flexibleQueryPRFData(worksheet, { description, submitter, prfNumber, status, additionalKeywords });
        
        if (result.length === 0) {
            return 'No matching records found for the provided criteria.';
        }

        // Format the results as sentences
        const sentences = result.map(row => `PRF Number: ${row[3]}, Description: ${row[4]}, Status: ${row[6]}, Submitter: ${row[2]}.`);
        
        // Log or return the formatted sentences
        console.log(sentences.join('\n'));
        return sentences.join('\n');
    } catch (error) {
        console.error('Error handling PRF query:', error.message);
        return `Error handling PRF query: ${error.message}`;
    }
}

// Export the necessary functions
module.exports = {
    listSharedFiles,
    findSharedFileByName,
    readITPRFStatusSheet,
    flexibleQueryPRFData,
    handlePRFQuery,
    readMTIMailingList, // Registering readMTIMailingList
    deleteExistingFile
};
