const { admin, db, auth } = require("../config/firebase-config");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Load from .env
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// ⭐ DEBUG: Cek API key di-load atau tidak
console.log(
  "🔑 Firebase API Key loaded:",
  FIREBASE_API_KEY ? "✅ Yes" : "❌ No"
);
console.log(
  "🔑 API Key preview:",
  FIREBASE_API_KEY ? `${FIREBASE_API_KEY.substring(0, 10)}...` : "undefined"
);

/**
 * LOGIN
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("📥 Login attempt for:", email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Cek API Key tersedia
    if (!FIREBASE_API_KEY) {
      console.error("❌ FIREBASE_API_KEY not set in .env file!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: Firebase API key missing",
      });
    }

    // Verifikasi dengan Firebase REST API
    let firebaseUser;
    try {
      const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

      console.log("🔗 Calling Firebase Auth API...");

      const response = await axios.post(signInUrl, {
        email,
        password,
        returnSecureToken: true,
      });

      firebaseUser = response.data;
      console.log("✅ Firebase Auth successful for UID:", firebaseUser.localId);
    } catch (authError) {
      console.error(
        "❌ Firebase Auth failed:",
        authError.response?.data || authError.message
      );

      // Detailed error handling
      const errorMessage =
        authError.response?.data?.error?.message || "Invalid email or password";

      return res.status(401).json({
        success: false,
        message: errorMessage,
        debug:
          process.env.NODE_ENV === "development"
            ? {
                firebaseError: authError.response?.data,
              }
            : undefined,
      });
    }

    // Ambil user data dari Firestore
    const userDoc = await db
      .collection("users")
      .doc(firebaseUser.localId)
      .get();

    let userData;

    if (!userDoc.exists) {
      console.log("⚠️  User authenticated but no Firestore data. Creating...");

      userData = {
        email: firebaseUser.email,
        username: firebaseUser.email.split("@")[0],
        role: "admin",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(firebaseUser.localId).set(userData);
    } else {
      userData = userDoc.data();
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: firebaseUser.localId,
        email: firebaseUser.email,
        role: userData.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Login successful for:", email);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        uid: firebaseUser.localId,
        email: firebaseUser.email,
        username: userData.username,
        role: userData.role,
      },
    });
  } catch (error) {
    console.error("💥 Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        uid,
        ...userDoc.data(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

console.log("📦 authController exports:", Object.keys(module.exports));
