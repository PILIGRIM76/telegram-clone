const admin = require('firebase-admin');
const db = require('./databaseService');

// Initialize Firebase Admin (keys from .env)
if (!admin.apps.length) {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[Push] Firebase Admin initialized successfully');
  } else {
    console.warn('[Push] Firebase Admin credentials not configured. Push notifications disabled.');
  }
}

/**
 * Send push notification to a user
 * IMPORTANT: Do NOT include decrypted message text in payload due to E2EE!
 * Allowed payload:
 * - title: "New message" (or sender name)
 * - body: "You have a new encrypted message"
 * - data: { chatId, messageId, type } for navigation on click
 */
async function sendPushNotification(userUid, senderName, chatId, messageId) {
  try {
    // Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      console.log('[Push] Firebase Admin not initialized, skipping push');
      return;
    }

    const tokensData = await db.getPushTokens(userUid);

    if (!tokensData || tokensData.length === 0) {
      console.log(`[Push] No tokens found for user ${userUid}`);
      return;
    }

    const tokens = tokensData.map(t => t.token);

    const message = {
      notification: {
        title: senderName || 'New message',
        body: 'You have a new encrypted message',
      },
      data: {
        chatId: chatId || '',
        messageId: messageId || '',
        type: 'new_message',
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Remove tokens that are permanently invalid
          if (errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-invalid') {
            failedTokens.push(tokens[idx]);
          }
        }
      });
      
      if (failedTokens.length > 0) {
        console.log('[Push] Removing invalid tokens:', failedTokens);
        for (const token of failedTokens) {
          await db.removePushToken(token);
        }
      }
    }

    console.log(`[Push] Successfully sent to ${response.successCount} devices (${response.failureCount} failed)`);
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    // Don't break the main flow if push fails
  }
}

module.exports = { sendPushNotification };