/**
 * ========================================
 * WATER QUALITY CONTROLLER
 * ========================================
 * HTTP request handlers for water quality monitoring
 * Handles ESP32 data submission with buffer/merge system
 *
 * Routes:
 * - POST   /api/water-quality/submit          (ESP32 endpoint)
 * - GET    /api/water-quality/buffer-status   (monitoring)
 * - DELETE /api/water-quality/cleanup-buffer  (maintenance)
 * - GET    /api/water-quality/readings        (get readings)
 * - GET    /api/water-quality/readings/:id    (get by ID)
 */

const waterQualityService = require("../services/waterQualityService");
const waterQualityModel = require("../models/waterQualityModel");

/**
 * ========================================
 * ESP32 ENDPOINTS
 * ========================================
 */

/**
 * POST /api/water-quality/submit
 * Main endpoint for ESP32 to submit sensor readings
 * NO AUTH required (device endpoint)
 */
exports.submitReading = async (req, res) => {
  try {
    const { ipal_id, location, device_id, data, sensor_mapping } = req.body;

    console.log("📥 Received reading from ESP32");
    console.log(
      `   IPAL: ${ipal_id}, Location: ${location}, Device: ${device_id}`
    );

    // Validate required fields
    if (!ipal_id || !location || !device_id || !data) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ["ipal_id", "location", "device_id", "data"],
      });
    }

    // Validate location
    if (!["inlet", "outlet"].includes(location)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location. Must be "inlet" or "outlet"',
      });
    }

    // Validate data structure
    if (!data.ph || !data.tds || !data.turbidity || !data.temperature) {
      return res.status(400).json({
        success: false,
        message: "Invalid data structure",
        required_fields: ["ph", "tds", "turbidity", "temperature"],
      });
    }

    // Call service to process reading
    const result = await waterQualityService.submitReading({
      ipal_id,
      location,
      device_id,
      data,
      sensor_mapping: sensor_mapping || {},
    });

    console.log(`✅ Reading processed: merged=${result.merged}`);

    // Return appropriate response
    if (result.merged) {
      // Data was merged and processed
      return res.status(200).json({
        success: true,
        merged: true,
        message: "Data merged and processed successfully",
        data: {
          buffer_id: result.buffer_id,
          reading_id: result.reading_id,
          fuzzy_analysis: {
            quality_score: result.fuzzy_analysis.quality_score,
            status: result.fuzzy_analysis.status,
            alert_count: result.fuzzy_analysis.alert_count,
          },
        },
      });
    } else {
      // Data buffered, waiting for pair
      return res.status(200).json({
        success: true,
        merged: false,
        message: result.message,
        data: {
          buffer_id: result.buffer_id,
          waiting_for: result.waiting_for,
        },
      });
    }
  } catch (error) {
    console.error("❌ Error in submitReading:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * MONITORING & DEBUGGING ENDPOINTS
 * ========================================
 */

/**
 * GET /api/water-quality/buffer-status
 * Get current buffer status (for monitoring/debugging)
 * AUTH required
 */
exports.getBufferStatus = async (req, res) => {
  try {
    const { ipal_id } = req.query;

    console.log("📊 Getting buffer status...");

    const status = await waterQualityService.getBufferStatus(
      ipal_id ? parseInt(ipal_id) : null
    );

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("❌ Error getting buffer status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get buffer status",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/water-quality/cleanup-buffer
 * Manual cleanup of expired buffer documents
 * AUTH required (admin only)
 */
exports.cleanupBuffer = async (req, res) => {
  try {
    console.log("🧹 Starting manual buffer cleanup...");

    const result = await waterQualityService.cleanupExpiredBuffer();

    return res.status(200).json({
      success: true,
      message: `Cleaned up ${result.deleted} expired buffer document(s)`,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error cleaning buffer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cleanup buffer",
      error: error.message,
    });
  }
};

/**
 * GET /api/water-quality/incomplete
 * Check for incomplete readings (monitoring)
 * AUTH required
 */
exports.checkIncompleteReadings = async (req, res) => {
  try {
    const { ipal_id } = req.query;

    console.log("🔍 Checking for incomplete readings...");

    const result = await waterQualityService.checkIncompleteReadings(
      ipal_id ? parseInt(ipal_id) : 1
    );

    if (result.hasIncomplete) {
      return res.status(200).json({
        success: true,
        warning: true,
        message: `Found ${result.count} incomplete reading(s)`,
        data: result,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "No incomplete readings found",
        data: result,
      });
    }
  } catch (error) {
    console.error("❌ Error checking incomplete readings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check incomplete readings",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * DATA RETRIEVAL ENDPOINTS
 * ========================================
 */

/**
 * GET /api/water-quality/readings
 * Get water quality readings with pagination
 * AUTH required
 */
exports.getReadings = async (req, res) => {
  try {
    const { limit = 50, ipal_id } = req.query;

    console.log(`📖 Getting readings (limit: ${limit})`);

    const readings = await waterQualityModel.getLatestReadings(
      parseInt(limit),
      ipal_id ? parseInt(ipal_id) : null
    );

    return res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error("❌ Error getting readings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get readings",
      error: error.message,
    });
  }
};

/**
 * GET /api/water-quality/readings/:id
 * Get specific reading by ID
 * AUTH required
 */
exports.getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📖 Getting reading: ${id}`);

    const reading = await waterQualityModel.getReadingById(id);

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: "Reading not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: reading,
    });
  } catch (error) {
    console.error("❌ Error getting reading:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get reading",
      error: error.message,
    });
  }
};

/**
 * GET /api/water-quality/readings/latest/:ipal_id
 * Get latest reading for specific IPAL
 * AUTH required
 */
exports.getLatestReading = async (req, res) => {
  try {
    const { ipal_id } = req.params;

    console.log(`📖 Getting latest reading for IPAL: ${ipal_id}`);

    const readings = await waterQualityModel.getLatestReadings(
      1,
      parseInt(ipal_id)
    );

    if (readings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No readings found for this IPAL",
      });
    }

    return res.status(200).json({
      success: true,
      data: readings[0],
    });
  } catch (error) {
    console.error("❌ Error getting latest reading:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get latest reading",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * STATISTICS ENDPOINTS (Optional)
 * ========================================
 */

/**
 * GET /api/water-quality/stats
 * Get statistics summary (for dashboard)
 * AUTH required
 */
exports.getStats = async (req, res) => {
  try {
    const { ipal_id = 1, days = 7 } = req.query;

    console.log(`📊 Getting stats for last ${days} days`);

    // Get recent readings
    const readings = await waterQualityModel.getLatestReadings(
      parseInt(days) * 24, // Assuming hourly readings
      parseInt(ipal_id)
    );

    if (readings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data available",
      });
    }

    // Calculate statistics
    const stats = {
      total_readings: readings.length,
      average_quality_score: 0,
      status_distribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        critical: 0,
      },
      total_alerts: 0,
      latest_reading: readings[0],
    };

    let scoreSum = 0;
    let alertSum = 0;

    readings.forEach((reading) => {
      if (reading.fuzzy_analysis) {
        scoreSum += reading.fuzzy_analysis.quality_score || 0;
        alertSum += reading.fuzzy_analysis.alert_count || 0;

        const status = reading.fuzzy_analysis.status;
        if (stats.status_distribution[status] !== undefined) {
          stats.status_distribution[status]++;
        }
      }
    });

    stats.average_quality_score = Math.round(scoreSum / readings.length);
    stats.total_alerts = alertSum;

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ Error getting stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * HEALTH CHECK
 * ========================================
 */

/**
 * GET /api/water-quality/health
 * Health check endpoint
 * NO AUTH required
 */
exports.healthCheck = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Water Quality Service is running",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Service unhealthy",
      error: error.message,
    });
  }
};

// ⚠️ PENTING: Log saat controller loaded
console.log("📦 waterQualityController loaded");
