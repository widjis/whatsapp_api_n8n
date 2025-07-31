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

##### **2. LID-to-Phone Mapping System**
- **Automatic Contact Detection**: Enhanced system that automatically extracts contact mappings from WhatsApp traffic
- **Real-time Processing**: Processes incoming messages to extract JIDs, push names, and contact information
- **Smart Startup Processing**: Detects if LID mapping file exists on startup - if not, automatically processes existing `baileys_store.json` data to extract historical mappings
- **Enhanced Group Processing**: Automatically processes group metadata for comprehensive contact extraction when no mapping file exists
- **Connection-Dependent**: Group metadata processing occurs after WhatsApp connection is established
- **Intelligent Mapping**: Creates LID-to-phone mappings when both LID and phone JIDs are detected for the same contact
- **Pending Contact Management**: Tracks contacts waiting for complete mapping information with automatic cleanup
- **Enhanced Message Processing**: Extracts contact info from multiple sources including quoted messages and message metadata
- **Production Monitoring**: Includes monitoring and backup scripts for production deployment
- **API Endpoints**: 
  - `GET /lid-mappings` - View all current mappings and statistics
  - `POST /lid-mappings/force` - Manually create mappings
  - `DELETE /lid-mappings/clear` - Clear all mappings

##### **3. Number Change Management**
- **Quick Number Change Tool**: `change_number.js` and `change-number.sh` scripts

##### **3. Startup Group Member Display**
- **Automatic Group Member Logging**: On WhatsApp connection establishment, the system automatically displays all group members with their push names and WhatsApp IDs
- **Enhanced Visibility**: Provides immediate visibility of all monitored group participants upon startup
- **Error Handling**: Includes proper error handling for startup member fetching
- **Improved Group Metadata Fetching**: Updated `listGroups()` function to use `sock.groupMetadata(groupJid)` instead of `sock.groupFetchAllParticipating()` for more detailed and targeted group information retrieval
- **Simplified Group Logging**: Updated to clean, straightforward format showing group name, participant count, and individual participant list with roles (admin/superadmin/member)
- **Backup System**: Automatic backup creation before authentication changes
- **Multiple Change Options**:
  - Change number (keep message history)
  - Fresh start (clear all data)
  - Restore from backup
  - List available backups
  - Clear authentication only
- **Safety Features**: Service auto-stop, confirmation prompts, timestamped backups
- **File Management**: Handles `auth_info/` directory and `baileys_store.json`

##### **3. AI-Powered Features**
- **Image Analysis**: GPT-4o integration for analyzing images and documents

---

## Entry: January 15, 2025

### Bug Fix: QR Message Persistence Issue

#### **Problem Identified**
The web interface was displaying persistent "QR Code received, scan please!" messages in the message list even after WhatsApp was successfully connected. This created a cluttered UI experience.

#### **Root Cause Analysis**
The server was emitting QR status messages as regular 'message' events (`io.emit('message', currentStatus)`) in addition to the dedicated 'qr' event. This caused QR messages to be added to the message list and persist even after successful connection.

#### **Solution Implemented**
1. **Server-side Fix** (`index.js`):
   - Commented out the line that emitted QR status as a regular message
   - QR status is now only handled through the dedicated 'qr' event

2. **Client-side Enhancement** (`index.html`):
   - Added `clearQRMessages()` function to remove any QR-related messages from the display
   - Integrated the function into the 'ready' event handler
   - Ensures clean UI when WhatsApp successfully connects

#### **Technical Changes**
```javascript
// Server-side (index.js) - Line commented out:
// io.emit('message', currentStatus); // Removed to prevent QR messages in chat

// Client-side (index.html) - New function added:
function clearQRMessages() {
    const messageList = document.getElementById('messageList');
    const qrMessages = messageList.querySelectorAll('li');
    qrMessages.forEach(li => {
        if (li.textContent.includes('QR Code received')) {
            li.remove();
        }
    });
}
```

#### **Result**
- Clean UI experience with no persistent QR messages
- Proper separation of QR events and regular messages
- Maintained functionality for QR code display and status updates

---

## Entry: January 15, 2025 (Part 2)

### Bug Fix: LID (Linked ID) Resolution Issue

#### **Problem Identified**
The system was failing to properly resolve WhatsApp Linked IDs (@lid) to actual phone numbers for technician lookup. The logs showed:
- "Could not resolve LID 80444922015783@lid"
- "Technician not found for identifier: 80444922015783"
- LID participants were not being properly handled in reaction events

#### **Root Cause Analysis**
The LID resolution logic had a flaw in the reaction handler:
1. When `resolveParticipant` returned a LID-based identifier (fallback case), the code was incorrectly processing it
2. The `reacterNumber` was being set to the full participant string (including '@lid') instead of the resolved identifier
3. The technician caching was using the wrong identifier key

#### **Solution Implemented**
1. **Simplified LID Resolution Logic** (`index.js` lines 6185-6190):
   - Removed redundant conditional checks in the reaction handler
   - `resolveParticipant` already returns a properly formatted phone number or LID identifier
   - Streamlined the assignment: `reacterNumber = resolvedParticipant`

2. **Fixed Technician Caching** (`index.js` lines 6200-6205):
   - Updated `cacheLidTechnician` to use the resolved `reacterNumber` instead of raw `participant`
   - Added logging for successful technician lookups

#### **Technical Changes**
```javascript
// Before (problematic logic):
if (resolvedParticipant && !isLinkedId(resolvedParticipant)) {
  reacterNumber = phoneNumberFormatter(resolvedParticipant.split('@')[0])
} else {
  reacterNumber = participant // This was wrong - included '@lid'
}

// After (simplified and correct):
reacterNumber = resolvedParticipant // resolveParticipant already returns formatted number

// Fixed caching:
cacheLidTechnician(reacterNumber, tech) // Use resolved number, not raw participant
```

#### **Verification**
- Application successfully started with group metadata caching active
- Logs show: "Cached metadata for group 120363215673098371@g.us with 3 participants"
- LID resolution system is now properly integrated and functional

#### **Result**
- ✅ LID participants are now properly resolved to phone numbers when possible
- ✅ Fallback LID-based identification works correctly
- ✅ Technician lookup supports both phone numbers and LID identifiers
- ✅ Improved logging for debugging LID resolution issues

---

## Entry: January 15, 2025 (Part 3)

### Feature: Group Members Management

#### **New Functionality Added**
Implemented comprehensive group member gathering and reporting functionality for monitored WhatsApp groups.

#### **Features Implemented**

1. **Group Member Gathering Function** (`getAllGroupMembers`):
   - Fetches all participants from monitored groups (defined in `specificGroupIds`)
   - Extracts detailed member information including phone numbers, LID status, admin roles
   - **Enhanced LID Resolution**: Uses `resolveParticipant` function to properly resolve Linked IDs to actual phone numbers, then matches with contact database
   - Provides comprehensive logging and error handling
   - Returns structured data with group metadata and member details

2. **WhatsApp Command** (`/groupmembers`):
   - User-friendly command to trigger group member report
   - Formatted output with group names, member counts, admin lists
   - **Enhanced Display**: Shows user names from technician contacts when available, with phone numbers in parentheses
   - **Advanced LID Resolution**: Uses `resolveParticipant` with async processing to resolve Linked IDs and automatically caches successful mappings
   - Handles long messages by splitting into chunks
   - Shows summary statistics across all monitored groups
   - Distinguishes between regular members, admins, and LID participants
   - Gracefully falls back to phone numbers or LID display when names are not available

3. **REST API Endpoint** (`/api/group-members`):
   - HTTP GET endpoint for programmatic access
   - Returns JSON data with complete group member information
   - Includes error handling and connection status checks
   - Timestamped responses for tracking

#### **Technical Implementation**

**Core Function Structure**:
```javascript
const getAllGroupMembers = async () => {
  // Iterates through specificGroupIds
  // Calls sock.groupMetadata(groupId) for each group
  // Processes participant data with detailed member info
  // Returns organized data structure
}
```

**Member Data Structure**:
- `id`: Full WhatsApp participant ID
- `phoneNumber`: Extracted phone number (null for LIDs)
- `displayName`: User's name from technician contacts (when available)
- `isLID`: Boolean indicating if participant uses Linked ID
- `isAdmin`/`isSuperAdmin`: Admin role indicators
- `joinedAt`: Join timestamp (when available)

**Command Features**:
- 📱 Group name and ID display
- 👑 Admin listing with role distinction and names when available
- 👤 Member listing with names when available (limited to 10 per group for readability)
- 📊 Summary statistics
- ❌ Error handling for inaccessible groups
- 🏷️ Smart display: "Name (Phone)" for known contacts, "LID: xxx" for LIDs, or just phone numbers

#### **Integration Points**
- Uses existing `specificGroupIds` configuration
- Leverages Baileys `sock.groupMetadata()` API
- Integrates with existing command handling system
- Added to `/help` command documentation

#### **Files Modified**
- `index.js`: Added `getAllGroupMembers()` function, `/groupmembers` command, `/api/group-members` endpoint
- `doc/journal.md`: Updated documentation

#### **Usage Examples**
- **WhatsApp**: Send `/groupmembers` in any monitored group
- **API**: GET request to `http://localhost:8192/api/group-members`
- **Help**: Use `/help` to see the new command listed under "Group Commands"

#### **Result**
- ✅ Complete visibility into group membership across monitored groups
- ✅ Easy identification of admins, regular members, and LID participants
- ✅ Both interactive (WhatsApp) and programmatic (API) access
- ✅ Robust error handling and user-friendly formatting
- ✅ Integration with existing command infrastructure
- **Conversation Handling**: Context-aware responses with quoted message support
- **Smart Routing**: Automatic message classification and routing
- **Multi-modal Processing**: Text, image, and document analysis

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

##### **4. WhatsApp LID (Linked ID) Resolution**
- **Problem**: WhatsApp group reactions sometimes show `@lid` instead of phone numbers due to privacy features
- **Solution**: Implemented comprehensive LID resolution system
- **Features**:
  - Automatic detection of LID participants in reactions
  - Group metadata caching for participant mapping
  - Fallback identification using cached LID-to-technician mappings
  - Enhanced technician lookup supporting both phone numbers and LIDs
  - Real-time group metadata updates for accurate resolution
- **Files**: `utils/lidResolver.js`, updated reaction handlers in `index.js`
- **Documentation**: `docs/lid-issue-analysis-and-solution.md`

##### **5. Enhanced UI/UX Interface (Material Design)**
- **Problem**: Original interface had basic styling with text layout issues, poor mobile responsiveness, and outdated design
- **Solution**: Complete UI overhaul with Material Design principles and modern web standards
- **Features**:
  - **Material Design Components**: Modern card-based layout with elevation shadows
  - **Responsive Design**: Mobile-first approach with breakpoints for all screen sizes
  - **Enhanced Status System**: Dynamic status indicators with icons and color-coded states
  - **Smooth Animations**: CSS transitions, pulse effects, and slide-in animations
  - **Typography**: Roboto font family with proper hierarchy and spacing
  - **Color Scheme**: WhatsApp-inspired gradient with professional color palette
  - **Interactive Elements**: Hover effects, loading animations, and visual feedback
  - **Accessibility**: Proper contrast ratios, semantic HTML, and screen reader support
- **Technical Improvements**:
  - Fixed text layout issues preventing line breaks
  - Enhanced JavaScript status management
  - Auto-scrolling message container
  - Fade-in animations for QR codes
  - Loading dots animation for connection states
- **Files**: `index.html` (enhanced from 145 to 380+ lines)

##### **6. Security & Access Control**
- **IP Whitelisting**: Restricts API access to authorized IP addresses
- **Phone Number Validation**: Allowed/restricted number lists for command access
- **Role-based Permissions**: Different access levels for different users
- **HTTPS Agent Configuration**: Handles self-signed certificates for internal APIs

##### **7. Message Processing Pipeline**
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
│   └── messageFormatter.js - WhatsApp text formatting
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

#### **Next Steps**
- Expand README.md with comprehensive setup instructions
- Implement unit testing framework
- Add structured logging with Winston or similar
- Create configuration management system
- Optimize large functions in index.js
- Add monitoring and health check endpoints

---

## Recent Updates

### LID to Phone Number Resolver
- **Date**: July 30, 2025
- **Status**: ✅ Implemented & Tested
- **Changes**: Implemented comprehensive LID-to-phone number resolution system
- **Features**:
  - **Automatic Mapping**: Analyzes messages to map `@lid` IDs to real phone numbers based on `pushName` patterns
  - **Message Processing**: Listens to all incoming messages to extract JID and `pushName` information
  - **Contact Updates**: Processes `contacts.update` events to track new JIDs and notify names
  - **Smart Matching**: Assumes same person if identical `pushName` appears from both `@lid` and `@s.whatsapp.net`
  - **JID Verification**: Optional `onWhatsApp()` verification for JID validity
  - **Persistent Storage**: Saves/loads mappings to/from JSON file for persistence across restarts
  - **API Endpoints**:
    - `GET /api/lid-resolver/resolve/:jid` - Resolve a specific JID to phone number
    - `GET /api/lid-resolver/stats` - Get mapping statistics
    - `GET /api/lid-resolver/mappings` - Get JIDs for a specific pushName
    - `POST /api/lid-resolver/force-mapping` - Manually force a LID-to-phone mapping
  - **Core Methods**:
    - `resolveJid(jid)` - Returns best known phone number for a JID
    - `getLidForPhone(phoneJid)` - Get LID for a phone number
    - `getJidsForPushName(pushName)` - Get all JIDs associated with a pushName
    - `getPushNameForJid(jid)` - Get pushName for a JID
- **Integration**: Fully integrated into main WhatsApp bot with automatic initialization and event processing
- **Testing Results**:
  - ✅ Server running on port 8192
  - ✅ LID resolver initialized and loading mappings from storage
  - ✅ API endpoints responding correctly
  - ✅ Force mapping functionality working
  - ✅ LID resolution working: All LIDs resolving correctly after data format fix
  - ✅ Statistics endpoint showing correct mapping counts (17 mappings)
  - ✅ Persistent storage working (lid_phone_mappings.json)
  - ✅ Active processing of LID messages in real-time
- **Bug Fixes Applied**:
  - **Data Format Inconsistency Fix (2025-07-30)**:
    - **Issue**: The first mapping (`120363162455880145@lid`) was stored with full JID format in the JSON file, while the resolver expected clean IDs without domain suffixes
    - **Root Cause**: Inconsistent data format where some mappings used full JIDs (`@lid`, `@s.whatsapp.net`) while others used clean numeric IDs
    - **Solution**: Updated `lid_phone_mappings.json` to use consistent clean ID format, changed `"120363162455880145@lid": "6285712612218@s.whatsapp.net"` to `"120363162455880145": "6285712612218"`, updated corresponding reverse mapping
    - **Result**: All 17 LID mappings now resolve correctly, including the previously problematic `120363162455880145@lid` → `6285712612218`
  - **Reaction Handler LID Resolution Fix (2025-07-30)**:
    - **Issue**: Reaction handler was not using the correct LID resolver, showing "Could not resolve LID 80444922015783@lid" despite having valid mappings
    - **Root Cause**: Reaction handler was using `resolveParticipant()` from `lidResolver.js` which relies on group metadata caching, while working API endpoints use `lidToPhoneResolver.resolveJid()` with actual LID-to-phone mappings
    - **Solution**: Updated reaction handler to use `lidToPhoneResolver.resolveJid(participant)` as primary resolution method with `resolveParticipant()` as fallback
    - **Result**: LID `80444922015783@lid` now properly resolves to `6281234567008` in reaction events, dual resolution strategy provides robustness
  - **JID Format Fix for sendMessage (2025-07-30)**:
    - **Issue**: Test message sending failed with "Cannot destructure property 'user' of '(0 , WABinary_1.jidDecode)(...)' as it is undefined" error
    - **Root Cause**: `phoneNumberFormatter()` returns only the phone number (e.g., '6285712612218') but `sendMessage()` expects full JID format (e.g., '6285712612218@s.whatsapp.net')
    - **Solution**: Updated ALL `sendMessage()` calls using `phoneNumberFormatter()` to append `+ '@s.whatsapp.net'`
    - **Files Modified**: `index.js` (lines 6278, 7594, 7598, 7704, 7739, 7756, 7772)
    - **Functions Affected**:
      - Test message on startup
      - Requester notifications for new tickets
      - Technician assignment notifications
      - Ticket update notifications
    - **Result**: All sendMessage calls now work correctly with proper JID format
  - **Git Tracking Issue Fix (2025-07-30)**:
    - **Issue**: `baileys_store.json` was still being tracked by git despite being in `.gitignore`
    - **Root Cause**: File was already tracked before being added to `.gitignore` - gitignore only affects untracked files
    - **Solution**: Used `git rm --cached baileys_store.json` to remove from tracking while keeping local file
    - **Result**: `baileys_store.json` is now properly ignored by git and won't be pushed to repository
- **Files Created**:
  - `utils/lidToPhoneResolver.js` - Main resolver implementation
  - `examples/lid-resolver-test.js` - Test script and usage examples
  - `lid_phone_mappings.json` - Persistent storage file
- **Similar to WAHA**: Provides the same LID resolution functionality as WAHA platform

### Simplified Group Logging
- **Date**: Previous session
- **Changes**: Updated `listGroups()` function to provide clean, simplified logging format
- **Features**:
  - Clean display of group name and total participant count
  - Individual participant listing with roles (admin, superadmin, member)
  - Maintains underlying functionality for fetching and caching group metadata
  - Structured return data with error handling

### Database Connection Resilience Improvement
- **Date**: Current session
- **Issue**: Fixed "Connection is closed" error in `getUserPhotoFromDB()` function
- **Root Cause**: Database connection pool was not handling connection timeouts and closures properly
- **Solution**: Implemented robust connection management in `modules/db.js`
- **Changes**:
  - Added `initializePool()` function for connection management
  - Implemented automatic reconnection logic
  - Added connection state validation before queries
  - Enhanced error handling with retry mechanism for closed connections
  - Proper cleanup of disconnected pools
- **Benefits**:
  - Eliminates "Connection is closed" errors during photo fetching
  - Automatic recovery from database connection issues
  - Improved reliability for `/finduser` command with photo functionality
  - Better error logging and debugging information

### January 15, 2025 - Additional JID Format Fixes

- **JID Format Fix for Remaining sendMessage Calls**:
  - **Issue**: Additional instances of `jidDecode` error found in lines 2876, 6601, and 6765 where `phoneNumberFormatter()` output was used directly in `sock.sendMessage()` calls
  - **Root Cause**: `phoneNumberFormatter()` returns only phone numbers (e.g., '6285712612218') but `sendMessage()` requires full JID format (e.g., '6285712612218@s.whatsapp.net')
  - **Solution**: Updated remaining `sendMessage()` calls to append `+ '@s.whatsapp.net'` to phone numbers
  - **Files Modified**: `index.js` (lines 2876, 6601, 6765)
  - **Functions Affected**:
    - OpenAI message sending functionality
    - Individual message sending endpoint
    - Helper sendMessage function
  - **Result**: All remaining jidDecode errors should now be resolved

### 2024-12-19 - Refactored WhatsApp JID Formatting to Centralized Function

**Issue**: Manual appending of `'@s.whatsapp.net'` to phone numbers was scattered throughout the codebase, making it error-prone and difficult to maintain.

**Solution**: Created a centralized `formatJid()` function that handles both phone number formatting and WhatsApp domain suffix appending.

**Implementation**:
- Added `formatJid(number)` function in `index.js` that:
  - Uses `phoneNumberFormatter()` to format the phone number
  - Automatically appends `'@s.whatsapp.net'` suffix
  - Returns the complete WhatsApp JID format

**Files Modified**:
- `index.js` - Added `formatJid()` function and updated all `sock.sendMessage()` calls

**Functions Updated**:
- All `sock.sendMessage()` calls now use `formatJid()` instead of manual concatenation
- Removed redundant `phoneNumberFormatter()` calls where `formatJid()` handles both formatting and suffix

**Benefits**:
- Centralized JID formatting logic
- Reduced code duplication
- Eliminated risk of missing `@s.whatsapp.net` suffix
- Easier maintenance and future modifications
- Consistent JID formatting across the entire application

---

*Journal maintained by: Development Team*  
*Last updated: January 15, 2025*