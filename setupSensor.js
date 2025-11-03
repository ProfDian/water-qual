/**
 * ========================================
 * SETUP SENSORS - Create 8 Sensor Documents
 * ========================================
 * Run this ONCE to create sensor metadata
 *
 * Usage: node scripts/setupSensors.js
 */

const { db, admin } = require("./config/firebase-config");

const sensors = [
  // INLET SENSORS (4)
  {
    sensor_id: "sensor-ph-inlet-001",
    ipal_id: 1,
    sensor_type: "ph",
    sensor_location: "inlet",
    sensor_description: "Sensor pH inlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },
  {
    sensor_id: "sensor-tds-inlet-002",
    ipal_id: 1,
    sensor_type: "tds",
    sensor_location: "inlet",
    sensor_description: "Sensor TDS inlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },
  {
    sensor_id: "sensor-turb-inlet-003",
    ipal_id: 1,
    sensor_type: "turbidity",
    sensor_location: "inlet",
    sensor_description: "Sensor Turbidity inlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },
  {
    sensor_id: "sensor-temp-inlet-004",
    ipal_id: 1,
    sensor_type: "temperature",
    sensor_location: "inlet",
    sensor_description: "Sensor Temperature inlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },

  // OUTLET SENSORS (4)
  {
    sensor_id: "sensor-ph-outlet-005",
    ipal_id: 1,
    sensor_type: "ph",
    sensor_location: "outlet",
    sensor_description: "Sensor pH outlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },
  {
    sensor_id: "sensor-tds-outlet-006",
    ipal_id: 1,
    sensor_type: "tds",
    sensor_location: "outlet",
    sensor_description: "Sensor TDS outlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },
  {
    sensor_id: "sensor-turb-outlet-007",
    ipal_id: 1,
    sensor_type: "turbidity",
    sensor_location: "outlet",
    sensor_description: "Sensor Turbidity outlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },
  {
    sensor_id: "sensor-temp-outlet-008",
    ipal_id: 1,
    sensor_type: "temperature",
    sensor_location: "outlet",
    sensor_description:
      "Sensor Temperature outlet IPAL Teknik Lingkungan UNDIP",
    status: "active",
    added_by: "system",
    added_at: admin.firestore.FieldValue.serverTimestamp(),
    last_calibration: admin.firestore.Timestamp.fromDate(
      new Date("2025-11-01T08:00:00Z")
    ),
  },
];

async function setupSensors() {
  try {
    console.log("🔧 Starting sensor setup...\n");

    for (const sensor of sensors) {
      const { sensor_id, ...data } = sensor;

      // Check if sensor already exists
      const existing = await db.collection("sensors").doc(sensor_id).get();

      if (existing.exists) {
        console.log(`⚠️  Sensor ${sensor_id} already exists - SKIPPED`);
        continue;
      }

      // Create sensor document
      await db.collection("sensors").doc(sensor_id).set(data);

      console.log(`✅ Created: ${sensor_id}`);
      console.log(`   Type: ${data.sensor_type}`);
      console.log(`   Location: ${data.sensor_location}`);
      console.log(`   Description: ${data.sensor_description}\n`);
    }

    console.log("========================================");
    console.log("✅ Sensor setup completed!");
    console.log(`📊 Total sensors created: ${sensors.length}`);
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("💥 Error setting up sensors:", error);
    process.exit(1);
  }
}

// Run setup
setupSensors();
