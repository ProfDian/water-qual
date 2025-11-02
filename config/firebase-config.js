const admin = require("firebase-admin");
const serviceAccounts = require("../serviceAccounts.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccounts),
    databaseURL: `https://${serviceAccounts.project_id}.firebaseio.com`,
  });
  console.log("✅ Firebase Admin initialized");
} else {
  console.log("⚠️  Firebase Admin already initialized");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
