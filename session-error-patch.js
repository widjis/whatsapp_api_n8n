/**
 * Session Error Handler Integration Patch for index.js
 * 
 * This patch shows how to integrate the session error handler into your existing WhatsApp API code
 * to automatically handle "Bad MAC Error" and other session corruption issues.
 */

// Import the session error handler
import { sessionErrorHandler } from './session-error-handler.js';

/**
 * Enhanced startSock function with session error handling
 * Replace your existing startSock function with this enhanced version
 */
export async function startSockWithErrorHandling() {
  try {
    console.log('Fetching latest Baileys version…');
    const { version } = await fetchLatestBaileysVersion();
    console.log('Using Baileys version:', version);

    console.log('Initializing auth state…');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    console.log('Auth state initialized');

    console.log('Creating WhatsApp socket…');
    sock = makeWASocket({
      version,
      auth: state,
      logger: Pino({ level: 'silent' }),
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: true,
      printQRInTerminal: false,
      cachedGroupMetadata: jid => groupCache.get(jid),
    });

    bindHistory(sock);

    // Enhanced event processing with error handling
    sock.ev.process(async events => {
      try {
        // — creds.update —
        if (events['creds.update']) {
          await saveCreds();
        }

        // — connection.update (open / close / QR) —
        if (events['connection.update']) {
          const { connection, lastDisconnect, qr } = events['connection.update'];
          console.log('connection.update:', connection, lastDisconnect, qr);

          if (connection === 'close') {
            const shouldReconnect =
              lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            // Check if the disconnect was due to a session error
            const disconnectError = lastDisconnect?.error;
            if (disconnectError) {
              const wasSessionError = sessionErrorHandler.handleSessionError(disconnectError);
              if (wasSessionError) {
                console.log('🔄 Session was cleaned up due to errors. Manual restart required.');
                currentStatus = 'Session corrupted - please restart server and re-authenticate';
                io.emit('message', currentStatus);
                return; // Don't auto-reconnect after cleanup
              }
            }
            
            currentStatus = 'Disconnected, reconnecting…';
            isAuthenticated = false;
            currentQr = null;
            io.emit('message', currentStatus);

            if (shouldReconnect) {
              await sock.end();
              return startSockWithErrorHandling(); // Use the enhanced function
            }
          }

          if (connection === 'open') {
            console.log('Connected to WhatsApp');
            currentStatus = 'WhatsApp is ready!';
            isAuthenticated = true;
            currentQr = null;
            io.emit('ready', currentStatus);
            io.emit('message', currentStatus);
            io.emit('authenticated', currentStatus);

            await listGroups();

            const testNumber = phoneNumberFormatter('085712612218');
            console.log('Testing sendMessage to', testNumber);
            try {
              const resp = await sock.sendMessage(testNumber, {
                text: 'MTI Whatsapp API Started!'
              });
              console.log('Test message sent:', resp);
            } catch (err) {
              console.error('Error sending test message:', err);
              // Handle session errors in test message
              sessionErrorHandler.handleSessionError(err);
            }
          }

          if (qr && !isAuthenticated) {
            console.log('QR received, generating DataURL…');
            try {
              const url = await qrcode.toDataURL(qr);
              currentQr = url;
              io.emit('qr', url);
              currentStatus = 'QR Code received, scan please!';
              io.emit('message', currentStatus);
            } catch (err) {
              console.error('Error generating QR code:', err);
            }
          }
        }

        // Rest of your event handling code...
        // (group cache updates, messages, reactions, etc.)
        
      } catch (error) {
        console.error('Error in event processing:', error);
        
        // Handle session errors in event processing
        const wasSessionError = sessionErrorHandler.handleSessionError(error);
        if (wasSessionError) {
          console.log('🔄 Session cleanup performed. Server restart recommended.');
        }
      }
    });

  } catch (error) {
    console.error('Error in startSock:', error);
    
    // Handle session errors in socket initialization
    const wasSessionError = sessionErrorHandler.handleSessionError(error);
    if (wasSessionError) {
      console.log('🔄 Session cleanup performed due to initialization error.');
      console.log('💡 Please restart the server to re-authenticate.');
    } else {
      // If not a session error, retry after delay
      console.log('⏳ Retrying connection in 5 seconds...');
      setTimeout(startSockWithErrorHandling, 5000);
    }
  }
}

/**
 * Enhanced message handling with session error recovery
 * Wrap your existing handleMessage function calls with this
 */
export async function handleMessageWithErrorRecovery(sock, msg) {
  try {
    await handleMessage(sock, msg);
  } catch (error) {
    console.error('Error in handleMessage:', error);
    
    // Check if it's a session error
    const wasSessionError = sessionErrorHandler.handleSessionError(error);
    if (wasSessionError) {
      console.log('🔄 Session cleanup performed due to message handling error.');
      // You might want to queue the message for retry after reconnection
    }
  }
}

/**
 * Enhanced send message function with session error handling
 */
export async function sendMessageWithErrorHandling(sock, jid, content) {
  try {
    return await sock.sendMessage(jid, content);
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Handle session errors in message sending
    const wasSessionError = sessionErrorHandler.handleSessionError(error);
    if (wasSessionError) {
      console.log('🔄 Session cleanup performed due to send error.');
      throw new Error('Session corrupted - message not sent. Please restart server.');
    }
    
    // Re-throw non-session errors
    throw error;
  }
}

/**
 * Session health monitoring endpoint
 * Add this to your Express routes
 */
export function addSessionHealthEndpoint(app) {
  app.get('/session-health', (req, res) => {
    const health = sessionErrorHandler.checkSessionHealth();
    const stats = sessionErrorHandler.getSessionStats();
    
    res.json({
      health,
      stats,
      recommendations: health.overall ? [] : [
        'Session files are unhealthy',
        'Consider running session cleanup',
        'Restart server and re-authenticate'
      ]
    });
  });
  
  app.post('/session-cleanup', (req, res) => {
    try {
      sessionErrorHandler.performCleanup();
      res.json({
        success: true,
        message: 'Session cleanup completed. Please restart server and re-authenticate.'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Integration Instructions:
 * 
 * 1. Import the session error handler at the top of your index.js:
 *    import { sessionErrorHandler } from './session-error-handler.js';
 * 
 * 2. Replace your startSock function with startSockWithErrorHandling
 * 
 * 3. Wrap your handleMessage calls with handleMessageWithErrorRecovery
 * 
 * 4. Use sendMessageWithErrorHandling for sending messages
 * 
 * 5. Add session health endpoints to your Express app:
 *    addSessionHealthEndpoint(app);
 * 
 * 6. Monitor session health at: http://localhost:8192/session-health
 * 
 * 7. Manual cleanup endpoint: POST http://localhost:8192/session-cleanup
 */