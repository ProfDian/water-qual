const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// GET - Ambil semua alerts
router.get("/", requireAuth, alertController.getAlerts);

// GET - Ambil active alerts
router.get("/active", requireAuth, alertController.getActiveAlerts);

// PUT - Acknowledge alert
router.put(
  "/:id/acknowledge",
  requireAuth,
  requireAdmin,
  alertController.acknowledgeAlert
);

// PUT - Resolve alert
router.put(
  "/:id/resolve",
  requireAuth,
  requireAdmin,
  alertController.resolveAlert
);

// ⭐ PENTING: MODULE EXPORTS
module.exports = router;
