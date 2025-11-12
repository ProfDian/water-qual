/**
 * ========================================
 * OPTIMIZED SENSOR CONTROLLER
 * ========================================
 * Reduced Firestore reads by:
 * 1. Using cache layer
 * 2. Single query instead of looping
 * 3. Proper limits on all queries
 */

const { admin, db } = require("../config/firebase-config");
const cacheService = require("../services/cacheService");

/**
 * GET LATEST READING BY SENSOR ID (OPTIMIZED)
 * ✅ BEFORE: 8-64 queries (trying each mapping field)
 * ✅ AFTER: 1 query (use sensor metadata to know exact field)
 */
exports.getLatestReadingBySensor = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Fetching latest reading for sensor: ${id}`);

    // Try cache first (5 min TTL)
    const cacheKey = cacheService.KEYS.LATEST_READING(id);
    
    const result = await cacheService.getCached(cacheKey, async () => {
      // 1. Get sensor metadata (CACHED separately)
      const sensorCacheKey = cacheService.KEYS.SENSOR(id);
      
      const sensorDoc = await cacheService.getCached(
        sensorCacheKey,
        async () => {
          const doc = await db.collection("sensors").doc(id).get();
          if (!doc.exists) return null;
          return { id: doc.id, ...doc.data() };
        },
        600 // 10 min TTL for sensor metadata
      );

      if (!sensorDoc) {
        return null;
      }

      const sensorData = sensorDoc;

      // 2. ✅ OPTIMIZATION: Build EXACT mapping field from sensor metadata
      const location = sensorData.sensor_location; // inlet or outlet
      const type = sensorData.sensor_type; // ph, tds, turbidity, temperature
      const mappingField = `sensor_mapping.${location}_${type}`;

      console.log(`   📌 Using mapping field: ${mappingField}`);

      // 3. Single query instead of loop!
      const snapshot = await db
        .collection("water_quality_readings")
        .where(mappingField, "==", id)
        .orderBy("timestamp", "desc")
        .limit(1) // Only need latest
        .get();

      if (snapshot.empty) {
        return {
          sensor: sensorData,
          latest_reading: null,
        };
      }

      // 4. Extract data
      const readingDoc = snapshot.docs[0];
      const latestReading = readingDoc.data();

      const timestamp = latestReading.timestamp?.toDate
        ? latestReading.timestamp.toDate().toISOString()
        : null;

      const sensorValue = latestReading[location]?.[type] || null;

      return {
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
        latest_reading: {
          value: sensorValue,
          timestamp: timestamp,
          reading_id: readingDoc.id,
          full_reading: latestReading,
        },
      };
    }, 300); // Cache for 5 minutes

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    console.log(`✅ Latest reading found for sensor ${id}`);

    return res.status(200).json({
      success: true,
      ...result,
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
 * GET SENSOR HISTORY (OPTIMIZED)
 * ✅ BEFORE: 8-64 queries (trying each mapping field)
 * ✅ AFTER: 1 query (use sensor metadata to know exact field)
 */
exports.getSensorHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, start_date, end_date } = req.query;

    // ✅ SAFETY: Enforce max limit
    const safeLimit = Math.min(parseInt(limit), 500);

    console.log(`📊 Fetching history for sensor: ${id} (limit: ${safeLimit})`);

    // Cache key with limit
    const cacheKey = cacheService.KEYS.SENSOR_HISTORY(id, safeLimit);

    const result = await cacheService.getCached(
      cacheKey,
      async () => {
        // 1. Get sensor metadata (CACHED)
        const sensorCacheKey = cacheService.KEYS.SENSOR(id);
        
        const sensorDoc = await cacheService.getCached(
          sensorCacheKey,
          async () => {
            const doc = await db.collection("sensors").doc(id).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
          },
          600 // 10 min TTL
        );

        if (!sensorDoc) {
          return null;
        }

        const sensorData = sensorDoc;
        const location = sensorData.sensor_location;
        const type = sensorData.sensor_type;
        const mappingField = `sensor_mapping.${location}_${type}`;

        console.log(`   📌 Using mapping field: ${mappingField}`);

        // 2. ✅ OPTIMIZATION: Single query with proper ordering
        let query = db
          .collection("water_quality_readings")
          .where(mappingField, "==", id)
          .orderBy("timestamp", "desc")
          .limit(safeLimit);

        // Optional date filters (applied in JavaScript to avoid compound index)
        const snapshot = await query.get();

        // 3. Filter and extract data
        let readings = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate();

          // Apply date filters if provided
          if (start_date && timestamp < new Date(start_date)) return;
          if (end_date && timestamp > new Date(end_date + "T23:59:59Z")) return;

          const value = data[location]?.[type];

          readings.push({
            reading_id: doc.id,
            value: value,
            timestamp: timestamp ? timestamp.toISOString() : null,
          });
        });

        return {
          sensor: {
            id: sensorDoc.id,
            sensor_type: sensorData.sensor_type,
            sensor_location: sensorData.sensor_location,
            sensor_description: sensorData.sensor_description,
            status: sensorData.status,
          },
          count: readings.length,
          history: readings,
        };
      },
      180 // Cache for 3 minutes (shorter for history data)
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    console.log(`✅ Found ${result.count} historical readings`);

    return res.status(200).json({
      success: true,
      ...result,
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

/**
 * GET ALL SENSORS (WITH CACHE)
 */
exports.getAllSensors = async (req, res) => {
  try {
    const { ipal_id, sensor_type, status, limit = 50 } = req.query;

    console.log("📊 Fetching sensors with filters:", {
      ipal_id,
      sensor_type,
      status,
    });

    // Cache key based on filters
    const cacheKey = cacheService.KEYS.SENSORS(ipal_id);

    const sensors = await cacheService.getCached(
      cacheKey,
      async () => {
        let query = db.collection("sensors");

        if (ipal_id) {
          query = query.where("ipal_id", "==", parseInt(ipal_id));
        }

        if (sensor_type) {
          query = query.where("sensor_type", "==", sensor_type);
        }

        if (status) {
          query = query.where("status", "==", status);
        }

        query = query.orderBy("added_at", "desc").limit(parseInt(limit));

        const snapshot = await query.get();

        if (snapshot.empty) {
          return [];
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

        return sensors;
      },
      300 // Cache for 5 minutes
    );

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
 * GET SENSOR BY ID (WITH CACHE)
 */
exports.getSensorById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Fetching sensor: ${id}`);

    const cacheKey = cacheService.KEYS.SENSOR(id);

    const sensor = await cacheService.getCached(
      cacheKey,
      async () => {
        const doc = await db.collection("sensors").doc(id).get();

        if (!doc.exists) {
          return null;
        }

        return {
          id: doc.id,
          ...doc.data(),
          added_at: doc.data().added_at?.toDate
            ? doc.data().added_at.toDate().toISOString()
            : null,
        };
      },
      600 // Cache for 10 minutes (metadata rarely changes)
    );

    if (!sensor) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

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
 * UPDATE SENSOR (Invalidate cache after update)
 */
exports.updateSensor = async (req, res) => {
  try {
    const { id } = req.params;
    const { sensor_type, sensor_location, sensor_description, status } =
      req.body;
    const user = req.user;

    console.log(`✏️ Updating sensor: ${id} by ${user.email}`);

    const sensorRef = db.collection("sensors").doc(id);
    const sensorDoc = await sensorRef.get();

    if (!sensorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Sensor with ID ${id} not found`,
      });
    }

    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_by: user.email,
    };

    if (sensor_type) updateData.sensor_type = sensor_type;
    if (sensor_location) updateData.sensor_location = sensor_location;
    if (sensor_description !== undefined)
      updateData.sensor_description = sensor_description;
    if (status) updateData.status = status;

    await sensorRef.update(updateData);

    // ✅ IMPORTANT: Invalidate related caches
    cacheService.invalidate(cacheService.KEYS.SENSOR(id));
    cacheService.invalidate(cacheService.KEYS.LATEST_READING(id));
    cacheService.invalidatePattern(`history:${id}:*`);
    cacheService.invalidatePattern('sensors:*');

    console.log(`✅ Sensor updated: ${id} & cache invalidated`);

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

console.log("📦 Optimized sensorController loaded");
