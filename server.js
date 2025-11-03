const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Initialize Firebase first
require("./config/firebase-config");

const app = express();
const port = process.env.PORT || 3000;

const { requireAuth, requireAdmin } = require("./middleware/authMiddleware");

// CORS Configuration
const corsOptions = {
  origin: "http://localhost:5173", // Frontend URL (Vite)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions)); // Apply CORS configuration

// Middleware
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
// ROUTES
// ========================================

// 1. Auth routes
console.log("Loading authRoutes...");
const authRoutes = require("./routes/authroutes");
console.log("authRoutes type:", typeof authRoutes);
app.use("/auth", authRoutes);
app.use("/profile", requireAuth, authRoutes);

// 2. Sensor routes
console.log("Loading sensorRoutes...");
const sensorRoutes = require("./routes/sensorRoutes");
console.log("sensorRoutes type:", typeof sensorRoutes);
app.use("/api/sensors", sensorRoutes);

// 3. Alert routes
console.log("Loading alertRoutes...");
const alertRoutes = require("./routes/alertRoutes");
console.log("alertRoutes type:", typeof alertRoutes);
app.use("/api/alerts", alertRoutes);

// 4. Dashboard routes ← TAMBAH INI
console.log("Loading dashboardRoutes...");
const dashboardRoutes = require("./routes/dashboardRoutes");
console.log("dashboardRoutes type:", typeof dashboardRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 5. Notification routes
console.log("Loading notificationRoutes...");
const notificationRoutes = require("./routes/notificationRoutes");
console.log("notificationRoutes type:", typeof notificationRoutes);
app.use("/api/notifications", notificationRoutes);

// 6. REPORT ROUTES
console.log("Loading reportRoutes...");
const reportRoutes = require("./routes/reportRoutes");
console.log("reportRoutes type:", typeof reportRoutes);
app.use("/api/reports", reportRoutes);

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
