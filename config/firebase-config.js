const admin = require("firebase-admin");

// Get Firebase credentials from environment variable or file
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: use environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("🔐 Using Firebase credentials from environment variable");
} else {
  // Development: use local file
  serviceAccount = require("../serviceAccounts.json");
  console.log("🔐 Using Firebase credentials from serviceAccounts.json");
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
  console.log("✅ Firebase Admin initialized");
} else {
  console.log("⚠️  Firebase Admin already initialized");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
