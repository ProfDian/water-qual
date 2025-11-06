/**
 * ========================================
 * REPORT ROUTES V3 (FIXED)
 * ========================================
 */

const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * GET /api/reports/export
 * Generate & download report
 */
router.get("/export", requireAuth, reportController.exportReport);

/**
 * GET /api/reports/preview
 * Preview report summary
 */
router.get("/preview", requireAuth, reportController.previewReport);

module.exports = router;

console.log("📦 reportRoutes (v3 - fixed) loaded");
