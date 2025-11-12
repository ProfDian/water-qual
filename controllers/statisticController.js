/**
 * ========================================
 * STATISTIC CONTROLLER
 * ========================================
 * Generic statistics endpoints
 * Used by: Dashboard, Charts, Sensor Pages, Reports
 *
 * Routes will be defined in statisticRoutes.js
 */

const statisticService = require("../services/statisticService");

/**
 * ========================================
 * TIME RANGE STATISTICS
 * ========================================
 */

/**
 * GET statistics for custom time range
 * Endpoint: GET /api/statistics/range/:ipal_id
 * Query params: start_date, end_date, parameters (optional)
 *
 * Example: /api/statistics/range/1?start_date=2025-11-01&end_date=2025-11-08&parameters=ph,tds
 */
exports.getTimeRangeStats = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { start_date, end_date, parameters } = req.query;

    // Validate required params
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    // Parse dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use ISO format (YYYY-MM-DD)",
      });
    }

    // Parse parameters (optional)
    const paramArray = parameters
      ? parameters.split(",").map((p) => p.trim())
      : ["ph", "tds", "turbidity", "temperature"];

    // Get statistics
    const stats = await statisticService.getTimeRangeStats(
      parseInt(ipal_id),
      startDate,
      endDate,
      paramArray
    );

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("💥 Error in getTimeRangeStats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch time range statistics",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * AGGREGATED DATA
 * ========================================
 */

/**
 * GET hourly aggregated data
 * Endpoint: GET /api/statistics/hourly/:ipal_id
 * Query params: date (YYYY-MM-DD)
 *
 * Example: /api/statistics/hourly/1?date=2025-11-09
 */
exports.getHourlyAggregation = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date parameter is required (format: YYYY-MM-DD)",
      });
    }

    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const hourlyData = await statisticService.getHourlyAggregation(
      parseInt(ipal_id),
      targetDate
    );

    return res.status(200).json({
      success: true,
      data: hourlyData,
      date: date,
      data_points: hourlyData.length,
    });
  } catch (error) {
    console.error("💥 Error in getHourlyAggregation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hourly aggregation",
      error: error.message,
    });
  }
};

/**
 * GET daily aggregated data
 * Endpoint: GET /api/statistics/daily/:ipal_id
 * Query params: start_date, end_date
 *
 * Example: /api/statistics/daily/1?start_date=2025-11-01&end_date=2025-11-08
 */
exports.getDailyAggregation = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const dailyData = await statisticService.getDailyAggregation(
      parseInt(ipal_id),
      startDate,
      endDate
    );

    return res.status(200).json({
      success: true,
      data: dailyData,
      time_range: {
        start: start_date,
        end: end_date,
      },
      data_points: dailyData.length,
    });
  } catch (error) {
    console.error("💥 Error in getDailyAggregation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch daily aggregation",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * PARAMETER TRENDS
 * ========================================
 */

/**
 * GET parameter trend
 * Endpoint: GET /api/statistics/trend/:ipal_id/:parameter
 * Query params: time_range (24h|7d|30d|90d), interval (raw|hourly|daily)
 *
 * Example: /api/statistics/trend/1/ph?time_range=7d&interval=hourly
 */
exports.getParameterTrend = async (req, res) => {
  try {
    const { ipal_id, parameter } = req.params;
    const { time_range = "7d", interval = "hourly" } = req.query;

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
    const validTimeRanges = ["24h", "7d", "30d", "90d"];
    if (!validTimeRanges.includes(time_range)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time_range. Must be one of: ${validTimeRanges.join(
          ", "
        )}`,
      });
    }

    // Validate interval
    const validIntervals = ["raw", "hourly", "daily"];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interval. Must be one of: ${validIntervals.join(
          ", "
        )}`,
      });
    }

    const trend = await statisticService.getParameterTrend(
      parseInt(ipal_id),
      parameter,
      time_range,
      interval
    );

    return res.status(200).json({
      success: true,
      data: trend,
      parameter,
      time_range,
      interval,
      data_points: trend.length,
    });
  } catch (error) {
    console.error("💥 Error in getParameterTrend:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch parameter trend",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * COMPARISON
 * ========================================
 */

/**
 * GET inlet vs outlet comparison
 * Endpoint: GET /api/statistics/compare/:ipal_id
 * Query params: start_date, end_date
 *
 * Example: /api/statistics/compare/1?start_date=2025-11-01&end_date=2025-11-08
 */
exports.compareInletOutlet = async (req, res) => {
  try {
    const { ipal_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const comparison = await statisticService.compareInletOutlet(
      parseInt(ipal_id),
      startDate,
      endDate
    );

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: "No data found for the specified time range",
      });
    }

    return res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error("💥 Error in compareInletOutlet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comparison data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * QUALITY SCORE
 * ========================================
 */

/**
 * GET quality score trend
 * Endpoint: GET /api/statistics/quality-score/:ipal_id
 * Query params: time_range (24h|7d|30d)
 *
 * Example: /api/statistics/quality-score/1?time_range=7d
 */
exports.getQualityScoreTrend = async (req, res) => {
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

    const trend = await statisticService.getQualityScoreTrend(
      parseInt(ipal_id),
      time_range
    );

    return res.status(200).json({
      success: true,
      data: trend,
      time_range,
      data_points: trend.length,
    });
  } catch (error) {
    console.error("💥 Error in getQualityScoreTrend:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quality score trend",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * UTILITY ENDPOINTS
 * ========================================
 */

/**
 * GET available time ranges and parameters
 * Endpoint: GET /api/statistics/options
 *
 * Helper endpoint for frontend to know available options
 */
exports.getOptions = (req, res) => {
  try {
    const options = {
      parameters: ["ph", "tds", "turbidity", "temperature"],
      time_ranges: ["24h", "7d", "30d", "90d"],
      intervals: ["raw", "hourly", "daily"],
      comparison_ranges: ["24h", "7d", "30d"],
    };

    return res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch options",
      error: error.message,
    });
  }
};

// Debug
console.log("📦 statisticController loaded");
console.log("📊 Available exports:", Object.keys(module.exports));
