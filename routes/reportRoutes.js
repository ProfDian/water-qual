/**
 * ========================================
 * REPORT/EXPORT ROUTES
 * ========================================
 * Routes untuk export data sensor dalam format CSV/Excel
 * Manager role only (sesuai Use Case #6)
 */

const express = require("express");
const router = express.Router();
const { requireAuth, requireManager } = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

// ========================================
// PROTECTED ROUTES (Manager only)
// ========================================

/**
 * GET /api/reports/export
 * Export sensor data ke CSV atau Excel
 *
 * Query params:
 *   - format: 'csv' | 'excel' (required)
 *   - ipal_id: number (optional, filter by IPAL)
 *   - start_date: ISO date string (optional)
 *   - end_date: ISO date string (optional)
 *   - parameter: 'ph' | 'tds' | 'turbidity' | 'temperature' | 'all' (optional)
 *
 * Example:
 *   /api/reports/export?format=csv&ipal_id=1&start_date=2025-10-01&end_date=2025-10-31
 */
router.get("/export", requireAuth, requireManager, reportController.exportData);

/**
 * GET /api/reports/alerts-summary
 * Export alerts summary ke CSV atau Excel
 *
 * Query params:
 *   - format: 'csv' | 'excel' (required)
 *   - ipal_id: number (optional)
 *   - start_date: ISO date string (optional)
 *   - end_date: ISO date string (optional)
 *   - severity: 'low' | 'medium' | 'high' | 'critical' (optional)
 */
router.get(
  "/alerts-summary",
  requireAuth,
  requireManager,
  reportController.exportAlertsSummary
);

/**
 * GET /api/reports/preview
 * Preview data sebelum export (untuk UI)
 *
 * Query params sama seperti /export tapi return JSON
 */
router.get(
  "/preview",
  requireAuth,
  requireManager,
  reportController.previewData
);

module.exports = router;

console.log("📦 reportRoutes loaded");

// ========================================
// END OF FILE
// ========================================
