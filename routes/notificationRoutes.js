/**
 * ========================================
 * NOTIFICATION ROUTES
 * ========================================
 * Routes untuk notification endpoints
 */

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// ========================================
// PUBLIC ROUTES (for testing only)
// ========================================

/**
 * POST /api/notifications/test-email
 * Send test email
 * Body: { recipient: "email@example.com" }
 */
router.post("/test-email", notificationController.sendTestEmailHandler);

/**
 * POST /api/notifications/test-push
 * Send test push notification
 * Body: { fcm_token: "..." }
 */
router.post("/test-push", notificationController.sendTestPushHandler);

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================

/**
 * POST /api/notifications/send
 * Send notification (email + push) for specific alert
 * Body: {
 *   alert_id: "...",
 *   recipients: ["email1@example.com", "email2@example.com"],
 *   fcm_tokens: ["token1", "token2"]
 * }
 */
router.post("/send", requireAuth, notificationController.sendNotification);

/**
 * POST /api/notifications/register-device
 * Register user's device FCM token
 * Body: { fcm_token: "..." }
 */
router.post(
  "/register-device",
  requireAuth,
  notificationController.registerDevice
);

/**
 * POST /api/notifications/subscribe
 * Subscribe to notification topic
 * Body: { fcm_token: "...", topic: "managers" }
 */
router.post(
  "/subscribe",
  requireAuth,
  notificationController.subscribeToTopicHandler
);

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from notification topic
 * Body: { fcm_token: "...", topic: "managers" }
 */
router.post(
  "/unsubscribe",
  requireAuth,
  notificationController.unsubscribeFromTopicHandler
);

module.exports = router;

console.log("📦 notificationRoutes loaded");

// ========================================
// END OF FILE
// ========================================
