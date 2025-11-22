/**
 * ========================================
 * REFRESH SENSOR TIMESTAMPS
 * ========================================
 * Update all sensor timestamps to NOW so they appear online
 *
 * Usage: node refresh-sensor-timestamps.js
 */

const { db, admin } = require("./config/firebase-config");

async function refreshSensorTimestamps() {
  try {
    console.log("🔧 Refreshing sensor timestamps...\n");

    // Get all sensors
    const sensorsSnapshot = await db.collection("sensors").get();

    if (sensorsSnapshot.empty) {
      console.log("⚠️  No sensors found!");
      process.exit(1);
    }

    console.log(`📊 Found ${sensorsSnapshot.size} sensor(s)\n`);

    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    console.log(`🕐 Current time: ${now.toDate().toISOString()}\n`);

    sensorsSnapshot.forEach((doc) => {
      const sensor = doc.data();

      console.log(`✏️  Updating ${doc.id}...`);
      console.log(`   Type: ${sensor.sensor_type} (${sensor.sensor_location})`);

      // Update timestamps in latest_reading
      if (sensor.latest_reading) {
        batch.update(doc.ref, {
          "latest_reading.timestamp": now,
          last_updated_at: now,
          updated_at: now,
        });
        console.log(`   ✅ Timestamps updated to NOW`);
      } else {
        console.log(`   ⚠️  No latest_reading, skipping`);
      }
      console.log();
    });

    // Commit batch
    await batch.commit();

    console.log("========================================");
    console.log("✅ All sensor timestamps refreshed!");
    console.log("📊 Sensors should now appear ONLINE");
    console.log("========================================\n");
    console.log("💡 Refresh your frontend to see the changes!");

    process.exit(0);
  } catch (error) {
    console.error("💥 Error refreshing timestamps:", error);
    process.exit(1);
  }
}

// Run refresh
refreshSensorTimestamps();
