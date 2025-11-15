/**
 * ========================================
 * SERVER.JS
 * ========================================
 * Main Express server configuration
 */

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Initialize Firebase first
require("./config/firebase-config");

const app = express();
const port = process.env.PORT || 3000;

const { requireAuth, requireAdmin } = require("./middleware/authMiddleware");

// ========================================
// CORS CONFIGURATION
// ========================================
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://ipal-monitoring-teklingundip.vercel.app",
    "https://*.vercel.app", // Allow all Vercel preview URLs
    process.env.FRONTEND_URL || "http://localhost:5173",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Disposition", "Content-Type"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ========================================
// MIDDLEWARE
// ========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========================================
// CACHE STATS ENDPOINT
// ========================================
const { getCacheStats, clearCache } = require("./middleware/cacheMiddleware");

/**
 * GET /api/cache/stats
 * Get cache statistics (protected - requires auth)
 */
app.get("/api/cache/stats", requireAuth, (req, res) => {
  const stats = getCacheStats();
  res.json({
    success: true,
    data: stats,
    message: "Cache statistics retrieved successfully",
  });
});

/**
 * DELETE /api/cache/clear
 * Clear all cache (admin only)
 */
app.delete("/api/cache/clear", requireAuth, requireAdmin, (req, res) => {
  const pattern = req.query.pattern || null;
  const cleared = clearCache(pattern);

  res.json({
    success: true,
    data: {
      cleared_entries: cleared,
      pattern: pattern || "all",
    },
    message: pattern
      ? `Cleared ${cleared} cache entries matching: ${pattern}`
      : `Cleared all cache (${cleared} entries)`,
  });
});

// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (req, res) => {
  res.json({
    message: "IPAL Monitoring API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// ROUTES REGISTRATION
// ========================================

// 1. Auth routes
console.log("📦 Loading authRoutes...");
const authRoutes = require("./routes/authroutes");
app.use("/auth", authRoutes);
console.log("✅ authRoutes loaded");

// 2. Sensor routes
console.log("📦 Loading sensorRoutes...");
const sensorRoutes = require("./routes/sensorRoutes");
app.use("/api/sensors", sensorRoutes);
console.log("✅ sensorRoutes loaded");

// 3. Alert routes
console.log("📦 Loading alertRoutes...");
const alertRoutes = require("./routes/alertRoutes");
app.use("/api/alerts", alertRoutes);
console.log("✅ alertRoutes loaded");

// 4. Dashboard routes
console.log("📦 Loading dashboardRoutes...");
const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);
console.log("✅ dashboardRoutes loaded");

// 5. Notification routes
console.log("📦 Loading notificationRoutes...");
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);
console.log("✅ notificationRoutes loaded");

// 6. Report routes
console.log("📦 Loading reportRoutes...");
const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);
console.log("✅ reportRoutes loaded");

// 7. Water Quality routes
console.log("📦 Loading waterQualityRoutes...");
const waterQualityRoutes = require("./routes/waterQualityRoutes");
app.use("/api/water-quality", waterQualityRoutes);
console.log("✅ waterQualityRoutes loaded");

// 8. User Management routes (NEW)
console.log("📦 Loading userRoutes...");
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);
console.log("✅ userRoutes loaded");

// 9. IPAL Management routes (NEW)
console.log("📦 Loading ipalRoutes...");
const ipalRoutes = require("./routes/ipalRoutes");
app.use("/api/ipals", ipalRoutes);
console.log("✅ ipalRoutes loaded");

// 10. Statistic routes (TODO: akan dibuat ulang)
// console.log("📦 Loading statisticRoutes...");
// const statisticRoutes = require("./routes/statisticRoutes");
// app.use("/api/statistics", statisticRoutes);
// console.log("✅ statisticRoutes loaded");

// 10. Chart routes (TODO: akan dibuat ulang)
// console.log("📦 Loading chartRoutes...");
// const chartRoutes = require("./routes/chartRoutes");
// app.use("/api/charts", chartRoutes);
// console.log("✅ chartRoutes loaded");

// ========================================
// TEST ENDPOINTS
// ========================================

// Admin test endpoint
app.get("/admin/ping", requireAuth, requireAdmin, (req, res) => {
  res.json({
    message: "Admin access granted!",
    user: req.user,
  });
});

// ========================================
// ERROR HANDLERS
// ========================================

// 404 handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("💥 Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ========================================
// START SERVER
// ========================================
// Only start server if not in Vercel (serverless environment)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log("\n========================================");
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log("========================================");
    console.log("\n📍 Available endpoints:");

    console.log("\n🔐 Auth & Users:");
    console.log("   POST   /auth/login");
    console.log("   POST   /auth/register");
    console.log("   POST   /auth/logout");
    console.log("   GET    /auth/me");

    console.log("\n🔧 Sensors:");
    console.log("   GET    /api/sensors");
    console.log("   GET    /api/sensors/:id");
    console.log("   GET    /api/sensors/ipal/:ipal_id");
    console.log("   GET    /api/sensors/:id/status");
    console.log("   GET    /api/sensors/:id/latest");
    console.log("   GET    /api/sensors/:id/history");
    console.log("   PUT    /api/sensors/:id                    (Manager+)");
    console.log("   GET    /api/sensors/readings");
    console.log("   GET    /api/sensors/readings/latest/:ipal_id");

    console.log("\n💧 Water Quality:");
    console.log("   POST   /api/water-quality/submit          (ESP32)");
    console.log("   GET    /api/water-quality/health");
    console.log("   GET    /api/water-quality/readings");
    console.log("   GET    /api/water-quality/buffer-status");
    console.log("   DELETE /api/water-quality/cleanup-buffer  (Admin)");

    console.log("\n📊 Statistics:");
    console.log("   (TODO: Will be created)");

    console.log("\n📈 Charts:");
    console.log("   (TODO: Will be created)");

    console.log("\n🚨 Alerts:");
    console.log("   GET    /api/alerts");
    console.log("   GET    /api/alerts/:alert_id");
    console.log("   PUT    /api/alerts/:alert_id/acknowledge");
    console.log("   DELETE /api/alerts/:alert_id              (Admin)");

    console.log("\n🏭 IPAL Management:");
    console.log("   GET    /api/ipals");
    console.log("   GET    /api/ipals/:ipal_id");
    console.log("   GET    /api/ipals/:ipal_id/stats");

    console.log("\n📋 Dashboard:");
    console.log("   GET    /api/dashboard/summary/:ipal_id");
    console.log("   GET    /api/dashboard/overview");
    console.log("   GET    /api/dashboard/readings/:ipal_id    (Charts)");

    console.log("\n📄 Reports:");
    console.log("   POST   /api/reports/generate");
    console.log("   GET    /api/reports/:report_id");
    console.log("   GET    /api/reports");

    console.log("\n🔔 Notifications:");
    console.log("   GET    /api/notifications");
    console.log("   POST   /api/notifications/token");
    console.log("   PUT    /api/notifications/:id/read");

    console.log("\n🧪 Test:");
    console.log("   GET    /admin/ping                        (Admin only)");

    console.log("\n========================================");
    console.log("✨ Server ready to accept connections");
    console.log("========================================\n");
  });
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n👋 SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

module.exports = app;
