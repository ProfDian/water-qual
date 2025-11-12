/**
 * ========================================
 * DASHBOARD ROUTES
 * ========================================
 * Routes untuk dashboard summary & statistics
 */

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

// ========================================
// DASHBOARD ROUTES
// ========================================

/**
 * GET /api/dashboard/overview
 * Get overview of all IPALs (for homepage)
 */
router.get("/overview", requireAuth, dashboardController.getOverview);

/**
 * GET /api/dashboard/summary/:ipal_id
 * Get detailed summary for specific IPAL
 */
router.get("/summary/:ipal_id", requireAuth, dashboardController.getSummary);

/**
 * GET /api/dashboard/readings/:ipal_id
 * Get readings for charts (optimized untuk Recharts)
 *
 * Query params:
 *   - period: today|yesterday|week|custom (default: today)
 *   - start: ISO date string (for custom period)
 *   - end: ISO date string (for custom period)
 *   - limit: number (default: 100, max: 500)
 *
 * Examples:
 *   GET /api/dashboard/readings/1?period=today
 *   GET /api/dashboard/readings/1?period=week
 *   GET /api/dashboard/readings/1?period=custom&start=2025-11-01&end=2025-11-10
 *
 * Response:
 * {
 *   "success": true,
 *   "count": 10,
 *   "period": "today",
 *   "date_range": { ... },
 *   "summary": { ... },
 *   "data": [
 *     {
 *       "timestamp": "2025-11-10T07:29:20Z",
 *       "date": "10 Nov",
 *       "time": "07:29",
 *       "inlet_ph": 7,
 *       "outlet_ph": 9.5,
 *       "quality_score": 20,
 *       "status": "critical",
 *       "violations": [...]
 *     }
 *   ]
 * }
 */
router.get(
  "/readings/:ipal_id",
  requireAuth,
  dashboardController.getReadingsForChart
);

module.exports = router;

console.log("📦 dashboardRoutes loaded");

// Debug
console.log("📦 dashboardRoutes exports:", Object.keys(module.exports));
