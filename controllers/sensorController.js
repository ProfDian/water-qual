/**
 * ========================================
 * SENSOR CONTROLLER (EXTENDED)
 * ========================================
 * Complete CRUD operations for sensor management
 * Melengkapi sensorController.js yang sudah ada
 */

const { admin, db } = require("../config/firebase-config");
const { invalidateCache } = require("../middleware/cacheMiddleware");

// ========================================
// EXISTING FUNCTIONS (keep these)
// ========================================

/**
 * GET - Ambil data readings (EXISTING)
 */
exports.getReadings = async (req, res) => {
  try {
    const {
      ipal_id,
      limit = 50,
      order = "desc",
      start_date,
      end_date,
    } = req.query;

    console.log("📊 getReadings called with:", {
      ipal_id,
      limit,
      order,
      start_date,
      end_date,
    });

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

    // ✅ Use order parameter from query string (asc or desc)
    const sortOrder = order.toLowerCase() === "asc" ? "asc" : "desc";
    query = query.orderBy("timestamp", sortOrder).limit(parseInt(limit));

    console.log(`   Sorting by timestamp: ${sortOrder}`);

    const snapshot = await query.get();

    const readings = [];
    snapshot.forEach((doc) => {
      readings.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString(),
      });
    });

    console.log(
      `✅ Returning ${readings.length} readings (${sortOrder} order)`
    );

    return res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error("💥 Error fetching readings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch readings",
      error: error.message,
    });
  }
};

/**
 * GET - Latest reading (EXISTING)
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
        message: `No readings found for IPAL ${ipal_id}`,
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
    console.error("💥 Error fetching latest reading:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest reading",
      error: error.message,
    });
  }
};

// ========================================
// NEW FUNCTIONS - SENSOR MANAGEMENT
// ========================================

/**
 * GET ALL SENSORS dengan filters
 * Endpoint: GET /api/sensors?ipal_id=1&sensor_type=ph&status=active
 */
exports.getAllSensors = async (req, res) => {
  try {
    const { ipal_id, sensor_type, status, limit = 50 } = req.query;

    console.log("📊 Fetching sensors with filters:", {
      ipal_id,
      sensor_type,
      status,
    });

    let query = db.collection("sensors");

    // Filters
    if (ipal_id) {
      query = query.where("ipal_id", "==", parseInt(ipal_id));
    }

    if (sensor_type) {
      query = query.where("sensor_type", "==", sensor_type);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    // Order and limit
    query = query.orderBy("added_at", "desc").limit(parseInt(limit));

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        message: "No sensors found",
        count: 0,
        data: [],
      });
    }

    const sensors = [];
    snapshot.forEach((doc) => {
      sensors.push({
        id: doc.id,
        ...doc.data(),
        added_at: doc.data().added_at?.toDate
          ? doc.data().added_at.toDate().toISOString()
          : null,
      });
    });

    console.log(`✅ Found ${sensors.length} sensors`);

    return res.status(200).json({
      success: true,
      count: sensors.length,
      data: sensors,
    });
  } catch (error) {
    console.error("💥 Error fetching sensors:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sensors",
      error: error.message,
    });
  }
};

/**
 * GET SENSOR BY ID
 * Endpoint: GET /api/sensors/:id
 */
exports.getSensorById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Fetching sensor: ${id}`);

    const doc = await db.collection("sensors").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    const sensor = {
      id: doc.id,
      ...doc.data(),
      added_at: doc.data().added_at?.toDate
        ? doc.data().added_at.toDate().toISOString()
        : null,
    };

    console.log(`✅ Sensor found: ${id}`);

    return res.status(200).json({
      success: true,
      data: sensor,
    });
  } catch (error) {
    console.error("💥 Error fetching sensor:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sensor",
      error: error.message,
    });
  }
};

/**
 * UPDATE SENSOR
 * Endpoint: PUT /api/sensors/:id
 */
exports.updateSensor = async (req, res) => {
  try {
    const { id } = req.params;
    const { sensor_type, sensor_location, sensor_description, status } =
      req.body;
    const user = req.user;

    console.log(`✏️ Updating sensor: ${id} by ${user.email}`);

    // Cek sensor exists
    const sensorRef = db.collection("sensors").doc(id);
    const sensorDoc = await sensorRef.get();

    if (!sensorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    // Prepare update data (hanya field yang dikirim)
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_by: user.email,
    };

    if (sensor_type) updateData.sensor_type = sensor_type;
    if (sensor_location) updateData.sensor_location = sensor_location;
    if (sensor_description !== undefined)
      updateData.sensor_description = sensor_description;
    if (status) updateData.status = status;

    // Update sensor
    await sensorRef.update(updateData);

    // ♻️ Invalidate related caches
    invalidateCache(["/api/sensors", `/api/sensors/${id}`, "/api/dashboard"]);

    console.log(`✅ Sensor updated: ${id}`);

    // Get updated sensor
    const updatedDoc = await sensorRef.get();
    const updatedSensor = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      added_at: updatedDoc.data().added_at?.toDate
        ? updatedDoc.data().added_at.toDate().toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      message: "Sensor updated successfully",
      data: updatedSensor,
    });
  } catch (error) {
    console.error("💥 Error updating sensor:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update sensor",
      error: error.message,
    });
  }
};

/**
 * GET SENSOR STATUS (online/offline)
 * Endpoint: GET /api/sensors/:id/status
 *
 * Logic: Sensor dianggap online jika ada reading dalam 10 menit terakhir
 */
exports.getSensorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Checking sensor status: ${id}`);

    // Get sensor
    const sensorDoc = await db.collection("sensors").doc(id).get();

    if (!sensorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    const sensorData = sensorDoc.data();

    // Get latest reading untuk IPAL ini
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const tenMinutesAgoTimestamp =
      admin.firestore.Timestamp.fromDate(tenMinutesAgo);

    const recentReadings = await db
      .collection("water_quality_readings")
      .where("ipal_id", "==", sensorData.ipal_id)
      .where("timestamp", ">=", tenMinutesAgoTimestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    const isOnline = !recentReadings.empty;

    let lastReading = null;
    if (!recentReadings.empty) {
      const doc = recentReadings.docs[0];
      lastReading = {
        timestamp: doc.data().timestamp?.toDate().toISOString(),
        data: doc.data(),
      };
    }

    console.log(`✅ Sensor status: ${isOnline ? "online" : "offline"}`);

    return res.status(200).json({
      success: true,
      data: {
        sensor_id: id,
        ipal_id: sensorData.ipal_id,
        sensor_type: sensorData.sensor_type,
        status: isOnline ? "online" : "offline",
        last_reading: lastReading,
      },
    });
  } catch (error) {
    console.error("💥 Error checking sensor status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check sensor status",
      error: error.message,
    });
  }
};

/**
 * GET SENSORS BY IPAL
 * Endpoint: GET /api/sensors/ipal/:ipal_id
 */
exports.getSensorsByIpal = async (req, res) => {
  try {
    const { ipal_id } = req.params;

    console.log(`📊 Fetching sensors for IPAL: ${ipal_id}`);

    const snapshot = await db
      .collection("sensors")
      .where("ipal_id", "==", parseInt(ipal_id))
      .orderBy("added_at", "desc")
      .get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        message: `No sensors found for IPAL ${ipal_id}`,
        count: 0,
        data: [],
      });
    }

    const sensors = [];
    snapshot.forEach((doc) => {
      sensors.push({
        id: doc.id,
        ...doc.data(),
        added_at: doc.data().added_at?.toDate
          ? doc.data().added_at.toDate().toISOString()
          : null,
      });
    });

    console.log(`✅ Found ${sensors.length} sensors for IPAL ${ipal_id}`);

    return res.status(200).json({
      success: true,
      count: sensors.length,
      data: sensors,
    });
  } catch (error) {
    console.error("💥 Error fetching sensors by IPAL:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sensors",
      error: error.message,
    });
  }
};

/**
 * GET LATEST READING BY SENSOR ID
 * Endpoint: GET /api/sensors/:id/latest
 *
 * Query water_quality_readings untuk cari latest reading dari sensor ini
 */
exports.getLatestReadingBySensor = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Fetching latest reading for sensor: ${id}`);

    // 1. Get sensor metadata
    const sensorDoc = await db.collection("sensors").doc(id).get();

    if (!sensorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    const sensorData = sensorDoc.data();

    // 2. Find latest reading for this sensor
    // Check all possible sensor_mapping fields
    const mappingFields = [
      "sensor_mapping.inlet_ph",
      "sensor_mapping.inlet_tds",
      "sensor_mapping.inlet_turbidity",
      "sensor_mapping.inlet_temperature",
      "sensor_mapping.outlet_ph",
      "sensor_mapping.outlet_tds",
      "sensor_mapping.outlet_turbidity",
      "sensor_mapping.outlet_temperature",
    ];

    let latestReading = null;
    let readingDoc = null;

    // Try each mapping field
    for (const field of mappingFields) {
      try {
        const snapshot = await db
          .collection("water_quality_readings")
          .where(field, "==", id)
          .orderBy("timestamp", "desc")
          .limit(1)
          .get();

        if (!snapshot.empty) {
          readingDoc = snapshot.docs[0];
          latestReading = readingDoc.data();
          break;
        }
      } catch (queryError) {
        // Index might not exist yet, continue to next field
        continue;
      }
    }

    // 3. Extract specific value for this sensor
    let sensorValue = null;
    let timestamp = null;

    if (latestReading) {
      timestamp = latestReading.timestamp?.toDate
        ? latestReading.timestamp.toDate().toISOString()
        : null;

      // Determine which field to extract based on sensor type & location
      const location = sensorData.sensor_location; // inlet or outlet
      const type = sensorData.sensor_type; // ph, tds, turbidity, temperature

      if (latestReading[location]) {
        sensorValue = latestReading[location][type];
      }
    }

    console.log(`✅ Latest reading found for sensor ${id}`);

    return res.status(200).json({
      success: true,
      sensor: {
        id: sensorDoc.id,
        sensor_id: sensorData.sensor_id,
        sensor_type: sensorData.sensor_type,
        sensor_location: sensorData.sensor_location,
        sensor_description: sensorData.sensor_description,
        status: sensorData.status,
        last_calibration: sensorData.last_calibration?.toDate
          ? sensorData.last_calibration.toDate().toISOString()
          : null,
      },
      latest_reading: latestReading
        ? {
            value: sensorValue,
            timestamp: timestamp,
            reading_id: readingDoc.id,
            full_reading: latestReading, // Include full reading for context
          }
        : null,
    });
  } catch (error) {
    console.error("💥 Error fetching latest reading:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest reading",
      error: error.message,
    });
  }
};

/**
 * GET SENSOR HISTORY
 * Endpoint: GET /api/sensors/:id/history?limit=100&start_date=...&end_date=...
 *
 * Get historical data untuk sensor tertentu
 */
exports.getSensorHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, start_date, end_date } = req.query;

    console.log(`📊 Fetching history for sensor: ${id}`);

    // 1. Get sensor metadata
    const sensorDoc = await db.collection("sensors").doc(id).get();

    if (!sensorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    const sensorData = sensorDoc.data();
    const location = sensorData.sensor_location;
    const type = sensorData.sensor_type;
    const mappingField = `sensor_mapping.${location}_${type}`;

    console.log(`   Mapping field: ${mappingField}`);

    // 2. ✅ BUILD QUERY - Pakai orderBy dulu
    let query = db
      .collection("water_quality_readings")
      .orderBy(mappingField, "asc") // ✅ Order by mapping field first
      .orderBy("timestamp", "desc"); // ✅ Then by timestamp

    // Apply limit
    query = query.limit(parseInt(limit));

    // 3. Execute query
    const snapshot = await query.get();

    // 4. ✅ FILTER di JavaScript (bukan di query)
    let readings = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Filter by sensor ID
      if (data.sensor_mapping?.[`${location}_${type}`] !== id) {
        return; // Skip this reading
      }

      // Filter by date range
      const timestamp = data.timestamp?.toDate();
      if (timestamp) {
        if (start_date && timestamp < new Date(start_date)) {
          return;
        }
        if (end_date && timestamp > new Date(end_date + "T23:59:59Z")) {
          return;
        }
      }

      // Extract value
      const value = data[location]?.[type];

      readings.push({
        reading_id: doc.id,
        value: value,
        timestamp: timestamp ? timestamp.toISOString() : null,
      });
    });

    console.log(`✅ Found ${readings.length} historical readings`);

    return res.status(200).json({
      success: true,
      sensor: {
        id: sensorDoc.id,
        sensor_type: sensorData.sensor_type,
        sensor_location: sensorData.sensor_location,
        sensor_description: sensorData.sensor_description,
        status: sensorData.status,
      },
      count: readings.length,
      history: readings,
    });
  } catch (error) {
    console.error("💥 Error fetching sensor history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sensor history",
      error: error.message,
    });
  }
};

console.log("📦 sensorController (extended) loaded");
