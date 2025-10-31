/**
 * ========================================
 * ALERT ROUTES
 * ========================================
 * Routes untuk alert management
 */

const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const alertController = require("../controllers/alertController");

// ========================================
// PUBLIC/PROTECTED ROUTES
// ========================================

/**
 * GET /api/alerts
 * Get all alerts with filters
 * Query params:
 *   - ipal_id: number
 *   - status: active|acknowledged|resolved
 *   - severity: low|medium|high|critical
 *   - parameter: ph|tds|turbidity|temperature
 *   - location: inlet|outlet|efficiency|anomaly
 *   - limit: number (default: 50)
 *   - start_after: doc_id (for pagination)
 */
router.get("/", requireAuth, alertController.getAlerts);

/**
 * GET /api/alerts/stats
 * Get alert statistics
 * Query params:
 *   - ipal_id: number (optional)
 */
router.get("/stats", requireAuth, alertController.getAlertStats);

/**
 * GET /api/alerts/:id
 * Get specific alert by ID
 */
router.get("/:id", requireAuth, alertController.getAlertById);

/**
 * PUT /api/alerts/:id/read
 * Mark alert as read
 */
router.put("/:id/read", requireAuth, alertController.markAsRead);

/**
 * PUT /api/alerts/:id/status
 * Update alert status
 * Body: { status: "acknowledged" | "resolved" }
 */
router.put("/:id/status", requireAuth, alertController.updateAlertStatus);

/**
 * DELETE /api/alerts/:id
 * Delete alert (Admin only)
 */
router.delete("/:id", requireAuth, requireAdmin, alertController.deleteAlert);

module.exports = router;

console.log("📦 alertRoutes loaded");
