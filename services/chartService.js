/**
 * ========================================
 * CHART SERVICE
 * ========================================
 * Specialized service for chart data preparation
 * Builds on top of statisticService for chart-specific formatting
 *
 * FEATURES:
 * ✅ Chart-ready data formatting
 * ✅ Multi-line chart data
 * ✅ Comparison charts (inlet vs outlet)
 * ✅ Quality score visualization
 * ✅ Smart data point reduction (prevent chart overload)
 * ✅ Cache support for heavy aggregations
 */

const statisticService = require("./statisticService");

/**
 * ========================================
 * CACHE CONFIGURATION
 * ========================================
 */

const chartCache = new Map();
const CHART_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

function getCachedChart(key) {
  const cached = chartCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CHART_CACHE_DURATION) {
    chartCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedChart(key, data) {
  chartCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * ========================================
 * TIME-SERIES CHARTS
 * ========================================
 */

/**
 * Get multi-parameter time-series data
 * Perfect for dashboard overview chart (all parameters in one)
 * @param {number} ipalId - IPAL ID
 * @param {string} timeRange - Time range ('24h', '7d', '30d')
 * @param {Array<string>} parameters - Parameters to include
 * @returns {Object} Chart-ready data with multiple lines
 */
async function getMultiParameterChart(
  ipalId,
  timeRange = "7d",
  parameters = ["ph", "tds", "turbidity", "temperature"]
) {
  try {
    const cacheKey = `multi_${ipalId}_${timeRange}_${parameters.join(",")}`;

    // Check cache
    const cached = getCachedChart(cacheKey);
    if (cached) {
      console.log(`✅ Chart cache HIT: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    console.log(
      `📊 Generating multi-parameter chart for IPAL ${ipalId}, range: ${timeRange}`
    );

    // Determine aggregation interval based on time range
    const interval = timeRange === "24h" ? "hourly" : "daily";

    // Get aggregated data for each parameter
    const parameterData = await Promise.all(
      parameters.map(async (param) => {
        const trend = await statisticService.getParameterTrend(
          ipalId,
          param,
          timeRange,
          interval
        );
        return { parameter: param, data: trend };
      })
    );

    // Format for multi-line chart
    // Create array of timestamps with all parameters
    const timestamps = new Set();
    parameterData.forEach(({ data }) => {
      data.forEach((point) => {
        if (point.timestamp) timestamps.add(point.timestamp);
      });
    });

    const chartData = Array.from(timestamps)
      .sort()
      .map((timestamp) => {
        const dataPoint = { timestamp };

        parameterData.forEach(({ parameter, data }) => {
          const point = data.find((p) => p.timestamp === timestamp);
          dataPoint[`${parameter}_inlet`] = point?.inlet || null;
          dataPoint[`${parameter}_outlet`] = point?.outlet || null;
        });

        return dataPoint;
      });

    const result = {
      chart_type: "multi_parameter",
      time_range: timeRange,
      interval,
      parameters,
      data: chartData,
      data_points: chartData.length,
    };

    // Cache result
    setCachedChart(cacheKey, result);

    return { ...result, cached: false };
  } catch (error) {
    console.error("❌ Error in getMultiParameterChart:", error);
    throw error;
  }
}

/**
 * Get single parameter comparison chart (inlet vs outlet)
 * Perfect for focused parameter analysis
 * @param {number} ipalId - IPAL ID
 * @param {string} parameter - Parameter name
 * @param {string} timeRange - Time range
 * @returns {Object} Chart-ready comparison data
 */
async function getParameterComparisonChart(
  ipalId,
  parameter,
  timeRange = "7d"
) {
  try {
    const cacheKey = `comparison_${ipalId}_${parameter}_${timeRange}`;

    const cached = getCachedChart(cacheKey);
    if (cached) {
      console.log(`✅ Chart cache HIT: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    console.log(
      `📊 Generating comparison chart for ${parameter}, IPAL ${ipalId}`
    );

    const interval = timeRange === "24h" ? "hourly" : "daily";
    const trend = await statisticService.getParameterTrend(
      ipalId,
      parameter,
      timeRange,
      interval
    );

    // Format for comparison chart
    const chartData = trend.map((point) => ({
      timestamp: point.timestamp,
      inlet: point.inlet,
      outlet: point.outlet,
      difference:
        point.inlet && point.outlet
          ? parseFloat((point.outlet - point.inlet).toFixed(2))
          : null,
    }));

    // Calculate summary stats
    const inletValues = chartData.map((d) => d.inlet).filter((v) => v != null);
    const outletValues = chartData
      .map((d) => d.outlet)
      .filter((v) => v != null);

    const summary = {
      inlet_avg:
        inletValues.length > 0
          ? parseFloat(
              (
                inletValues.reduce((a, b) => a + b, 0) / inletValues.length
              ).toFixed(2)
            )
          : null,
      outlet_avg:
        outletValues.length > 0
          ? parseFloat(
              (
                outletValues.reduce((a, b) => a + b, 0) / outletValues.length
              ).toFixed(2)
            )
          : null,
    };

    if (summary.inlet_avg && summary.outlet_avg) {
      summary.reduction_percentage = parseFloat(
        (
          ((summary.inlet_avg - summary.outlet_avg) / summary.inlet_avg) *
          100
        ).toFixed(2)
      );
    }

    const result = {
      chart_type: "parameter_comparison",
      parameter,
      time_range: timeRange,
      interval,
      data: chartData,
      summary,
      data_points: chartData.length,
    };

    setCachedChart(cacheKey, result);

    return { ...result, cached: false };
  } catch (error) {
    console.error("❌ Error in getParameterComparisonChart:", error);
    throw error;
  }
}

/**
 * ========================================
 * QUALITY SCORE CHARTS
 * ========================================
 */

/**
 * Get quality score trend chart
 * Shows water quality over time with status indicators
 * @param {number} ipalId - IPAL ID
 * @param {string} timeRange - Time range
 * @returns {Object} Quality score chart data
 */
async function getQualityScoreChart(ipalId, timeRange = "7d") {
  try {
    const cacheKey = `quality_${ipalId}_${timeRange}`;

    const cached = getCachedChart(cacheKey);
    if (cached) {
      console.log(`✅ Chart cache HIT: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    console.log(`📊 Generating quality score chart for IPAL ${ipalId}`);

    const scoreTrend = await statisticService.getQualityScoreTrend(
      ipalId,
      timeRange
    );

    // Group by status for summary
    const statusCounts = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0,
    };

    scoreTrend.forEach((point) => {
      if (statusCounts.hasOwnProperty(point.status)) {
        statusCounts[point.status]++;
      }
    });

    const result = {
      chart_type: "quality_score",
      time_range: timeRange,
      data: scoreTrend,
      status_distribution: statusCounts,
      data_points: scoreTrend.length,
    };

    setCachedChart(cacheKey, result);

    return { ...result, cached: false };
  } catch (error) {
    console.error("❌ Error in getQualityScoreChart:", error);
    throw error;
  }
}

/**
 * ========================================
 * COMPARISON CHARTS
 * ========================================
 */

/**
 * Get inlet vs outlet comparison bar chart
 * Shows average comparison for all parameters
 * @param {number} ipalId - IPAL ID
 * @param {string} timeRange - Time range
 * @returns {Object} Bar chart comparison data
 */
async function getInletOutletBarChart(ipalId, timeRange = "7d") {
  try {
    const cacheKey = `bar_comparison_${ipalId}_${timeRange}`;

    const cached = getCachedChart(cacheKey);
    if (cached) {
      console.log(`✅ Chart cache HIT: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    console.log(`📊 Generating inlet/outlet bar chart for IPAL ${ipalId}`);

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
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const comparison = await statisticService.compareInletOutlet(
      ipalId,
      startDate,
      endDate
    );

    if (!comparison) {
      return {
        chart_type: "bar_comparison",
        time_range: timeRange,
        data: [],
        message: "No data available",
      };
    }

    // Format for bar chart
    const chartData = Object.keys(comparison.comparison).map((param) => ({
      parameter: param,
      inlet: comparison.comparison[param].inlet_avg,
      outlet: comparison.comparison[param].outlet_avg,
      reduction: comparison.comparison[param].reduction_percentage,
    }));

    const result = {
      chart_type: "bar_comparison",
      time_range: timeRange,
      readings_count: comparison.readings_count,
      data: chartData,
    };

    setCachedChart(cacheKey, result);

    return { ...result, cached: false };
  } catch (error) {
    console.error("❌ Error in getInletOutletBarChart:", error);
    throw error;
  }
}

/**
 * ========================================
 * SENSOR-SPECIFIC CHARTS
 * ========================================
 */

/**
 * Get chart data for individual sensor
 * Used in sensor detail page
 * @param {string} sensorId - Sensor ID (e.g., "sensor-ph-inlet-001")
 * @param {number} ipalId - IPAL ID
 * @param {string} timeRange - Time range
 * @returns {Object} Sensor-specific chart data
 */
async function getSensorChart(sensorId, ipalId, timeRange = "7d") {
  try {
    const cacheKey = `sensor_${sensorId}_${timeRange}`;

    const cached = getCachedChart(cacheKey);
    if (cached) {
      console.log(`✅ Chart cache HIT: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    console.log(`📊 Generating sensor chart for ${sensorId}`);

    // Parse sensor info from ID
    const sensorInfo = parseSensorId(sensorId);
    if (!sensorInfo) {
      throw new Error(`Invalid sensor ID format: ${sensorId}`);
    }

    const { parameter, location } = sensorInfo;

    // Get parameter trend
    const interval = timeRange === "24h" ? "hourly" : "daily";
    const trend = await statisticService.getParameterTrend(
      ipalId,
      parameter,
      timeRange,
      interval
    );

    // Extract only the relevant location data
    const chartData = trend
      .map((point) => ({
        timestamp: point.timestamp,
        value: point[location], // inlet or outlet
        readings_count: point.readings_count,
      }))
      .filter((point) => point.value != null);

    // Calculate stats
    const values = chartData.map((d) => d.value);
    const stats =
      values.length > 0
        ? {
            avg: parseFloat(
              (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
            ),
            min: parseFloat(Math.min(...values).toFixed(2)),
            max: parseFloat(Math.max(...values).toFixed(2)),
          }
        : null;

    const result = {
      chart_type: "sensor_specific",
      sensor_id: sensorId,
      parameter,
      location,
      time_range: timeRange,
      interval,
      data: chartData,
      statistics: stats,
      data_points: chartData.length,
    };

    setCachedChart(cacheKey, result);

    return { ...result, cached: false };
  } catch (error) {
    console.error("❌ Error in getSensorChart:", error);
    throw error;
  }
}

/**
 * ========================================
 * HELPER FUNCTIONS
 * ========================================
 */

/**
 * Parse sensor ID to extract parameter and location
 * Example: "sensor-ph-inlet-001" -> { parameter: "ph", location: "inlet" }
 */
function parseSensorId(sensorId) {
  const parts = sensorId.split("-");

  if (parts.length < 3) {
    return null;
  }

  return {
    parameter: parts[1], // ph, tds, turb, temp
    location: parts[2], // inlet, outlet
  };
}

/**
 * Reduce data points if too many (prevent chart overload)
 * Keep first, last, and evenly distributed middle points
 */
function reduceDataPoints(data, maxPoints = 100) {
  if (data.length <= maxPoints) {
    return data;
  }

  const step = Math.floor(data.length / (maxPoints - 2));
  const reduced = [data[0]]; // Keep first

  for (let i = step; i < data.length - 1; i += step) {
    reduced.push(data[i]);
  }

  reduced.push(data[data.length - 1]); // Keep last

  console.log(`📉 Reduced data points: ${data.length} → ${reduced.length}`);

  return reduced;
}

/**
 * ========================================
 * CACHE MANAGEMENT
 * ========================================
 */

/**
 * Clear chart cache (for testing/admin)
 */
function clearChartCache() {
  const count = chartCache.size;
  chartCache.clear();
  console.log(`🧹 Cleared chart cache (${count} entries)`);
  return { cleared: count };
}

/**
 * Get chart cache stats
 */
function getChartCacheStats() {
  return {
    size: chartCache.size,
    entries: Array.from(chartCache.entries()).map(([key, data]) => ({
      key,
      age_seconds: Math.floor((Date.now() - data.timestamp) / 1000),
    })),
  };
}

/**
 * Auto cleanup expired cache (runs every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, data] of chartCache.entries()) {
    if (now - data.timestamp > CHART_CACHE_DURATION) {
      chartCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(
      `🧹 Chart cache cleanup: removed ${cleaned} expired entry(ies)`
    );
  }
}, 5 * 60 * 1000);

/**
 * ========================================
 * EXPORTS
 * ========================================
 */

module.exports = {
  // Time-series charts
  getMultiParameterChart,
  getParameterComparisonChart,

  // Quality charts
  getQualityScoreChart,

  // Comparison charts
  getInletOutletBarChart,

  // Sensor charts
  getSensorChart,

  // Utilities
  reduceDataPoints,
  parseSensorId,

  // Cache management
  clearChartCache,
  getChartCacheStats,
};

console.log("📦 chartService loaded");
console.log(
  "⏱️  Chart cache duration:",
  CHART_CACHE_DURATION / 1000,
  "seconds"
);
