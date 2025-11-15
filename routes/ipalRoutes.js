/**
 * ========================================
 * IPAL ROUTES
 * ========================================
 * Read operations for IPAL facilities
 */

const express = require("express");
const router = express.Router();
const ipalController = require("../controllers/ipalController");
const { requireAuth } = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");

/**
 * GET /api/ipals
 * Get all IPAL facilities
 * Cache: 10 minutes
 * Query params:
 *   - status: active|inactive|maintenance (optional)
 *   - limit: number (default: 50)
 */
router.get(
  "/",
  requireAuth,
  cacheMiddleware(600), // 10 minutes cache
  ipalController.getAllIpals
);

/**
 * GET /api/ipals/:ipal_id
 * Get IPAL by ID (includes sensor count & latest reading)
 * Cache: 5 minutes
 */
router.get(
  "/:ipal_id",
  requireAuth,
  cacheMiddleware(300), // 5 minutes cache
  ipalController.getIpalById
);

/**
 * GET /api/ipals/:ipal_id/stats
 * Get IPAL statistics (sensor count, alert count, reading count)
 * Cache: 3 minutes
 */
router.get(
  "/:ipal_id/stats",
  requireAuth,
  cacheMiddleware(180), // 3 minutes cache
  ipalController.getIpalStats
);

module.exports = router;

console.log("📦 ipalRoutes loaded");
