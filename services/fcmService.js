/**
 * ========================================
 * FCM (FIREBASE CLOUD MESSAGING) SERVICE
 * ========================================
 * Service untuk mengirim push notification
 * ke browser/mobile app
 */

const { admin } = require("../config/firebase-config");

// ========================================
// FUNGSI UTAMA: KIRIM FCM NOTIFICATION
// ========================================

/**
 * Kirim push notification ke user tertentu
 *
 * @param {string} fcmToken - FCM token dari user device
 * @param {Object} alertData - Data alert
 * @returns {Promise<Object>} Send result
 */
async function sendPushNotification(fcmToken, alertData) {
  try {
    if (!fcmToken) {
      console.log("⚠️  No FCM token provided, skipping push notification");
      return { success: false, message: "No FCM token" };
    }

    console.log("🔔 Preparing push notification...");

    // Prepare notification payload
    const message = {
      token: fcmToken,
      notification: {
        title: `🚨 Alert: ${alertData.rule}`,
        body: alertData.message,
      },
      data: {
        alert_id: alertData.id || "unknown",
        ipal_id: String(alertData.ipal_id),
        parameter: alertData.parameter,
        severity: alertData.severity,
        timestamp: new Date().toISOString(),
        click_action: `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/alerts`,
      },
      webpush: {
        fcmOptions: {
          link: `${process.env.FRONTEND_URL || "http://localhost:5173"}/alerts`,
        },
        notification: {
          icon: "/icon-192x192.png", // Icon notification
          badge: "/badge-72x72.png",
          vibrate: [200, 100, 200],
          requireInteraction: true, // Notification tetap muncul sampai user click
        },
      },
    };

    // Send notification
    const response = await admin.messaging().send(message);

    console.log("✅ Push notification sent successfully!");
    console.log(`   Message ID: ${response}`);

    return {
      success: true,
      messageId: response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("💥 Failed to send push notification:", error.message);

    // Handle specific FCM errors
    if (
      error.code === "messaging/invalid-registration-token" ||
      error.code === "messaging/registration-token-not-registered"
    ) {
      console.log(
        "⚠️  Invalid or expired FCM token, should remove from database"
      );
    }

    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Kirim push notification ke multiple users
 *
 * @param {Array<string>} fcmTokens - Array of FCM tokens
 * @param {Object} alertData - Data alert
 * @returns {Promise<Object>} Send result
 */
async function sendPushNotificationToMultiple(fcmTokens, alertData) {
  try {
    if (!fcmTokens || fcmTokens.length === 0) {
      console.log("⚠️  No FCM tokens provided, skipping push notification");
      return { success: false, message: "No FCM tokens" };
    }

    console.log(
      `🔔 Sending push notification to ${fcmTokens.length} devices...`
    );

    // Prepare multicast message
    const message = {
      tokens: fcmTokens,
      notification: {
        title: `🚨 Alert: ${alertData.rule}`,
        body: alertData.message,
      },
      data: {
        alert_id: alertData.id || "unknown",
        ipal_id: String(alertData.ipal_id),
        parameter: alertData.parameter,
        severity: alertData.severity,
        timestamp: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: `${process.env.FRONTEND_URL || "http://localhost:5173"}/alerts`,
        },
        notification: {
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          vibrate: [200, 100, 200],
          requireInteraction: alertData.severity === "critical",
        },
      },
    };

    // Send multicast
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Push notifications sent!`);
    console.log(`   Success: ${response.successCount}/${fcmTokens.length}`);
    console.log(`   Failed: ${response.failureCount}`);

    // Log failed tokens (for cleanup)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: fcmTokens[idx],
            error: resp.error.code,
          });
        }
      });
      console.log("⚠️  Failed tokens:", failedTokens);
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalTokens: fcmTokens.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("💥 Failed to send multicast notification:", error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Send push notification to topic (broadcast)
 * Semua user yang subscribe ke topic akan menerima notifikasi
 *
 * @param {string} topic - Topic name (e.g., "all-users", "managers", "teknisi")
 * @param {Object} alertData - Data alert
 * @returns {Promise<Object>} Send result
 */
async function sendPushNotificationToTopic(topic, alertData) {
  try {
    console.log(`🔔 Sending push notification to topic: ${topic}...`);

    const message = {
      topic: topic,
      notification: {
        title: `🚨 Alert: ${alertData.rule}`,
        body: alertData.message,
      },
      data: {
        alert_id: alertData.id || "unknown",
        ipal_id: String(alertData.ipal_id),
        parameter: alertData.parameter,
        severity: alertData.severity,
        timestamp: new Date().toISOString(),
      },
      webpush: {
        fcmOptions: {
          link: `${process.env.FRONTEND_URL || "http://localhost:5173"}/alerts`,
        },
      },
    };

    const response = await admin.messaging().send(message);

    console.log("✅ Topic notification sent successfully!");
    console.log(`   Message ID: ${response}`);

    return {
      success: true,
      messageId: response,
      topic: topic,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("💥 Failed to send topic notification:", error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Subscribe user to notification topic
 *
 * @param {string} fcmToken - User's FCM token
 * @param {string} topic - Topic name
 */
async function subscribeToTopic(fcmToken, topic) {
  try {
    await admin.messaging().subscribeToTopic([fcmToken], topic);
    console.log(`✅ Subscribed to topic: ${topic}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to subscribe to topic:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe user from notification topic
 */
async function unsubscribeFromTopic(fcmToken, topic) {
  try {
    await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
    console.log(`✅ Unsubscribed from topic: ${topic}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to unsubscribe from topic:`, error.message);
    return { success: false, error: error.message };
  }
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  sendPushNotification,
  sendPushNotificationToMultiple,
  sendPushNotificationToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
};

console.log("📦 fcmService loaded");

// ========================================
// END OF FILE
// ========================================
