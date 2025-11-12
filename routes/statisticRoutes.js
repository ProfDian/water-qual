/**
 * ========================================
 * STATISTIC ROUTES (FIXED)
 * ========================================
 * Routes for generic statistics endpoints
 *
 * Base path: /api/statistics
 *
 * FIXES:
 * ✅ Middleware order corrected (requireAuth BEFORE requireAdmin/requireManager)
 * ✅ Replaced all 'protect' with 'requireAuth'
 * ✅ Static routes placed before parameterized routes
 * ✅ Consistent middleware usage
 */

const express = require("express");
const router = express.Router();
const statisticController = require("../controllers/statisticController");
const {
  requireAuth,
  requireAdmin,
  requireManager,
} = require("../middleware/authMiddleware");

/**
 * ========================================
 * PUBLIC ROUTES
 * ========================================
 * ⚠️ IMPORTANT: Static routes MUST be defined BEFORE parameterized routes
 */

// Get available options (parameters, time ranges, etc.)
// This is public so frontend can know what parameters are available
router.get("/options", statisticController.getOptions);

/**
 * ========================================
 * PROTECTED ROUTES
 * ========================================
 * All statistical data requires authentication
 *
 * Middleware order: requireAuth MUST come BEFORE requireAdmin/requireManager
 * because requireAdmin/requireManager need req.user which is set by requireAuth
 */

// Time range statistics
// All authenticated users can view statistics
router.get(
  "/range/:ipal_id",
  requireAuth,
  statisticController.getTimeRangeStats
);

// Hourly aggregation
router.get(
  "/hourly/:ipal_id",
  requireAuth,
  statisticController.getHourlyAggregation
);

// Daily aggregation
router.get(
  "/daily/:ipal_id",
  requireAuth,
  statisticController.getDailyAggregation
);

// Parameter trend
router.get(
  "/trend/:ipal_id/:parameter",
  requireAuth,
  statisticController.getParameterTrend
);

// Inlet vs Outlet comparison
router.get(
  "/compare/:ipal_id",
  requireAuth,
  statisticController.compareInletOutlet
);

// Quality score trend
router.get(
  "/quality-score/:ipal_id",
  requireAuth,
  statisticController.getQualityScoreTrend
);

module.exports = router;
console.log("📦 statisticRoutes loaded");
