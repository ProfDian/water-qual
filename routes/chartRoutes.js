/**
 * ========================================
 * CHART ROUTES (FIXED)
 * ========================================
 * Routes for chart-specific endpoints
 *
 * Base path: /api/charts
 *
 * FIXES:
 * ✅ Updated method names to match chartController
 * ✅ Replaced 'protect' with 'requireAuth'
 * ✅ Added module.exports
 * ✅ Consistent middleware usage
 */

const express = require("express");
const router = express.Router();
const chartController = require("../controllers/chartController");
const {
  requireAuth,
  requireAdmin,
  requireManager,
} = require("../middleware/authMiddleware");

/**
 * ========================================
 * PUBLIC ROUTES
 * ========================================
 */

// Get available chart types and options
router.get("/options", chartController.getChartOptions);

/**
 * ========================================
 * PROTECTED ROUTES
 * ========================================
 * All chart data requires authentication
 */

// Time series chart data
// GET /api/charts/timeseries/:ipal_id?time_range=7d&parameters=ph,tds
router.get(
  "/timeseries/:ipal_id",
  requireAuth,
  chartController.getTimeSeriesChart
);

// Comparison chart (inlet vs outlet)
// GET /api/charts/comparison/:ipal_id/:parameter?time_range=7d
router.get(
  "/comparison/:ipal_id/:parameter",
  requireAuth,
  chartController.getComparisonChart
);

// Quality score chart
// GET /api/charts/quality-score/:ipal_id?time_range=7d
router.get(
  "/quality-score/:ipal_id",
  requireAuth,
  chartController.getQualityScoreChart
);

// Bar chart (average comparison)
// GET /api/charts/bar/:ipal_id?time_range=7d
router.get("/bar/:ipal_id", requireAuth, chartController.getBarChart);

// Single sensor chart
// GET /api/charts/sensor/:sensor_id?ipal_id=1&time_range=7d
router.get("/sensor/:sensor_id", requireAuth, chartController.getSensorChart);

// Dashboard overview chart (multiple metrics)
// GET /api/charts/dashboard/:ipal_id?time_range=7d
router.get(
  "/dashboard/:ipal_id",
  requireAuth,
  chartController.getDashboardChart
);

/**
 * ========================================
 * ADMIN ROUTES
 * ========================================
 */

// Export chart data as CSV (Admin only)
// GET /api/charts/export/:ipal_id?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=csv
router.get(
  "/export/:ipal_id",
  requireAuth,
  requireAdmin,
  chartController.exportChartData
);

// Clear chart cache (Admin only)
// POST /api/charts/cache/clear
router.post(
  "/cache/clear",
  requireAuth,
  requireAdmin,
  chartController.clearCache
);

// Get cache statistics (Admin only)
// GET /api/charts/cache/stats
router.get(
  "/cache/stats",
  requireAuth,
  requireAdmin,
  chartController.getCacheStats
);

/**
 * ========================================
 * ROUTE DOCUMENTATION
 * ========================================
 *
 * GET /api/charts/options
 * - Get available chart types, parameters, and time ranges
 *
 * GET /api/charts/timeseries/:ipal_id
 * - Multi-parameter time series chart
 * Query: time_range (24h|7d|30d), parameters (comma-separated)
 *
 * GET /api/charts/comparison/:ipal_id/:parameter
 * - Inlet vs outlet comparison for single parameter
 * Query: time_range (24h|7d|30d)
 *
 * GET /api/charts/quality-score/:ipal_id
 * - Quality score over time
 * Query: time_range (24h|7d|30d)
 *
 * GET /api/charts/bar/:ipal_id
 * - Bar chart comparing averages
 * Query: time_range (24h|7d|30d)
 *
 * GET /api/charts/sensor/:sensor_id
 * - Single sensor historical data
 * Query: ipal_id (required), time_range (24h|7d|30d)
 *
 * GET /api/charts/dashboard/:ipal_id
 * - Dashboard overview with multiple metrics
 * Query: time_range (24h|7d|30d)
 *
 * GET /api/charts/export/:ipal_id (Admin only)
 * - Export chart data as CSV
 * Query: start_date, end_date, format
 *
 * POST /api/charts/cache/clear (Admin only)
 * - Clear chart cache
 *
 * GET /api/charts/cache/stats (Admin only)
 * - Get cache statistics
 */

// ========================================
// EXPORT ROUTER
// ========================================
module.exports = router;

console.log("📦 chartRoutes loaded with requireAuth middleware");
