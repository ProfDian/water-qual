/**
 * ========================================
 * CHART CONTROLLER (FIXED)
 * ========================================
 * Chart-specific endpoints with optimized formatting
 * Returns chart-ready data for frontend visualization
 *
 * Routes will be defined in chartRoutes.js
 */

const chartService = require("../services/chartService");

/**
 * ========================================
 * CHART OPTIONS
 * ========================================
 */

/**
 * GET available chart options
 * Endpoint: GET /api/charts/options
 */
exports.getChartOptions = (req, res) => {
  try {
    const options = {
      chart_types: [
        "timeseries",
        "comparison",
        "quality_score",
        "bar",
        "sensor",
        "dashboard",
      ],
      parameters: ["ph", "tds", "turbidity", "temperature"],
      time_ranges: ["24h", "7d", "30d"],
      formats: ["json"],
    };

    return res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chart options",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * TIME-SERIES CHARTS
 * ========================================
 */

/**
 * GET multi-parameter time-series chart
 * Endpoint: GET /api/charts/timeseries/:ipal_id
 * Query params: time_range (24h|7d|30d), parameters (comma-separated)
 *
 * Example: /api/charts/timeseries/1?time_range=7d&parameters=ph,tds
 */
exports.getTimeSeriesChart = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { time_range = "7d", parameters } = req.query;

    // Validate time_range
    const validTimeRanges = ["24h", "7d", "30d"];
    if (!validTimeRanges.includes(time_range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time_range. Must be one of: ${validTimeRanges.join(
          ", "
        )}`,
      });
    }

    // Parse parameters
    const paramArray = parameters
      ? parameters.split(",").map((p) => p.trim())
      : ["ph", "tds", "turbidity", "temperature"];

    // Validate parameters
    const validParameters = ["ph", "tds", "turbidity", "temperature"];
    const invalidParams = paramArray.filter(
      (p) => !validParameters.includes(p)
    );

    if (invalidParams.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid parameters: ${invalidParams.join(
          ", "
        )}. Valid: ${validParameters.join(", ")}`,
      });
    }

    const chartData = await chartService.getMultiParameterChart(
      parseInt(ipal_id),
      time_range,
      paramArray
    );

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("💥 Error in getTimeSeriesChart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch time-series chart data",
      error: error.message,
    });
  }
};

/**
 * GET parameter comparison chart (inlet vs outlet)
 * Endpoint: GET /api/charts/comparison/:ipal_id/:parameter
 * Query params: time_range (24h|7d|30d)
 *
 * Example: /api/charts/comparison/1/ph?time_range=7d
 */
exports.getComparisonChart = async (req, res) => {
  try {
    const { ipal_id, parameter } = req.params;
    const { time_range = "7d" } = req.query;

    // Validate parameter
    const validParameters = ["ph", "tds", "turbidity", "temperature"];
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({
        success: false,
        message: `Invalid parameter. Must be one of: ${validParameters.join(
          ", "
        )}`,
      });
    }

    // Validate time_range
    const validTimeRanges = ["24h", "7d", "30d"];
    if (!validTimeRanges.includes(time_range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time_range. Must be one of: ${validTimeRanges.join(
          ", "
        )}`,
      });
    }

    const chartData = await chartService.getParameterComparisonChart(
      parseInt(ipal_id),
      parameter,
      time_range
    );

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("💥 Error in getComparisonChart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comparison chart data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * QUALITY SCORE CHARTS
 * ========================================
 */

/**
 * GET quality score chart
 * Endpoint: GET /api/charts/quality-score/:ipal_id
 * Query params: time_range (24h|7d|30d)
 *
 * Example: /api/charts/quality-score/1?time_range=7d
 */
exports.getQualityScoreChart = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { time_range = "7d" } = req.query;

    // Validate time_range
    const validTimeRanges = ["24h", "7d", "30d"];
    if (!validTimeRanges.includes(time_range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time_range. Must be one of: ${validTimeRanges.join(
          ", "
        )}`,
      });
    }

    const chartData = await chartService.getQualityScoreChart(
      parseInt(ipal_id),
      time_range
    );

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("💥 Error in getQualityScoreChart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quality score chart data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * BAR CHARTS
 * ========================================
 */

/**
 * GET inlet vs outlet bar chart
 * Endpoint: GET /api/charts/bar/:ipal_id
 * Query params: time_range (24h|7d|30d)
 *
 * Example: /api/charts/bar/1?time_range=7d
 */
exports.getBarChart = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { time_range = "7d" } = req.query;

    // Validate time_range
    const validTimeRanges = ["24h", "7d", "30d"];
    if (!validTimeRanges.includes(time_range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time_range. Must be one of: ${validTimeRanges.join(
          ", "
        )}`,
      });
    }

    const chartData = await chartService.getInletOutletBarChart(
      parseInt(ipal_id),
      time_range
    );

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("💥 Error in getBarChart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bar chart data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * SENSOR-SPECIFIC CHARTS
 * ========================================
 */

/**
 * GET sensor-specific chart
 * Endpoint: GET /api/charts/sensor/:sensor_id
 * Query params: ipal_id, time_range (24h|7d|30d)
 *
 * Example: /api/charts/sensor/sensor-ph-inlet-001?ipal_id=1&time_range=7d
 */
exports.getSensorChart = async (req, res) => {
  try {
    const { sensor_id } = req.params;
    const { ipal_id, time_range = "7d" } = req.query;

    if (!ipal_id) {
      return res.status(400).json({
        success: false,
        message: "ipal_id query parameter is required",
      });
    }

    // Validate time_range
    const validTimeRanges = ["24h", "7d", "30d"];
    if (!validTimeRanges.includes(time_range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time_range. Must be one of: ${validTimeRanges.join(
          ", "
        )}`,
      });
    }

    const chartData = await chartService.getSensorChart(
      sensor_id,
      parseInt(ipal_id),
      time_range
    );

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("💥 Error in getSensorChart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sensor chart data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * DASHBOARD OVERVIEW CHART
 * ========================================
 */

/**
 * GET comprehensive dashboard chart
 * Combines multiple chart types for dashboard overview
 * Endpoint: GET /api/charts/dashboard/:ipal_id
 * Query params: time_range (24h|7d|30d)
 *
 * Example: /api/charts/dashboard/1?time_range=7d
 */
exports.getDashboardChart = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { time_range = "7d" } = req.query;

    // Validate time_range
    const validTimeRanges = ["24h", "7d", "30d"];
    if (!validTimeRanges.includes(time_range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time_range. Must be one of: ${validTimeRanges.join(
          ", "
        )}`,
      });
    }

    // Fetch multiple chart types in parallel
    const [timeSeriesData, qualityScoreData, barChartData] = await Promise.all([
      chartService.getMultiParameterChart(parseInt(ipal_id), time_range, [
        "ph",
        "tds",
        "turbidity",
        "temperature",
      ]),
      chartService.getQualityScoreChart(parseInt(ipal_id), time_range),
      chartService.getInletOutletBarChart(parseInt(ipal_id), time_range),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        time_series: timeSeriesData,
        quality_score: qualityScoreData,
        bar_chart: barChartData,
      },
      time_range,
    });
  } catch (error) {
    console.error("💥 Error in getDashboardChart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard chart data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * EXPORT DATA (ADMIN ONLY)
 * ========================================
 */

/**
 * Export chart data as CSV
 * Endpoint: GET /api/charts/export/:ipal_id
 * Query params: start_date, end_date, format (default: csv)
 */
exports.exportChartData = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { start_date, end_date, format = "csv" } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    // TODO: Implement CSV export logic
    // This would require a new service function

    return res.status(501).json({
      success: false,
      message: "Export functionality not yet implemented",
      note: "Use /api/reports/generate for PDF reports",
    });
  } catch (error) {
    console.error("💥 Error in exportChartData:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export chart data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * CACHE MANAGEMENT
 * ========================================
 */

/**
 * Clear chart cache (admin/testing)
 * Endpoint: POST /api/charts/cache/clear
 */
exports.clearCache = (req, res) => {
  try {
    const result = chartService.clearChartCache();

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.cleared} chart cache entries`,
      data: result,
    });
  } catch (error) {
    console.error("💥 Error clearing chart cache:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear chart cache",
      error: error.message,
    });
  }
};

/**
 * Get chart cache statistics
 * Endpoint: GET /api/charts/cache/stats
 */
exports.getCacheStats = (req, res) => {
  try {
    const stats = chartService.getChartCacheStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("💥 Error fetching cache stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cache stats",
      error: error.message,
    });
  }
};

// Debug
console.log("📦 chartController loaded");
console.log("📊 Available exports:", Object.keys(module.exports));
