// SEBELUM (SALAH):
// const admin = require('firebase-admin');
// const db = admin.firestore();

// SESUDAH (BENAR):
const { admin, db } = require("../config/firebase-config");
const { validateReadingData } = require("../services/validationService");

/**
 * CREATE - Terima data dari ESP32
 * POST /api/sensors/readings
 */
exports.createReading = async (req, res) => {
  try {
    console.log("📥 Received data from device:", req.body);

    // 1. VALIDASI DATA
    const { error, value } = validateReadingData(req.body);

    if (error) {
      console.error("❌ Validation failed:", error.details);
      return res.status(400).json({
        success: false,
        message: "Data validation failed",
        errors: error.details.map((d) => ({
          field: d.path.join("."),
          message: d.message,
        })),
      });
    }

    const { ipal_id, device_id, inlet, outlet } = value;

    // 2. CEK IPAL ID VALID
    const ipalSnapshot = await db
      .collection("ipals")
      .where("ipal_id", "==", ipal_id)
      .limit(1)
      .get();

    if (ipalSnapshot.empty) {
      console.error(`❌ IPAL ID ${ipal_id} not found`);
      return res.status(404).json({
        success: false,
        message: `IPAL with ID ${ipal_id} not found`,
      });
    }

    // 3. SIAPKAN DATA
    const readingData = {
      ipal_id,
      device_id: device_id || "unknown",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      inlet: {
        ph: parseFloat(inlet.ph.toFixed(2)),
        tds: parseFloat(inlet.tds.toFixed(2)),
        turbidity: parseFloat(inlet.turbidity.toFixed(2)),
        temperature: parseFloat(inlet.temperature.toFixed(2)),
      },
      outlet: {
        ph: parseFloat(outlet.ph.toFixed(2)),
        tds: parseFloat(outlet.tds.toFixed(2)),
        turbidity: parseFloat(outlet.turbidity.toFixed(2)),
        temperature: parseFloat(outlet.temperature.toFixed(2)),
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. SIMPAN KE FIRESTORE
    const docRef = await db
      .collection("water_quality_readings")
      .add(readingData);

    console.log("✅ Data saved with ID:", docRef.id);

    // 5. RESPONSE SUCCESS
    return res.status(201).json({
      success: true,
      message: "Data received and saved successfully",
      data: {
        reading_id: docRef.id,
        ipal_id,
        device_id: device_id || "unknown",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("💥 Error in createReading:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * READ - Get readings
 */
exports.getReadings = async (req, res) => {
  try {
    const { ipal_id, limit = 50, start_date, end_date } = req.query;

    let query = db.collection("water_quality_readings");

    if (ipal_id) {
      query = query.where("ipal_id", "==", parseInt(ipal_id));
    }

    if (start_date) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(start_date)
      );
      query = query.where("timestamp", ">=", startTimestamp);
    }

    if (end_date) {
      const endTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(end_date)
      );
      query = query.where("timestamp", "<=", endTimestamp);
    }

    query = query.orderBy("timestamp", "desc").limit(parseInt(limit));

    const snapshot = await query.get();

    const readings = [];
    snapshot.forEach((doc) => {
      readings.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString(),
      });
    });

    return res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error("💥 Error in getReadings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch readings",
      error: error.message,
    });
  }
};

/**
 * READ - Get latest reading
 */
exports.getLatestReading = async (req, res) => {
  try {
    const { ipal_id } = req.params;

    const snapshot = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", parseInt(ipal_id))
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `No readings found for IPAL ID ${ipal_id}`,
      });
    }

    const doc = snapshot.docs[0];
    const reading = {
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: reading,
    });
  } catch (error) {
    console.error("💥 Error in getLatestReading:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest reading",
      error: error.message,
    });
  }
};

// Debug
console.log("📦 sensorController exports:", Object.keys(module.exports));
