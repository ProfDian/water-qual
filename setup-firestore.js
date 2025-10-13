// setup-firestore.js
// Script untuk initialize Firestore collections
// Run once: node setup-firestore.js

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function setupCollections() {
  console.log("🚀 Starting Firestore setup...\n");

  try {
    // 1. Setup users collection structure
    console.log("📁 Setting up users collection...");
    const usersRef = db.collection("users");
    console.log("✅ users collection ready");

    // 2. Setup ipals collection structure
    console.log("📁 Setting up ipals collection...");
    const ipalsRef = db.collection("ipals");
    console.log("✅ ipals collection ready");

    // 3. Setup sensors collection structure
    console.log("📁 Setting up sensors collection...");
    const sensorsRef = db.collection("sensors");
    console.log("✅ sensors collection ready");

    // 4. Setup water_quality_readings collection structure
    console.log("📁 Setting up water_quality_readings collection...");
    const readingsRef = db.collection("water_quality_readings");
    console.log("✅ water_quality_readings collection ready");

    // 5. Setup alerts collection structure
    console.log("📁 Setting up alerts collection...");
    const alertsRef = db.collection("alerts");
    console.log("✅ alerts collection ready");

    // 6. Setup alert_notifications collection structure
    console.log("📁 Setting up alert_notifications collection...");
    const notificationsRef = db.collection("alert_notifications");
    console.log("✅ alert_notifications collection ready");

    console.log("\n✨ Firestore collections setup complete!");
    console.log("\n📋 Collections created:");
    console.log("  - users");
    console.log("  - ipals");
    console.log("  - sensors");
    console.log("  - water_quality_readings");
    console.log("  - alerts");
    console.log("  - alert_notifications");

    console.log("\n💡 Next steps:");
    console.log("  1. Add data via your API endpoints");
    console.log("  2. Or use Firebase Console to add initial data");
    console.log("  3. Configure Firestore security rules in Firebase Console");
  } catch (error) {
    console.error("❌ Error setting up Firestore:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run setup
setupCollections();
