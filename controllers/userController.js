/**
 * ========================================
 * USER MANAGEMENT CONTROLLER
 * ========================================
 * Handle CRUD operations for users (Admin only)
 * - Create user with role (Firebase Auth + Firestore)
 * - Get all users
 * - Update user (role, username)
 * - Delete user
 */

const { admin, db } = require("../config/firebase-config");

/**
 * CREATE NEW USER
 * POST /api/users
 * Body: { email, password, role, username }
 * Admin creates new user with specific role
 */
exports.createUser = async (req, res) => {
  try {
    const { email, password, role = "teknisi", username } = req.body;

    // Validate admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create users",
      });
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Validate role
    const validRoles = ["admin", "manager", "teknisi"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    console.log(`👤 Creating new user: ${email} with role: ${role}`);

    // 1. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true, // Auto-verify for admin-created accounts
    });

    console.log(`✅ Firebase Auth user created: ${userRecord.uid}`);

    // 2. Create user document in Firestore
    const userData = {
      email,
      username: username || email.split("@")[0],
      role,
      created_at: new Date().toISOString(),
      created_by: req.user.uid, // Track who created this user
      updated_at: new Date().toISOString(),
    };

    await db.collection("users").doc(userRecord.uid).set(userData);

    console.log(`✅ Firestore user document created for: ${email}`);

    // 3. Return response
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        uid: userRecord.uid,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        created_at: userData.created_at,
      },
    });
  } catch (error) {
    console.error("💥 Error creating user:", error);

    // Handle specific Firebase errors
    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    if (error.code === "auth/invalid-email") {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (error.code === "auth/weak-password") {
      return res.status(400).json({
        success: false,
        message: "Password should be at least 6 characters",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

/**
 * GET ALL USERS
 * GET /api/users
 * Admin/Manager can view all users
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Check permission
    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view users",
      });
    }

    console.log(`📋 Fetching all users (requested by: ${req.user.email})`);

    // Get all users from Firestore
    const usersSnapshot = await db.collection("users").get();

    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        created_at: userData.created_at,
        fcm_token: userData.fcm_token ? "✓" : null, // Don't expose actual token
      });
    });

    // Sort by role: admin > manager > teknisi
    const roleOrder = { admin: 1, manager: 2, teknisi: 3 };
    users.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

    console.log(`✅ Found ${users.length} users`);

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("💥 Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/**
 * GET USER BY ID
 * GET /api/users/:uid
 * Admin/Manager can view user details
 */
exports.getUserById = async (req, res) => {
  try {
    const { uid } = req.params;

    // Check permission
    if (!["admin", "manager"].includes(req.user.role)) {
      // Teknisi can only view their own profile
      if (req.user.uid !== uid) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own profile",
        });
      }
    }

    console.log(`👤 Fetching user: ${uid}`);

    // Get user from Firestore
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = userDoc.data();

    console.log(`✅ User found: ${userData.email}`);

    return res.status(200).json({
      success: true,
      user: {
        uid: userDoc.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      },
    });
  } catch (error) {
    console.error("💥 Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

/**
 * UPDATE USER
 * PUT /api/users/:uid
 * Admin can update role, username
 */
exports.updateUser = async (req, res) => {
  try {
    const { uid } = req.params;
    const { username, role } = req.body;

    // Only admin can update users
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update users",
      });
    }

    // Validate role if provided
    if (role) {
      const validRoles = ["admin", "manager", "teknisi"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        });
      }
    }

    console.log(`✏️  Updating user: ${uid}`);

    // Check if user exists
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (username) updateData.username = username;
    if (role) updateData.role = role;

    // Update in Firestore
    await db.collection("users").doc(uid).update(updateData);

    console.log(`✅ User updated: ${uid}`);

    // Get updated user data
    const updatedDoc = await db.collection("users").doc(uid).get();
    const updatedData = updatedDoc.data();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        uid: updatedDoc.id,
        email: updatedData.email,
        username: updatedData.username,
        role: updatedData.role,
        updated_at: updatedData.updated_at,
      },
    });
  } catch (error) {
    console.error("💥 Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

/**
 * DELETE USER
 * DELETE /api/users/:uid
 * Admin can delete users
 */
exports.deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;

    // Only admin can delete users
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete users",
      });
    }

    // Prevent admin from deleting themselves
    if (uid === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    console.log(`🗑️  Deleting user: ${uid}`);

    // Check if user exists
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = userDoc.data();

    // 1. Delete from Firebase Authentication
    await admin.auth().deleteUser(uid);
    console.log(`✅ User deleted from Firebase Auth: ${uid}`);

    // 2. Delete from Firestore
    await db.collection("users").doc(uid).delete();
    console.log(`✅ User deleted from Firestore: ${uid}`);

    return res.status(200).json({
      success: true,
      message: `User ${userData.email} deleted successfully`,
    });
  } catch (error) {
    console.error("💥 Error deleting user:", error);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        message: "User not found in Firebase Authentication",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

/**
 * RESET USER PASSWORD
 * POST /api/users/:uid/reset-password
 * Admin can reset user password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { uid } = req.params;
    const { newPassword } = req.body;

    // Only admin can reset passwords
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can reset passwords",
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    console.log(`🔐 Resetting password for user: ${uid}`);

    // Update password in Firebase Auth
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    // Update timestamp in Firestore
    await db.collection("users").doc(uid).update({
      password_reset_at: new Date().toISOString(),
      password_reset_by: req.user.uid,
    });

    console.log(`✅ Password reset successful for: ${uid}`);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("💥 Error resetting password:", error);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

console.log("📦 userController loaded");
