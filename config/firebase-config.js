const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");

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
