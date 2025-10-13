const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

// POST /auth/login - Login
router.post("/login", authController.login);

// POST /auth/logout - Logout
router.post("/logout", authController.logout);

// GET /auth/profile - Get current user profile (protected)
// ❌ COMMENT DULU - INI YANG ERROR (line 13)
// router.get('/profile', requireAuth, authController.getProfile);

module.exports = router;
