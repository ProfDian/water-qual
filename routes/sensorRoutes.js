const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController");
const { requireAuth } = require("../middleware/authMiddleware");

// POST - Terima data dari ESP32 (NO AUTH untuk device)
router.post("/readings", sensorController.createReading);

// GET - Ambil data readings (PERLU AUTH)
router.get("/readings", requireAuth, sensorController.getReadings);

// GET - Ambil latest reading per IPAL (PERLU AUTH)
router.get(
  "/readings/latest/:ipal_id",
  requireAuth,
  sensorController.getLatestReading
);

module.exports = router;
