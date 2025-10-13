const { admin, db } = require("../config/firebase-config");

/**
 * GET - Ambil semua alerts
 * GET /api/alerts
 */
exports.getAlerts = async (req, res) => {
  try {
    const { ipal_id, status, limit = 50 } = req.query;

    let query = db.collection("alerts");

    if (ipal_id) {
      query = query.where("ipal_id", "==", parseInt(ipal_id));
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.orderBy("timestamp", "desc").limit(parseInt(limit));

    const snapshot = await query.get();

    const alerts = [];
    snapshot.forEach((doc) => {
      alerts.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString(),
      });
    });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("💥 Error in getAlerts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
      error: error.message,
    });
  }
};

/**
 * GET - Ambil active alerts
 * GET /api/alerts/active
 */
exports.getActiveAlerts = async (req, res) => {
  try {
    const snapshot = await db
      .collection("alerts")
      .where("status", "==", "active")
      .orderBy("timestamp", "desc")
      .get();

    const alerts = [];
    snapshot.forEach((doc) => {
      alerts.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString(),
      });
    });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("💥 Error in getActiveAlerts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active alerts",
      error: error.message,
    });
  }
};

/**
 * PUT - Acknowledge alert
 * PUT /api/alerts/:id/acknowledge
 */
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alertRef = db.collection("alerts").doc(id);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    await alertRef.update({
      status: "acknowledged",
      acknowledged_at: admin.firestore.FieldValue.serverTimestamp(),
      acknowledged_by: req.user.uid,
    });

    return res.status(200).json({
      success: true,
      message: "Alert acknowledged successfully",
    });
  } catch (error) {
    console.error("💥 Error in acknowledgeAlert:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to acknowledge alert",
      error: error.message,
    });
  }
};

/**
 * PUT - Resolve alert
 * PUT /api/alerts/:id/resolve
 */
exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alertRef = db.collection("alerts").doc(id);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    await alertRef.update({
      status: "resolved",
      resolved_at: admin.firestore.FieldValue.serverTimestamp(),
      resolved_by: req.user.uid,
    });

    return res.status(200).json({
      success: true,
      message: "Alert resolved successfully",
    });
  } catch (error) {
    console.error("💥 Error in resolveAlert:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve alert",
      error: error.message,
    });
  }
};

// Debug
console.log("📦 alertController exports:", Object.keys(module.exports));
