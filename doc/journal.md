# WhatsApp API Project Journal

## Project Overview
This journal documents the development and current state of the WhatsApp API integration system for enterprise automation and helpdesk operations.

---

## Entry: July 30, 2025

### Current System State

#### **Architecture & Technology Stack**
- **Backend Framework**: Node.js with Express.js
- **WhatsApp Integration**: @whiskeysockets/baileys v6.7.18
- **Real-time Communication**: Socket.IO for web interface
- **Database**: Microsoft SQL Server with connection pooling
- **AI Integration**: OpenAI GPT-4o, Google Gemini, Perplexity API
- **Containerization**: Docker with docker-compose orchestration
- **Authentication**: Multi-file auth state for WhatsApp sessions

#### **Core Features Implemented**

##### **1. WhatsApp Bot Commands**
- **User Management Commands**:
  - `/finduser <username>` - Search Active Directory users
  - `/resetpassword <username>` - Reset user passwords with authorization
  - `/newuser <username> <email>` - Create new AD users with document attachment

- **WiFi Management Commands**:
  - `/addwifi <pool> <mac> <comment> [/days <number>]` - Add WiFi users with expiration
  - `/checkwifi <mac>` - Check WiFi user status
  - `/movewifi <old_pool> <new_pool> <mac>` - Move users between pools
  - `/pools` - List available WiFi pools
  - `/leasereport` - Display users with limited expiration

- **System Monitoring Commands**:
  - `/getups <ups_id>` - Retrieve UPS status from Zabbix (supports pyr, mkt identifiers)
  - `/getasset <asset_id>` - Get asset details from Snipe-IT
  - `/getbitlocker <hostname>` - Retrieve BitLocker recovery keys

- **Helpdesk Commands**:
  - `/ticketreport [days] [technician]` - Generate ServiceDesk Plus reports

- **Utility Commands**:
  - `/alarm` - Schedule alarms with recurring options
  - `/help [command]` - Display command help
  - `/clearthread` - Clear conversation threads

##### **2. AI-Powered Features**
- **Image Analysis**: GPT-4o integration for analyzing images and documents

##### **3. Testing Infrastructure**
- **Group Message Testing**: Created comprehensive test scripts for `/send-group-message` endpoint
  - `test-group-message.js` - Simple test script for basic group message functionality
  - `test-group-message-comprehensive.js` - Advanced test suite covering:
    - Simple text messages
    - Messages with mentions
    - Group ID vs group name usage
    - Error handling for invalid requests
    - Non-existent group validation
  - All tests validate proper IP authentication and response handling
- **Conversation Handling**: Context-aware responses with quoted message support
- **Smart Routing**: Automatic message classification and routing
- **Multi-modal Processing**: Text, image, and document analysis

##### **4. Session Management & Error Handling**

**Bad MAC Error Resolution (2025-08-05 08:49:21)**
- **Issue**: Recurring "Bad MAC Error" messages from libsignal during WhatsApp message decryption
- **Root Cause**: Corrupted WhatsApp session files in `auth_info` directory and `baileys_store.json`
- **Solution Implemented**:
  - Created `fix-session-errors.js` script for automated session cleanup
  - Created `session-error-handler.js` for proactive error detection and recovery
  - Created `session-error-patch.js` for integration with main application

**Session Cleanup Tools**
- **fix-session-errors.js**: Manual session cleanup utility
  - `node fix-session-errors.js` - Check session health
  - `node fix-session-errors.js --clean` - Clean corrupted session files
  - Removes `auth_info` directory
  - Backs up and clears `baileys_store.json`
  - Requires QR code re-authentication after cleanup

- **session-error-handler.js**: Automated error recovery system
  - `SessionErrorHandler` class for monitoring session health
  - Automatic cleanup when error threshold is reached
  - Session statistics and health monitoring
  - Integration endpoints: `/session-health`, `/session-cleanup`

**Resolution Process**
1. Identified corrupted session files causing Bad MAC errors
2. Executed session cleanup: `node fix-session-errors.js --clean`
3. Restarted WhatsApp server with clean session state
4. Server successfully initialized and generated new QR code
5. Ready for re-authentication to resolve Bad MAC errors permanently

**Docker Environment Support (2025-08-05 08:54:10)**
- **Docker-Specific Tools Created**:
  - `fix-session-errors-docker.js` - Docker container session management
  - `docker-session-manager.sh` - Comprehensive Docker session management script
  - `docker-compose.session-fix.yml` - Enhanced Docker Compose with session management
  - `Dockerfile.session-enhanced` - Enhanced Dockerfile with session management capabilities
  - `container-session-manager.sh` - Internal container session management

**Docker Session Management Features**:
- **Container Health Checks**: Automatic monitoring of WhatsApp API service health
- **Session Cleanup in Containers**: Clean corrupted sessions without stopping containers
- **Automated Backup**: Automatic backup of session files before cleanup
- **Volume Management**: Persistent session data with proper volume mapping
- **Error Monitoring**: Real-time monitoring for Bad MAC errors with auto-recovery
- **Graceful Restart**: Container restart capabilities with session preservation

**Docker Usage Examples**:
```bash
# Check session health in Docker
./docker-session-manager.sh health

# Clean corrupted sessions in Docker
./docker-session-manager.sh clean

# Restart Docker services
./docker-session-manager.sh restart

# Monitor container logs
./docker-session-manager.sh logs

# Execute commands in container
./docker-session-manager.sh exec bash
```

**Docker Compose Integration**:
- Enhanced compose file with health checks and session volumes
- Automatic session backup directory creation
- Environment variables for session management configuration
- Optional session monitoring service

**Container Features**:
- Built-in health checks for service monitoring
- Automatic session directory initialization
- Error monitoring with configurable auto-cleanup
- Graceful shutdown handling
- Persistent session data across container restarts

##### **3. Enterprise System Integrations**

- **Active Directory/LDAP**:
  - User authentication and management
  - Password reset functionality
  - User creation with proper attributes

- **ServiceDesk Plus**:
  - Automatic ticket creation from WhatsApp messages
  - Real-time webhook notifications
  - Technician assignment and routing
  - Ticket status updates and notifications

- **Zabbix Monitoring**:
  - UPS status monitoring
  - System health checks
  - Alert integration

- **Microsoft Graph API**:
  - OneDrive integration
  - Exchange Web Services
  - Document processing

- **RouterOS (MikroTik)**:
  - WiFi user management
  - Pool-based access control
  - Lease reporting

- **Snipe-IT Asset Management**:
  - Asset lookup and details
  - Inventory integration

##### **4. Security & Access Control**
- **IP Whitelisting**: Restricts API access to authorized IP addresses
- **Phone Number Validation**: Allowed/restricted number lists for command access
- **Role-based Permissions**: Different access levels for different users
- **HTTPS Agent Configuration**: Handles self-signed certificates for internal APIs

##### **5. Message Processing Pipeline**
- **Multi-format Support**: Text, images, documents, videos with captions
- **Group Management**: Automatic group detection and message routing
- **Quoted Message Handling**: Context preservation for threaded conversations
- **Real-time Notifications**: Instant delivery via Socket.IO
- **Message Persistence**: History storage with baileys_store.json

#### **File Structure**
```
├── index.js (8,043 lines) - Main application logic
├── modules/
│   ├── ticket_handle.js - ServiceDesk Plus integration
│   ├── db.js - Database connections
│   ├── microsoftGraph.js - Microsoft Graph API
│   ├── onedrive.js - OneDrive integration
│   └── perplexity.js - Perplexity AI integration
├── utils/
│   ├── historyStore.js - Message history management
│   ├── lidResolver.js - Contact mapping for JID to phone number resolution
│   └── messageFormatter.js - WhatsApp text formatting
├── contact_mapping.json - Persistent storage for JID to phone mappings
├── docker-compose.yml - Container orchestration
├── package.json - Dependencies and scripts
└── README.md - Project documentation (minimal)
```

#### **Key Functions**
- `startSock()` - WhatsApp socket initialization and connection management
- `handleMessage()` - Main message processing and routing logic
- `handleChatBot()` - Command processing and execution
- `handleCreateTicket()` - ServiceDesk Plus ticket creation
- `handleAlarm()` - Alarm scheduling and management

#### **Current Deployment**
- **Environment**: Docker containerized
- **Port**: 8192 (exposed)
- **Volumes**: templates.json, baileys_store.json mounted
- **Restart Policy**: unless-stopped
- **Development Mode**: Available with nodemon and debugging

#### **Dependencies (Key)**
- @whiskeysockets/baileys: ^6.7.18
- express: ^4.21.2
- socket.io: Latest
- openai: ^4.86.2
- @google/generative-ai: ^0.24.0
- axios: ^1.8.3
- mssql: ^11.0.1
- activedirectory2: ^2.2.0
- node-routeros: ^1.6.8

#### **Current Status**
✅ **Operational Features**:
- WhatsApp connection and message handling
- All bot commands functional
- AI integrations working
- Enterprise system connections established
- Real-time notifications active
- Docker deployment ready

⚠️ **Areas for Enhancement**:
- Documentation needs expansion
- Code modularization opportunities in index.js
- Test coverage implementation needed
- Structured logging system
- Configuration centralization

#### **Recent Changes**
- Implemented comprehensive command help system
- Added BitLocker recovery key retrieval
- Enhanced WiFi management with pool support
- Improved error handling across all modules
- Added support for document processing with AI analysis
- **NEW: Contact Mapping System for LID Resolution**
  - Created `utils/lidResolver.js` for automatic JID to phone number mapping
  - Integrated contact mapping into message and reaction processing
  - Enhanced reaction-based ticket assignment to handle WhatsApp LIDs
  - Added persistent storage in `contact_mapping.json`
  - Improved phone number resolution for helpdesk operations
  - Fixed export/import issues for `phoneNumberFormatter` function
  - Added `scanBaileysStore()` function to extract existing contact data from message history
  - **Improved Algorithm Flow:**
    - **Startup**: Check if contact file exists, create if missing, then scan Baileys store
    - **Runtime**: Automatically detect and map new contacts from incoming messages
    - Enhanced logging with emojis for better monitoring and debugging
    - Prevents duplicate mappings by checking existing contacts before adding new ones
  - **FIXED: Unnecessary Regular Phone Number Mappings**
    - System now only creates mappings for actual LIDs (non-numeric JIDs)
    - Regular phone numbers (like 6281290963185) no longer get bidirectional mappings
    - Cleaned up existing contact_mapping.json to remove redundant phone number mappings
    - Improved efficiency by avoiding unnecessary storage of regular phone number mappings
  - **NEW: PushName Similarity Matching for LID Resolution**
    - Implemented automatic LID to phone number mapping using pushName similarity
    - System now extracts and stores pushNames from all incoming messages (both LIDs and phone numbers)
    - Uses Levenshtein distance algorithm for fuzzy matching of similar names
    - Automatic mapping when exact pushName match found with single phone number
    - Intelligent similarity matching with 80% threshold for near-exact matches
    - Enhanced logging shows pushNames alongside LIDs for better visibility
    - Persistent storage of pushName mappings in contact_mapping.json
    - Historical message scanning now includes pushName extraction from Baileys store
    - Added statistics and debugging functions for pushName mapping analysis
  - **CRITICAL BUG FIX: LID Detection Logic**
    - **Issue:** `scanBaileysStore()` was incorrectly identifying LIDs using regex `/^\d+$/` which failed for numeric LIDs like `80444922015783@lid`
    - **Root cause:** LIDs can be numeric, so checking only the part before `@` was insufficient
    - **Solution:** Changed LID detection to check for `@lid` suffix instead of non-numeric pattern
    - **Impact:** Now correctly detects and maps LIDs from existing baileys store data
  - **Circular Dependency Resolution:**
    - **Issue:** Circular import between `index.js` and `utils/lidResolver.js` via `phoneNumberFormatter`
    - **Solution:** Extracted `phoneNumberFormatter` to separate `utils/phoneFormatter.js` module
    - **Files affected:** `utils/phoneFormatter.js` (new), `utils/lidResolver.js`, `index.js`
  - **RUNTIME LID DETECTION FIX:**
    - **Issue:** `processMessageForMapping()` and `processReactionForMapping()` still used old regex-based LID detection
    - **Problem:** Runtime messages with LIDs like `80444922015783@lid` were incorrectly treated as regular phone numbers
    - **Solution:** Updated both functions to use `@lid` suffix detection instead of numeric regex
    - **Result:** LIDs are now correctly identified and processed during real-time message handling
    - **Files affected:** `utils/lidResolver.js` (processMessageForMapping, processReactionForMapping functions)
  - **PHONE NUMBER RESOLUTION FIX:**
    - **Issue:** `resolvePhoneNumber()` was still formatting LIDs as phone numbers when no mapping existed
    - **Problem:** Unmapped LIDs like `80444922015783@lid` were converted to `80444922015783@c.us` via phoneNumberFormatter
    - **Solution:** Added LID detection in `resolvePhoneNumber()` to return null for unmapped LIDs instead of formatting them
    - **Additional:** Updated `index.js` reaction handling to skip technician lookup when resolvePhoneNumber returns null
    - **Result:** LIDs are no longer incorrectly formatted as phone numbers; proper warning messages for unmapped LIDs
    - **Files affected:** `utils/lidResolver.js` (resolvePhoneNumber function), `index.js` (reaction handling)

#### **Next Steps**
- Expand README.md with comprehensive setup instructions
- Implement unit testing framework
- Add structured logging with Winston or similar
- Create configuration management system
- Optimize large functions in index.js
- Add monitoring and health check endpoints

---

## Entry: January 31, 2025

### Fixed LID Contact Mapping Issue

#### **Problem**
- LID (Local Identifier) to phone number mapping was not working
- The `contactMapping[cleanJid]` lookup in `lidResolver.js` was always returning null
- Contact mapping file structure had actual mappings nested incorrectly

#### **Root Cause**
- The `contact_mapping.json` file had `contactMapping` object containing only metadata
- Actual LID-to-phone relationships were stored in `pushNameMappings` but not being converted to direct mappings
- The loading logic wasn't building the required LID-to-phone mappings from the pushName data

#### **Solution**
1. **Enhanced Contact Mapping Loading** (`utils/lidResolver.js`):
   - Added `buildLidToPhoneMappings()` function to construct LID-to-phone mappings from pushName data
   - Modified `loadContactMapping()` to call the builder function after loading pushName mappings
   - Added proper handling of nested contact mapping structure

2. **Improved Debugging**:
   - Added detailed logging to show available mapping keys during lookup
   - Added logging to show the mapping building process
   - Added sample mapping display for troubleshooting

#### **Technical Changes**
- **File**: `utils/lidResolver.js`
  - Added `buildLidToPhoneMappings()` function (lines 11-47)
  - Enhanced `loadContactMapping()` with proper data structure handling
  - Added comprehensive debug logging in `getPhoneFromJid()`

#### **Result**
- LID `80444922015783` now correctly maps to phone `6285712612218@c.us`
- Contact mapping system shows 4 total mappings instead of 0
- Debug logs confirm successful mapping: "🔗 Built mapping: LID 80444922015783 <-> Phone 6285712612218@c.us (via pushName: Widji)"

#### **Files Modified**
- `utils/lidResolver.js` - Fixed contact mapping loading and added LID-to-phone mapping builder

---

## 2025-01-31 - Fixed Command Parameter Validation

### Problem
- Error "Cannot read properties of undefined (reading 'replace')" when typing `/addwifi` without proper parameters
- Similar potential issues in other commands that parse parameters without validation
- Commands would crash when users didn't provide required parameters

### Root Cause
- Commands like `/addwifi`, `/getbitlocker`, and `/resetpassword` were trying to access array elements without checking if they exist
- Missing parameter validation before attempting to use `.replace()` or other methods on potentially undefined values

### Solution
1. **Added Parameter Validation** for critical commands:
   - `/addwifi` - Validates poolName and macAddress parameters
   - `/getbitlocker` - Validates hostname parameter  
   - `/resetpassword` - Validates username and newPassword parameters

2. **Improved Error Messages**:
   - Added helpful usage examples for each command
   - Clear error messages with proper command syntax
   - Early return to prevent further execution on invalid input

### Technical Changes
- **File**: `index.js`
  - Added parameter validation for `/addwifi` command (lines 5487-5492)
  - Added parameter validation for `/getbitlocker` command (lines 5331-5337)
  - Added parameter validation for `/resetpassword` command (lines 5292-5298)

### Result
- Commands now provide helpful error messages instead of crashing
- Users get clear guidance on proper command usage
- Application stability improved for malformed commands

#### **Files Modified**
- `utils/lidResolver.js` - Fixed contact mapping loading and added LID-to-phone mapping builder
- `index.js` - Added parameter validation for WhatsApp commands

---

## 2025-01-31 - Enhanced Photo Handling for /finduser Command

### Problem
- `/finduser widji /photo` command sometimes fails to return photos
- No detailed logging to diagnose photo retrieval failures
- Users receive no feedback when photos are unavailable or fail to load
- No validation of photo data integrity before sending

### Root Cause Analysis
Several potential issues identified:
1. **Database Issues**: Records might not exist, be marked as deleted, or have null/empty PHOTO fields
2. **Data Integrity**: Photo data might be corrupted or in unexpected formats
3. **Missing Employee ID**: Users without employeeID cannot have photos retrieved
4. **Silent Failures**: Errors were logged but users received no feedback about photo status

### Solution
1. **Enhanced Database Function** (`modules/db.js`):
   - Added comprehensive logging for photo retrieval process
   - Added validation to check if records exist but are marked as deleted
   - Added detailed error reporting with stack traces
   - Enhanced query to return additional debugging fields

2. **Photo Data Validation**:
   - Created `validatePhotoData()` function to check photo integrity
   - Validates photo buffer size and format (JPEG, PNG, BMP, GIF)
   - Checks for valid image file signatures
   - Prevents sending corrupted or invalid photo data

3. **Improved User Feedback**:
   - Added photo status indicators in user captions
   - Clear messages for different failure scenarios:
     - "(No photo available)" - Photo not found in database
     - "(No Employee ID)" - User has no employeeID for photo lookup
     - "(Photo retrieval failed)" - Database error occurred
     - "(Invalid photo data)" - Photo data failed validation
     - "📷" - Photo successfully retrieved and validated

4. **Enhanced Logging**:
   - Added emoji-based logging for easy identification
   - Detailed logging of photo retrieval steps
   - Photo validation results with format and size information
   - Database query results and record status

### Technical Changes
- **File**: `modules/db.js`
  - Enhanced `getUserPhotoFromDB()` with comprehensive logging and error handling
  - Added `validatePhotoData()` function for photo integrity validation
  - Added fallback queries to diagnose missing records

- **File**: `index.js`
  - Imported `validatePhotoData` function
  - Enhanced photo handling in `handleFindUser()` with validation
  - Added photo status indicators in user captions
  - Improved error handling and user feedback

### Additional Fix - Database Connection Issue

**Problem**: "Connection is closed" error when fetching photos from database
**Root Cause**: Database connection pool was timing out or getting closed during photo retrieval operations
**Solution**: 
- Added `ensureConnection()` function to check and reconnect database pool before queries
- Enhanced connection health checks and automatic reconnection logic
- Improved error handling for connection failures

### Critical Bug Fix - Variable Initialization Error

**Problem**: `ReferenceError: Cannot access 'photoStatus' before initialization` in `/finduser` command
**Root Cause**: The `photoStatus` variable was being used in caption construction before it was declared and initialized
**Solution**: 
- Moved photo processing logic before caption construction
- Initialized `photoBuffer` and `photoStatus` variables at the beginning of the user processing loop
- Ensured proper variable scope and initialization order

**Technical Changes**:
- **File**: `index.js` - `handleFindUser` function
- **Change**: Reordered code to initialize photo variables before building caption
- **Result**: Fixed ReferenceError and restored proper `/finduser /photo` functionality

### Result
- Users now receive clear feedback about photo availability status
- Comprehensive logging helps diagnose photo retrieval issues
- Photo data validation prevents sending corrupted images
- Database connection issues resolved with automatic reconnection
- Variable initialization errors fixed
- Better error handling improves user experience
- Detailed debugging information for troubleshooting

#### **Files Modified**
- `utils/lidResolver.js` - Fixed contact mapping loading and added LID-to-phone mapping builder
- `index.js` - Added parameter validation for WhatsApp commands and enhanced photo handling
- `modules/db.js` - Enhanced photo retrieval with validation and comprehensive logging

---

*Journal maintained by: Development Team*  
*Last updated: January 31, 2025*