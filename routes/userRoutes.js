/**
 * ========================================
 * USER MANAGEMENT ROUTES
 * ========================================
 * Protected routes for user CRUD operations
 * Requires authentication middleware
 */

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin only)
 * @access  Admin
 * @body    { email, password, role, username }
 */
router.post("/", userController.createUser);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Admin, Manager
 */
router.get("/", userController.getAllUsers);

/**
 * @route   GET /api/users/:uid
 * @desc    Get user by ID
 * @access  Admin, Manager, Own profile
 */
router.get("/:uid", userController.getUserById);

/**
 * @route   PUT /api/users/:uid
 * @desc    Update user (role, username)
 * @access  Admin
 * @body    { username?, role? }
 */
router.put("/:uid", userController.updateUser);

/**
 * @route   DELETE /api/users/:uid
 * @desc    Delete user
 * @access  Admin
 */
router.delete("/:uid", userController.deleteUser);

/**
 * @route   POST /api/users/:uid/reset-password
 * @desc    Reset user password
 * @access  Admin
 * @body    { newPassword }
 */
router.post("/:uid/reset-password", userController.resetPassword);

console.log("📦 userRoutes loaded");
module.exports = router;
