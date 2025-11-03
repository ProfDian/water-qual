/**
 * ========================================
 * AUTH ROUTES (UPDATED)
 * ========================================
 * Menambahkan GET /auth/profile endpoint
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * POST /auth/login
 * Login with email & password
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "token": "jwt_token_here",
 *   "user": {
 *     "uid": "...",
 *     "email": "...",
 *     "username": "...",
 *     "role": "..."
 *   }
 * }
 */
router.post("/login", authController.login);
[4];
/**
 * POST /auth/logout
 * Logout user
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Logout successful"
 * }
 */
router.post("/logout", authController.logout);

/**
 * GET /auth/profile
 * Get current user profile (protected route)
 * Requires: Authorization header with JWT token
 *
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "uid": "...",
 *     "email": "...",
 *     "username": "...",
 *     "role": "...",
 *     "created_at": "..."
 *   }
 * }
 */
router.get("/profile", requireAuth, authController.getProfile);

module.exports = router;

console.log("📦 authRoutes (with profile) loaded");
