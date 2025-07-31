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

#### **Next Steps**
- Expand README.md with comprehensive setup instructions
- Implement unit testing framework
- Add structured logging with Winston or similar
- Create configuration management system
- Optimize large functions in index.js
- Add monitoring and health check endpoints

---

*Journal maintained by: Development Team*  
*Last updated: July 30, 2025*