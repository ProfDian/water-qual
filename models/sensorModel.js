// models/sensorModel.js
const { admin } = require("../config/firebase-config"); // Firebase Admin SDK

// Fungsi untuk menambahkan sensor baru ke Firestore
const addSensor = async (sensorData) => {
  try {
    const sensorsRef = admin.firestore().collection("sensors");
    const newSensorRef = await sensorsRef.add(sensorData); // Menambahkan data sensor baru
    return newSensorRef.id; // Mengembalikan ID sensor yang baru ditambahkan
  } catch (error) {
    throw new Error("Error adding sensor: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil semua data sensor
const getSensors = async () => {
  try {
    const sensorsRef = admin.firestore().collection("sensors");
    const snapshot = await sensorsRef.get(); // Mengambil semua dokumen dalam koleksi 'sensors'
    const sensors = snapshot.docs.map((doc) => doc.data()); // Mengambil data dari setiap dokumen
    return sensors;
  } catch (error) {
    throw new Error("Error fetching sensors: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil sensor berdasarkan ID
const getSensorById = async (sensorId) => {
  try {
    const sensorRef = admin.firestore().collection("sensors").doc(sensorId); // Mengakses dokumen berdasarkan ID
    const doc = await sensorRef.get();
    if (!doc.exists) {
      throw new Error("Sensor not found"); // Menangani jika sensor tidak ditemukan
    }
    return doc.data(); // Mengembalikan data sensor
  } catch (error) {
    throw new Error("Error fetching sensor: " + error.message); // Menangani error
  }
};

/**
 * ========================================
 * UPDATE SENSOR LATEST READING
 * ========================================
 * Update sensor dengan latest reading data
 * Dipanggil setiap kali ada reading baru dari water_quality_readings
 */

/**
 * Update single sensor dengan latest reading
 * @param {string} sensorId - ID sensor (e.g., "sensor-ph-inlet-001")
 * @param {Object} readingData - Data reading terbaru
 * @param {number} readingData.value - Nilai sensor
 * @param {Date|FirebaseFirestore.Timestamp} readingData.timestamp - Timestamp reading
 * @param {string} readingData.reading_id - Reference ke water_quality_readings
 * @param {string} readingData.status - Status kualitas (normal/warning/critical)
 * @returns {Promise<void>}
 */
const updateSensorLatestReading = async (sensorId, readingData) => {
  try {
    const { value, timestamp, reading_id, status } = readingData;

    // Validate input
    if (!sensorId) {
      throw new Error("Sensor ID is required");
    }
    if (value === null || value === undefined) {
      throw new Error("Reading value is required");
    }

    const sensorRef = admin.firestore().collection("sensors").doc(sensorId);

    // Check if sensor exists
    const sensorDoc = await sensorRef.get();
    if (!sensorDoc.exists) {
      console.warn(`⚠️  Sensor ${sensorId} not found, skipping update`);
      return; // Skip silently, sensor mungkin belum terdaftar
    }

    // Prepare update data
    const updateTimestamp = timestamp || admin.firestore.Timestamp.now();

    const updateData = {
      latest_reading: {
        value: value,
        timestamp: updateTimestamp,
        reading_id: reading_id || null,
        status: status || "normal",
      },
      last_updated_at: updateTimestamp,
      updated_at: updateTimestamp,
    };

    // Increment readings count (optional statistics)
    updateData.readings_count = admin.firestore.FieldValue.increment(1);

    await sensorRef.update(updateData);

    console.log(`✅ Sensor ${sensorId} updated with latest reading`);
  } catch (error) {
    console.error(`❌ Error updating sensor ${sensorId}:`, error.message);
    // Don't throw - continue processing other sensors
  }
};

/**
 * Batch update multiple sensors dengan latest readings
 * More efficient untuk update banyak sensors sekaligus
 * @param {Array<Object>} sensorsData - Array of sensor update data
 * @param {string} sensorsData[].sensorId - Sensor ID
 * @param {Object} sensorsData[].readingData - Reading data (value, timestamp, etc)
 * @returns {Promise<Object>} Result summary
 */
const batchUpdateSensorsReading = async (sensorsData) => {
  try {
    if (!sensorsData || sensorsData.length === 0) {
      console.log("ℹ️  No sensors to update");
      return { success: 0, failed: 0, skipped: 0 };
    }

    console.log(`📦 Batch updating ${sensorsData.length} sensor(s)...`);

    const db = admin.firestore();
    const batch = db.batch();
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Process each sensor
    for (const { sensorId, readingData } of sensorsData) {
      try {
        if (!sensorId || !readingData) {
          skippedCount++;
          continue;
        }

        const { value, timestamp, reading_id, status } = readingData;

        if (value === null || value === undefined) {
          skippedCount++;
          continue;
        }

        const sensorRef = db.collection("sensors").doc(sensorId);

        // Check if sensor exists (optional - untuk efisiensi bisa skip check)
        const sensorDoc = await sensorRef.get();
        if (!sensorDoc.exists) {
          console.warn(`⚠️  Sensor ${sensorId} not found, skipping`);
          skippedCount++;
          continue;
        }

        // Prepare timestamp - use provided timestamp or create new one
        const updateTimestamp = timestamp || admin.firestore.Timestamp.now();

        // Add to batch
        batch.update(sensorRef, {
          latest_reading: {
            value: value,
            timestamp: updateTimestamp,
            reading_id: reading_id || null,
            status: status || "normal",
          },
          last_updated_at: updateTimestamp,
          updated_at: updateTimestamp,
          readings_count: admin.firestore.FieldValue.increment(1),
        });

        successCount++;
      } catch (error) {
        console.error(
          `❌ Error preparing update for ${sensorId}:`,
          error.message
        );
        failedCount++;
      }
    }

    // Commit batch
    if (successCount > 0) {
      await batch.commit();
      console.log(`✅ Batch update successful: ${successCount} sensor(s)`);
    }

    const result = {
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      total: sensorsData.length,
    };

    if (failedCount > 0 || skippedCount > 0) {
      console.warn(`⚠️  Batch update summary:`, result);
    }

    return result;
  } catch (error) {
    console.error("❌ Error in batch update sensors:", error);
    throw new Error("Batch update failed: " + error.message);
  }
};

module.exports = {
  addSensor,
  getSensors,
  getSensorById,
  updateSensorLatestReading,
  batchUpdateSensorsReading,
};
