/**
 * ========================================
 * SENSOR MANAGEMENT ROUTES (EXTENDED)
 * ========================================
 * Complete CRUD operations for sensors
 * Sesuai Use Case #4: Penambahan Sensor
 */

const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController");
const {
  requireAuth,
  requireManager,
  requireAdmin,
} = require("../middleware/authMiddleware");

// ========================================
// SENSOR READINGS (Existing - dari ESP32)
// ========================================

/**
 * GET /api/sensors/readings
 * Get all readings with filters (AUTH required)
 */
router.get("/readings", requireAuth, sensorController.getReadings);

/**
 * GET /api/sensors/readings/latest/:ipal_id
 * Get latest reading per IPAL (AUTH required)
 */
router.get(
  "/readings/latest/:ipal_id",
  requireAuth,
  sensorController.getLatestReading
);

// ========================================
// SENSOR MANAGEMENT (NEW - CRUD Sensors)
// ========================================

/**
 * GET /api/sensors
 * Get all sensors with filters & pagination
 *
 * Query params:
 *   - ipal_id: number (optional)
 *   - sensor_type: string (optional, e.g., 'ph', 'tds', 'turbidity', 'temperature')
 *   - status: 'active' | 'inactive' | 'maintenance' (optional)
 *   - limit: number (default: 50)
 */
router.get("/", requireAuth, sensorController.getAllSensors);

/**
 * GET /api/sensors/:id
 * Get sensor by ID
 */
router.get("/:id", requireAuth, sensorController.getSensorById);

/**
 * PUT /api/sensors/:id
 * Update sensor (Manager/Admin only)
 *
 * Body (all optional):
 * {
 *   "sensor_type": "ph",
 *   "sensor_location": "outlet",
 *   "sensor_description": "Updated description",
 *   "status": "maintenance"
 * }
 */
router.put("/:id", requireAuth, requireManager, sensorController.updateSensor);

/**
 * GET /api/sensors/:id/status
 * Get sensor status (online/offline) based on last reading
 */
router.get("/:id/status", requireAuth, sensorController.getSensorStatus);

/**
 * GET /api/sensors/ipal/:ipal_id
 * Get all sensors for specific IPAL
 */
router.get("/ipal/:ipal_id", requireAuth, sensorController.getSensorsByIpal);

/**
 * GET /api/sensors/:id/latest
 * Get latest reading for specific sensor
 */
router.get(
  "/:id/latest",
  requireAuth,
  sensorController.getLatestReadingBySensor
);

/**
 * GET /api/sensors/:id/history
 * Get historical data for specific sensor
 * Query params:
 *   - limit: number (default: 100)
 *   - start_date: YYYY-MM-DD (optional)
 *   - end_date: YYYY-MM-DD (optional)
 */
router.get("/:id/history", requireAuth, sensorController.getSensorHistory);

module.exports = router;

console.log("📦 sensorRoutes (extended) loaded");
