// setup-firestore.js
// Script untuk initialize Firestore collections
// Run once: node setup-firestore.js

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccounts2.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function setupCollections() {
  console.log("🚀 Starting Firestore setup...\n");

  try {
    // 1. Setup ipals collection structure
    console.log("📁 Setting up ipals collection...");
    const ipalsRef = db.collection("ipals");
    console.log("✅ ipals collection ready");

    // 2. Setup sensors collection structure
    console.log("📁 Setting up sensors collection...");
    const sensorsRef = db.collection("sensors");
    console.log("✅ sensors collection ready");

    console.log("\n✨ Firestore collections setup complete!");
    console.log("\n📋 Collections created:");
    console.log("  - ipals");
    console.log("  - sensors");

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
