const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Initialize Firebase first
require("./config/firebase-config");

const app = express();
const port = process.env.PORT || 3000;

const { requireAuth, requireAdmin } = require("./middleware/authMiddleware");

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "IPAL Monitoring API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// ROUTES - TEST ONE BY ONE
// ========================================

// 1. Auth routes
console.log("Loading authRoutes...");
const authRoutes = require("./routes/authroutes");
console.log("authRoutes type:", typeof authRoutes);
app.use("/auth", authRoutes);

// 2. Sensor routes
console.log("Loading sensorRoutes...");
const sensorRoutes = require("./routes/sensorRoutes");
console.log("sensorRoutes type:", typeof sensorRoutes);
app.use("/api/sensors", sensorRoutes);

// 3. Alert routes (KEMUNGKINAN INI YANG ERROR)
console.log("Loading alertRoutes...");
const alertRoutes = require("./routes/alertRoutes");
console.log("alertRoutes type:", typeof alertRoutes);
console.log("alertRoutes value:", alertRoutes);
app.use("/api/alerts", alertRoutes); // ← LINE 47 (ERROR DI SINI)

// Admin test
app.get("/admin/ping", requireAuth, requireAdmin, (req, res) => {
  res.json({
    message: "Admin access granted!",
    user: req.user,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("💥 Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// Start server
app.listen(port, () => {
  console.log("========================================");
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log("========================================\n");
});
