/**
 * ========================================
 * STATISTIC SERVICE (UNIVERSAL)
 * ========================================
 * Reusable statistics and aggregation logic
 * Used by: Dashboard, Charts, Sensor Pages
 *
 * FEATURES:
 * ✅ Flexible time range queries
 * ✅ Hourly/Daily aggregation
 * ✅ Parameter-specific trends
 * ✅ Inlet vs Outlet comparison
 * ✅ Quality score trends
 * ✅ Efficient Firestore queries
 */

const { db, admin } = require("../config/firebase-config");

/**
 * ========================================
 * TIME RANGE STATISTICS
 * ========================================
 */

/**
 * Get statistics for custom time range
 * @param {number} ipalId - IPAL ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Array<string>} parameters - Parameters to include (default: all)
 * @returns {Object} Statistics with avg, min, max for each parameter
 */
async function getTimeRangeStats(
  ipalId,
  startDate,
  endDate,
  parameters = ["ph", "tds", "turbidity", "temperature"]
) {
  try {
    console.log(
      `📊 Fetching stats for IPAL ${ipalId} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endDate))
      .orderBy("timestamp", "asc")
      .get();

    if (snapshot.empty) {
      return {
        readings_count: 0,
        inlet: null,
        outlet: null,
        time_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    }

    const readings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate()
        : null,
    }));

    // Calculate stats for inlet and outlet
    const inletStats = calculateParameterStats(
      readings.map((r) => r.inlet),
      parameters
    );
    const outletStats = calculateParameterStats(
      readings.map((r) => r.outlet),
      parameters
    );

    return {
      readings_count: readings.length,
      inlet: inletStats,
      outlet: outletStats,
      time_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ Error in getTimeRangeStats:", error);
    throw error;
  }
}

/**
 * ========================================
 * AGGREGATION (HOURLY/DAILY)
 * ========================================
 */

/**
 * Get hourly aggregated data for a specific date
 * Perfect for detailed daily charts
 * @param {number} ipalId - IPAL ID
 * @param {Date} date - Target date
 * @returns {Array} Hourly aggregated data points
 */
async function getHourlyAggregation(ipalId, date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(
      `📊 Fetching hourly aggregation for IPAL ${ipalId} on ${date.toISOString()}`
    );

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startOfDay))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endOfDay))
      .orderBy("timestamp", "asc")
      .get();

    if (snapshot.empty) {
      return [];
    }

    const readings = snapshot.docs.map((doc) => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate()
        : null,
    }));

    // Group by hour
    const hourlyGroups = {};

    readings.forEach((reading) => {
      if (!reading.timestamp) return;

      const hour = reading.timestamp.getHours();
      if (!hourlyGroups[hour]) {
        hourlyGroups[hour] = [];
      }
      hourlyGroups[hour].push(reading);
    });

    // Calculate average for each hour
    const hourlyData = [];

    for (let hour = 0; hour < 24; hour++) {
      const group = hourlyGroups[hour] || [];

      if (group.length === 0) {
        // No data for this hour - add null placeholder
        hourlyData.push({
          hour,
          timestamp: new Date(
            startOfDay.getFullYear(),
            startOfDay.getMonth(),
            startOfDay.getDate(),
            hour
          ).toISOString(),
          inlet: null,
          outlet: null,
          readings_count: 0,
        });
      } else {
        // Calculate averages
        const inletAvg = calculateAverages(group.map((r) => r.inlet));
        const outletAvg = calculateAverages(group.map((r) => r.outlet));

        hourlyData.push({
          hour,
          timestamp: new Date(
            startOfDay.getFullYear(),
            startOfDay.getMonth(),
            startOfDay.getDate(),
            hour
          ).toISOString(),
          inlet: inletAvg,
          outlet: outletAvg,
          readings_count: group.length,
        });
      }
    }

    console.log(`✅ Generated ${hourlyData.length} hourly data points`);

    return hourlyData;
  } catch (error) {
    console.error("❌ Error in getHourlyAggregation:", error);
    throw error;
  }
}

/**
 * Get daily aggregated data for a date range
 * Perfect for weekly/monthly charts
 * @param {number} ipalId - IPAL ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Daily aggregated data points
 */
async function getDailyAggregation(ipalId, startDate, endDate) {
  try {
    console.log(
      `📊 Fetching daily aggregation for IPAL ${ipalId} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endDate))
      .orderBy("timestamp", "asc")
      .get();

    if (snapshot.empty) {
      return [];
    }

    const readings = snapshot.docs.map((doc) => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate()
        : null,
    }));

    // Group by date (YYYY-MM-DD)
    const dailyGroups = {};

    readings.forEach((reading) => {
      if (!reading.timestamp) return;

      const dateKey = reading.timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = [];
      }
      dailyGroups[dateKey].push(reading);
    });

    // Calculate averages for each day
    const dailyData = Object.keys(dailyGroups)
      .sort()
      .map((dateKey) => {
        const group = dailyGroups[dateKey];

        const inletAvg = calculateAverages(group.map((r) => r.inlet));
        const outletAvg = calculateAverages(group.map((r) => r.outlet));

        // Calculate quality score average
        const qualityScores = group
          .map((r) => r.fuzzy_analysis?.quality_score)
          .filter((score) => score != null);

        const avgQualityScore =
          qualityScores.length > 0
            ? parseFloat(
                (
                  qualityScores.reduce((a, b) => a + b, 0) /
                  qualityScores.length
                ).toFixed(2)
              )
            : null;

        return {
          date: dateKey,
          timestamp: new Date(dateKey).toISOString(),
          inlet: inletAvg,
          outlet: outletAvg,
          quality_score: avgQualityScore,
          readings_count: group.length,
        };
      });

    console.log(`✅ Generated ${dailyData.length} daily data points`);

    return dailyData;
  } catch (error) {
    console.error("❌ Error in getDailyAggregation:", error);
    throw error;
  }
}

/**
 * ========================================
 * PARAMETER-SPECIFIC TRENDS
 * ========================================
 */

/**
 * Get trend data for a specific parameter
 * Useful for single-parameter charts
 * @param {number} ipalId - IPAL ID
 * @param {string} parameter - Parameter name (ph, tds, turbidity, temperature)
 * @param {string} timeRange - Time range ('24h', '7d', '30d', '90d')
 * @param {string} interval - Aggregation interval ('raw', 'hourly', 'daily')
 * @returns {Array} Trend data points
 */
async function getParameterTrend(
  ipalId,
  parameter,
  timeRange = "7d",
  interval = "hourly"
) {
  try {
    console.log(
      `📈 Fetching ${parameter} trend for IPAL ${ipalId}, range: ${timeRange}, interval: ${interval}`
    );

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endDate))
      .orderBy("timestamp", "asc")
      .get();

    if (snapshot.empty) {
      return [];
    }

    const readings = snapshot.docs.map((doc) => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate()
        : null,
    }));

    // Return based on interval
    if (interval === "raw") {
      // Return raw data points
      return readings.map((r) => ({
        timestamp: r.timestamp?.toISOString(),
        inlet: r.inlet?.[parameter],
        outlet: r.outlet?.[parameter],
      }));
    } else if (interval === "hourly") {
      // Aggregate by hour
      return aggregateByHour(readings, parameter);
    } else if (interval === "daily") {
      // Aggregate by day
      return aggregateByDay(readings, parameter);
    }

    return [];
  } catch (error) {
    console.error("❌ Error in getParameterTrend:", error);
    throw error;
  }
}

/**
 * ========================================
 * INLET VS OUTLET COMPARISON
 * ========================================
 */

/**
 * Compare inlet vs outlet for specific time range
 * Returns comparison metrics and efficiency
 * @param {number} ipalId - IPAL ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Comparison data
 */
async function compareInletOutlet(ipalId, startDate, endDate) {
  try {
    console.log(`🔄 Comparing inlet vs outlet for IPAL ${ipalId}`);

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endDate))
      .get();

    if (snapshot.empty) {
      return null;
    }

    const readings = snapshot.docs.map((doc) => doc.data());

    const parameters = ["ph", "tds", "turbidity", "temperature"];
    const comparison = {};

    parameters.forEach((param) => {
      const inletValues = readings
        .map((r) => r.inlet?.[param])
        .filter((v) => v != null);
      const outletValues = readings
        .map((r) => r.outlet?.[param])
        .filter((v) => v != null);

      if (inletValues.length > 0 && outletValues.length > 0) {
        const inletAvg =
          inletValues.reduce((a, b) => a + b, 0) / inletValues.length;
        const outletAvg =
          outletValues.reduce((a, b) => a + b, 0) / outletValues.length;

        // Calculate reduction percentage (for pollutants like TDS, turbidity)
        const reduction = (((inletAvg - outletAvg) / inletAvg) * 100).toFixed(
          2
        );

        comparison[param] = {
          inlet_avg: parseFloat(inletAvg.toFixed(2)),
          outlet_avg: parseFloat(outletAvg.toFixed(2)),
          difference: parseFloat((outletAvg - inletAvg).toFixed(2)),
          reduction_percentage: parseFloat(reduction),
          inlet_min: parseFloat(Math.min(...inletValues).toFixed(2)),
          inlet_max: parseFloat(Math.max(...inletValues).toFixed(2)),
          outlet_min: parseFloat(Math.min(...outletValues).toFixed(2)),
          outlet_max: parseFloat(Math.max(...outletValues).toFixed(2)),
        };
      }
    });

    return {
      readings_count: readings.length,
      time_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      comparison,
    };
  } catch (error) {
    console.error("❌ Error in compareInletOutlet:", error);
    throw error;
  }
}

/**
 * ========================================
 * QUALITY SCORE TRENDS
 * ========================================
 */

/**
 * Get quality score trend over time
 * @param {number} ipalId - IPAL ID
 * @param {string} timeRange - Time range ('24h', '7d', '30d')
 * @returns {Array} Quality score data points
 */
async function getQualityScoreTrend(ipalId, timeRange = "7d") {
  try {
    console.log(
      `📊 Fetching quality score trend for IPAL ${ipalId}, range: ${timeRange}`
    );

    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", ipalId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endDate))
      .orderBy("timestamp", "asc")
      .get();

    if (snapshot.empty) {
      return [];
    }

    const readings = snapshot.docs.map((doc) => ({
      timestamp: doc.data().timestamp?.toDate
        ? doc.data().timestamp.toDate().toISOString()
        : null,
      quality_score: doc.data().fuzzy_analysis?.quality_score || null,
      status: doc.data().fuzzy_analysis?.status || "unknown",
      alert_count: doc.data().fuzzy_analysis?.alert_count || 0,
    }));

    return readings.filter((r) => r.quality_score != null);
  } catch (error) {
    console.error("❌ Error in getQualityScoreTrend:", error);
    throw error;
  }
}

/**
 * ========================================
 * HELPER FUNCTIONS
 * ========================================
 */

/**
 * Calculate statistics for array of parameter readings
 */
function calculateParameterStats(readings, parameters) {
  if (!readings || readings.length === 0) {
    return null;
  }

  const stats = {};

  parameters.forEach((param) => {
    const values = readings.map((r) => r?.[param]).filter((v) => v != null);

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
 * Calculate averages for all parameters
 */
function calculateAverages(readings) {
  if (!readings || readings.length === 0) {
    return null;
  }

  const parameters = ["ph", "tds", "turbidity", "temperature"];
  const averages = {};

  parameters.forEach((param) => {
    const values = readings.map((r) => r?.[param]).filter((v) => v != null);
    if (values.length > 0) {
      averages[param] = parseFloat(
        (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
      );
    } else {
      averages[param] = null;
    }
  });

  return averages;
}

/**
 * Aggregate readings by hour for specific parameter
 */
function aggregateByHour(readings, parameter) {
  const hourlyGroups = {};

  readings.forEach((reading) => {
    if (!reading.timestamp) return;

    const hourKey = reading.timestamp.toISOString().substring(0, 13); // YYYY-MM-DDTHH
    if (!hourlyGroups[hourKey]) {
      hourlyGroups[hourKey] = [];
    }
    hourlyGroups[hourKey].push(reading);
  });

  return Object.keys(hourlyGroups)
    .sort()
    .map((hourKey) => {
      const group = hourlyGroups[hourKey];
      const inletValues = group
        .map((r) => r.inlet?.[parameter])
        .filter((v) => v != null);
      const outletValues = group
        .map((r) => r.outlet?.[parameter])
        .filter((v) => v != null);

      return {
        timestamp: hourKey + ":00:00.000Z",
        inlet:
          inletValues.length > 0
            ? parseFloat(
                (
                  inletValues.reduce((a, b) => a + b, 0) / inletValues.length
                ).toFixed(2)
              )
            : null,
        outlet:
          outletValues.length > 0
            ? parseFloat(
                (
                  outletValues.reduce((a, b) => a + b, 0) / outletValues.length
                ).toFixed(2)
              )
            : null,
        readings_count: group.length,
      };
    });
}

/**
 * Aggregate readings by day for specific parameter
 */
function aggregateByDay(readings, parameter) {
  const dailyGroups = {};

  readings.forEach((reading) => {
    if (!reading.timestamp) return;

    const dateKey = reading.timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
    if (!dailyGroups[dateKey]) {
      dailyGroups[dateKey] = [];
    }
    dailyGroups[dateKey].push(reading);
  });

  return Object.keys(dailyGroups)
    .sort()
    .map((dateKey) => {
      const group = dailyGroups[dateKey];
      const inletValues = group
        .map((r) => r.inlet?.[parameter])
        .filter((v) => v != null);
      const outletValues = group
        .map((r) => r.outlet?.[parameter])
        .filter((v) => v != null);

      return {
        timestamp: new Date(dateKey).toISOString(),
        inlet:
          inletValues.length > 0
            ? parseFloat(
                (
                  inletValues.reduce((a, b) => a + b, 0) / inletValues.length
                ).toFixed(2)
              )
            : null,
        outlet:
          outletValues.length > 0
            ? parseFloat(
                (
                  outletValues.reduce((a, b) => a + b, 0) / outletValues.length
                ).toFixed(2)
              )
            : null,
        readings_count: group.length,
      };
    });
}

/**
 * ========================================
 * EXPORTS
 * ========================================
 */

module.exports = {
  // Time range stats
  getTimeRangeStats,

  // Aggregation
  getHourlyAggregation,
  getDailyAggregation,

  // Parameter trends
  getParameterTrend,

  // Comparison
  compareInletOutlet,

  // Quality score
  getQualityScoreTrend,

  // Helper utilities (exported for reuse)
  calculateParameterStats,
  calculateAverages,
};

console.log("📦 statisticService loaded (universal)");
