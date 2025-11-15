/**
 * ========================================
 * IPAL CONTROLLER
 * ========================================
 * Read operations for IPAL facilities
 * Support for dynamic IPAL selection
 */

const { admin, db } = require("../config/firebase-config");
const cacheService = require("../services/cacheService");

/**
 * GET ALL IPALS
 * Endpoint: GET /api/ipals
 * Query params:
 *   - status: active|inactive|maintenance (optional)
 *   - limit: number (default: 50)
 */
exports.getAllIpals = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    console.log("📊 Fetching all IPALs");

    // Cache key based on filters
    const cacheKey = `ipals:all:${status || "all"}`;

    const ipals = await cacheService.getCached(
      cacheKey,
      async () => {
        let query = db.collection("ipals").orderBy("ipal_id", "asc");

        // Note: Removed status filter to avoid composite index requirement
        // Filter will be applied in-memory instead
        if (limit) {
          query = query.limit(parseInt(limit));
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
          return [];
        }

        const ipals = [];
        snapshot.forEach((doc) => {
          const data = doc.data();

          // Apply status filter in-memory if provided
          if (status && data.status !== status) {
            return; // Skip this document
          }

          ipals.push({
            id: doc.id, // Firestore document ID
            ipal_id: data.ipal_id, // Your custom numeric ID
            ipal_location: data.ipal_location,
            ipal_description: data.ipal_description,
            address: data.address || null,
            coordinates: data.coordinates || null,
            capacity: data.capacity || null,
            status: data.status || "active",
            contact_person: data.contact_person || null,
            contact_phone: data.contact_phone || null,
            created_at: data.created_at?.toDate
              ? data.created_at.toDate().toISOString()
              : null,
            created_by: data.created_by || null,
          });
        });

        return ipals;
      },
      600 // Cache for 10 minutes
    );

    console.log(`✅ Found ${ipals.length} IPALs`);

    return res.status(200).json({
      success: true,
      count: ipals.length,
      data: ipals,
    });
  } catch (error) {
    console.error("💥 Error fetching IPALs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch IPALs",
      error: error.message,
    });
  }
};

/**
 * GET IPAL BY ID
 * Endpoint: GET /api/ipals/:ipal_id
 * Returns IPAL info + sensor count + latest reading
 */
exports.getIpalById = async (req, res) => {
  try {
    const { ipal_id } = req.params;

    console.log(`🔍 Fetching IPAL: ${ipal_id}`);

    const cacheKey = `ipal:${ipal_id}`;

    const result = await cacheService.getCached(
      cacheKey,
      async () => {
        // Query by ipal_id field (not document ID)
        const snapshot = await db
          .collection("ipals")
          .where("ipal_id", "==", parseInt(ipal_id))
          .limit(1)
          .get();

        if (snapshot.empty) {
          return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // Get sensor count for this IPAL
        const sensorSnapshot = await db
          .collection("sensors")
          .where("ipal_id", "==", parseInt(ipal_id))
          .where("status", "==", "active")
          .count()
          .get();

        const sensorCount = sensorSnapshot.data().count;

        // Get latest reading for this IPAL
        const readingSnapshot = await db
          .collection("water_quality_readings")
          .where("ipal_id", "==", parseInt(ipal_id))
          .orderBy("timestamp", "desc")
          .limit(1)
          .get();

        let latestReading = null;
        if (!readingSnapshot.empty) {
          const readingData = readingSnapshot.docs[0].data();
          latestReading = {
            timestamp: readingData.timestamp?.toDate
              ? readingData.timestamp.toDate().toISOString()
              : null,
            quality_score: readingData.fuzzy_analysis?.quality_score || null,
            status: readingData.fuzzy_analysis?.status || null,
          };
        }

        return {
          id: doc.id,
          ipal_id: data.ipal_id,
          ipal_location: data.ipal_location,
          ipal_description: data.ipal_description,
          address: data.address || null,
          coordinates: data.coordinates || null,
          capacity: data.capacity || null,
          status: data.status || "active",
          contact_person: data.contact_person || null,
          contact_phone: data.contact_phone || null,
          created_at: data.created_at?.toDate
            ? data.created_at.toDate().toISOString()
            : null,
          created_by: data.created_by || null,
          // Additional computed fields
          sensor_count: sensorCount,
          latest_reading: latestReading,
        };
      },
      300 // Cache for 5 minutes
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `IPAL with ID ${ipal_id} not found`,
      });
    }

    console.log(
      `✅ IPAL found: ${ipal_id} with ${result.sensor_count} sensors`
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("💥 Error fetching IPAL:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch IPAL",
      error: error.message,
    });
  }
};

/**
 * GET IPAL STATISTICS
 * Endpoint: GET /api/ipals/:ipal_id/stats
 * Returns comprehensive statistics for specific IPAL
 */
exports.getIpalStats = async (req, res) => {
  try {
    const { ipal_id } = req.params;

    console.log(`📊 Fetching statistics for IPAL: ${ipal_id}`);

    const cacheKey = `ipal:${ipal_id}:stats`;

    const stats = await cacheService.getCached(
      cacheKey,
      async () => {
        const [
          totalSensors,
          activeSensors,
          inactiveSensors,
          activeAlerts,
          criticalAlerts,
          totalReadings,
          readingsToday,
        ] = await Promise.all([
          // Total sensors
          db
            .collection("sensors")
            .where("ipal_id", "==", parseInt(ipal_id))
            .count()
            .get()
            .then((snapshot) => snapshot.data().count),

          // Active sensors
          db
            .collection("sensors")
            .where("ipal_id", "==", parseInt(ipal_id))
            .where("status", "==", "active")
            .count()
            .get()
            .then((snapshot) => snapshot.data().count),

          // Inactive sensors
          db
            .collection("sensors")
            .where("ipal_id", "==", parseInt(ipal_id))
            .where("status", "==", "inactive")
            .count()
            .get()
            .then((snapshot) => snapshot.data().count),

          // Active alerts
          db
            .collection("alerts")
            .where("ipal_id", "==", parseInt(ipal_id))
            .where("status", "==", "active")
            .count()
            .get()
            .then((snapshot) => snapshot.data().count),

          // Critical alerts
          db
            .collection("alerts")
            .where("ipal_id", "==", parseInt(ipal_id))
            .where("status", "==", "active")
            .where("severity", "==", "critical")
            .count()
            .get()
            .then((snapshot) => snapshot.data().count),

          // Total readings
          db
            .collection("water_quality_readings")
            .where("ipal_id", "==", parseInt(ipal_id))
            .count()
            .get()
            .then((snapshot) => snapshot.data().count),

          // Readings today
          (async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const snapshot = await db
              .collection("water_quality_readings")
              .where("ipal_id", "==", parseInt(ipal_id))
              .where(
                "timestamp",
                ">=",
                admin.firestore.Timestamp.fromDate(today)
              )
              .count()
              .get();
            return snapshot.data().count;
          })(),
        ]);

        return {
          ipal_id: parseInt(ipal_id),
          sensors: {
            total: totalSensors,
            active: activeSensors,
            inactive: inactiveSensors,
          },
          alerts: {
            active: activeAlerts,
            critical: criticalAlerts,
          },
          readings: {
            total: totalReadings,
            today: readingsToday,
          },
        };
      },
      180 // Cache for 3 minutes (stats change more frequently)
    );

    console.log(`✅ Statistics fetched for IPAL ${ipal_id}`);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("💥 Error fetching IPAL stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch IPAL statistics",
      error: error.message,
    });
  }
};

console.log("📦 ipalController loaded");
