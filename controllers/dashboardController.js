/**
 * ========================================
 * DASHBOARD CONTROLLER
 * ========================================
 * Controller untuk dashboard summary & statistics
 */

const { db, admin } = require("../config/firebase-config");

/**
 * GET DASHBOARD SUMMARY untuk specific IPAL
 * Endpoint: GET /api/dashboard/summary/:ipal_id
 */
exports.getSummary = async (req, res) => {
  try {
    const { ipal_id } = req.params;

    console.log(`📊 Fetching dashboard summary for IPAL: ${ipal_id}`);

    // Parallel fetch untuk performa
    const [
      latestReading,
      activeAlertsCount,
      todayStats,
      weeklyStats,
      ipalInfo,
    ] = await Promise.all([
      getLatestReading(parseInt(ipal_id)),
      getActiveAlertsCount(parseInt(ipal_id)),
      getTodayStatistics(parseInt(ipal_id)),
      getWeeklyStatistics(parseInt(ipal_id)),
      getIPALInfo(parseInt(ipal_id)),
    ]);

    const summary = {
      ipal_info: ipalInfo,
      latest_reading: latestReading,
      active_alerts: activeAlertsCount,
      statistics: {
        today: todayStats,
        this_week: weeklyStats,
      },
      water_quality_status: latestReading?.fuzzy_analysis?.status || "Unknown",
      last_updated: new Date().toISOString(),
    };

    console.log(`✅ Dashboard summary fetched for IPAL ${ipal_id}`);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("💥 Error fetching dashboard summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
      error: error.message,
    });
  }
};

/**
 * GET ALL IPALS SUMMARY (untuk homepage/overview)
 * Endpoint: GET /api/dashboard/overview
 */
exports.getOverview = async (req, res) => {
  try {
    console.log(`📊 Fetching dashboard overview for all IPALs`);

    // Get all IPALs
    const ipalsSnapshot = await db.collection("ipals").get();

    if (ipalsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: "No IPALs found",
        data: {
          total_ipals: 0,
          ipals: [],
        },
      });
    }

    // Fetch summary for each IPAL
    const ipalSummaries = await Promise.all(
      ipalsSnapshot.docs.map(async (ipalDoc) => {
        const ipalData = ipalDoc.data();
        const ipalId = ipalData.ipal_id;

        const [latestReading, activeAlertsCount] = await Promise.all([
          getLatestReading(ipalId),
          getActiveAlertsCount(ipalId),
        ]);

        return {
          ipal_id: ipalId,
          ipal_location: ipalData.ipal_location,
          ipal_description: ipalData.ipal_description,
          latest_reading: latestReading
            ? {
                timestamp: latestReading.timestamp,
                inlet: latestReading.inlet,
                outlet: latestReading.outlet,
                quality_status:
                  latestReading.fuzzy_analysis?.status || "Unknown",
                quality_score: latestReading.fuzzy_analysis?.quality_score || 0,
              }
            : null,
          active_alerts: activeAlertsCount,
          status:
            activeAlertsCount.critical > 0
              ? "critical"
              : activeAlertsCount.high > 0
              ? "warning"
              : "normal",
        };
      })
    );

    // Calculate total statistics
    const totalStats = {
      total_ipals: ipalsSnapshot.size,
      ipals_with_critical_alerts: ipalSummaries.filter(
        (ipal) => ipal.status === "critical"
      ).length,
      ipals_with_warnings: ipalSummaries.filter(
        (ipal) => ipal.status === "warning"
      ).length,
      total_active_alerts: ipalSummaries.reduce(
        (sum, ipal) => sum + ipal.active_alerts.total,
        0
      ),
    };

    console.log(
      `✅ Dashboard overview fetched for ${ipalsSnapshot.size} IPALs`
    );

    return res.status(200).json({
      success: true,
      data: {
        statistics: totalStats,
        ipals: ipalSummaries,
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("💥 Error fetching dashboard overview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard overview",
      error: error.message,
    });
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get latest reading untuk IPAL tertentu
 */
async function getLatestReading(ipalId) {
  try {
    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate().toISOString()
        : null,
    };
  } catch (error) {
    console.error("Error fetching latest reading:", error);
    return null;
  }
}

/**
 * Get active alerts count dengan breakdown severity
 */
async function getActiveAlertsCount(ipalId) {
  try {
    const snapshot = await db
      .collection("alerts")
      .where("ipal_id", "==", ipalId)
      .where("status", "==", "active")
      .get();

    const counts = {
      total: snapshot.size,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    snapshot.forEach((doc) => {
      const severity = doc.data().severity;
      if (counts.hasOwnProperty(severity)) {
        counts[severity]++;
      }
    });

    return counts;
  } catch (error) {
    console.error("Error fetching active alerts count:", error);
    return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  }
}

/**
 * Get today statistics (average, min, max)
 */
async function getTodayStatistics(ipalId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(today))
      .get();

    if (snapshot.empty) {
      return {
        readings_count: 0,
        inlet: null,
        outlet: null,
      };
    }

    // Calculate averages, min, max
    const readings = snapshot.docs.map((doc) => doc.data());

    const inletStats = calculateStats(readings.map((r) => r.inlet));
    const outletStats = calculateStats(readings.map((r) => r.outlet));

    return {
      readings_count: readings.length,
      inlet: inletStats,
      outlet: outletStats,
    };
  } catch (error) {
    console.error("Error fetching today statistics:", error);
    return null;
  }
}

/**
 * Get weekly statistics
 */
async function getWeeklyStatistics(ipalId) {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(oneWeekAgo))
      .get();

    if (snapshot.empty) {
      return {
        readings_count: 0,
        inlet: null,
        outlet: null,
      };
    }

    const readings = snapshot.docs.map((doc) => doc.data());

    const inletStats = calculateStats(readings.map((r) => r.inlet));
    const outletStats = calculateStats(readings.map((r) => r.outlet));

    return {
      readings_count: readings.length,
      inlet: inletStats,
      outlet: outletStats,
    };
  } catch (error) {
    console.error("Error fetching weekly statistics:", error);
    return null;
  }
}

/**
 * Calculate statistics (avg, min, max) for array of readings
 */
function calculateStats(readings) {
  if (!readings || readings.length === 0) {
    return null;
  }

  const parameters = ["ph", "tds", "turbidity", "temperature"];
  const stats = {};

  parameters.forEach((param) => {
    const values = readings.map((r) => r[param]).filter((v) => v != null);

    if (values.length > 0) {
      stats[param] = {
        avg: parseFloat(
          (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
        ),
        min: parseFloat(Math.min(...values).toFixed(2)),
        max: parseFloat(Math.max(...values).toFixed(2)),
      };
    } else {
      stats[param] = { avg: null, min: null, max: null };
    }
  });

  return stats;
}

/**
 * Get IPAL info
 */
async function getIPALInfo(ipalId) {
  try {
    const snapshot = await db
      .collection("ipals")
      .where("ipal_id", "==", ipalId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("Error fetching IPAL info:", error);
    return null;
  }
}

// Debug
console.log("📦 dashboardController exports:", Object.keys(module.exports));
