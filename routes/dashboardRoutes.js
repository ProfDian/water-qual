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

module.exports = router;

console.log("📦 dashboardRoutes loaded");

// Debug
console.log("📦 dashboardRoutes exports:", Object.keys(module.exports));
