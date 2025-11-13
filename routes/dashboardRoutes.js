/**
 * ========================================
 * DASHBOARD ROUTES
 * ========================================
 * Routes untuk dashboard summary & statistics
 */

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");
const dashboardController = require("../controllers/dashboardController");

// ========================================
// DASHBOARD ROUTES (WITH CACHING)
// ========================================

/**
 * GET /api/dashboard/overview
 * Get overview of all IPALs (for homepage)
 * Cache: 45 seconds
 */
router.get(
  "/overview",
  requireAuth,
  cacheMiddleware(45),
  dashboardController.getOverview
);

/**
 * GET /api/dashboard/summary/:ipal_id
 * Get detailed summary for specific IPAL
 * Cache: 30 seconds (frequently accessed, shorter TTL for fresher data)
 */
router.get(
  "/summary/:ipal_id",
  requireAuth,
  cacheMiddleware(30),
  dashboardController.getSummary
);

/**
 * GET /api/dashboard/readings/:ipal_id
 * Get readings for charts (optimized untuk Recharts)
 * Cache: 60 seconds (chart data doesn't need to be super fresh)
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
  cacheMiddleware(60),
  dashboardController.getReadingsForChart
);

module.exports = router;

console.log("📦 dashboardRoutes loaded");

// Debug
console.log("📦 dashboardRoutes exports:", Object.keys(module.exports));
