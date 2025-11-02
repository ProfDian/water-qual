/**
 * ========================================
 * AUTH MIDDLEWARE (Fixed)
 * ========================================
 * Verify custom JWT token (bukan Firebase ID token)
 * Konsisten dengan authController yang generate custom JWT
 */

const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase-config");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

/**
 * Require authentication - Verify custom JWT token
 */
exports.requireAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login first.",
      });
    }

    // Extract token (format: "Bearer <token>")
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    console.log("🔐 Verifying JWT token...");

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log("✅ Token verified for user:", decoded.email);

    // Optional: Get latest user data from Firestore
    // (untuk ambil role terbaru kalau ada update)
    const userDoc = await db.collection("users").doc(decoded.uid).get();

    let role = decoded.role || "user"; // Default dari token
    if (userDoc.exists) {
      role = userDoc.data().role || role; // Update dari Firestore
    }

    // Attach user info to request object
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: role,
    };

    console.log("✅ Auth success:", req.user.email, "| Role:", req.user.role);

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message);

    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

/**
 * Require admin role
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required. Your role: " + req.user.role,
    });
  }

  console.log("✅ Admin access granted:", req.user.email);
  next();
};

/**
 * Require manager role (admin atau manager)
 */
exports.requireManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin" && req.user.role !== "manager") {
    return res.status(403).json({
      success: false,
      message: "Manager access required. Your role: " + req.user.role,
    });
  }

  console.log("✅ Manager access granted:", req.user.email);
  next();
};

console.log("📦 authMiddleware loaded (JWT verify)");
