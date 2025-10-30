const { admin, db } = require("../../config/firebase-config");
const { analyzeFuzzy } = require("../../utils/fuzzyLogicHelper");

/**
 * Firestore Trigger: onCreate water_quality_readings
 *
 * Otomatis dijalankan setiap ada data baru di collection water_quality_readings
 * Akan menjalankan fuzzy logic dan membuat alert jika perlu
 */
async function onNewWaterQualityReading(snapshot, context) {
  try {
    const readingId = context.params.readingId;
    const data = snapshot.data();

    console.log("🔔 New reading detected:", readingId);
    console.log("📊 Data:", {
      ipal_id: data.ipal_id,
      device_id: data.device_id,
      timestamp: data.timestamp?.toDate().toISOString(),
    });

    // 1. Jalankan Fuzzy Logic Analysis
    console.log("🧠 Running fuzzy logic analysis...");

    const fuzzyResult = analyzeFuzzy(data.inlet, data.outlet);

    console.log(`✅ Analysis complete: ${fuzzyResult.alertCount} alerts found`);
    console.log(`📊 Quality Score: ${fuzzyResult.qualityScore}/100`);
    console.log(`🎯 Status: ${fuzzyResult.status}`);

    // 2. Simpan hasil analisis ke reading document
    await snapshot.ref.update({
      fuzzy_analysis: {
        quality_score: fuzzyResult.qualityScore,
        status: fuzzyResult.status,
        alert_count: fuzzyResult.alertCount,
        analyzed_at: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    console.log("✅ Fuzzy analysis result saved to reading document");

    // 3. Jika ada alert, simpan ke collection alerts
    if (fuzzyResult.hasAlert) {
      console.log(`⚠️  Creating ${fuzzyResult.alertCount} alert(s)...`);

      const alertPromises = fuzzyResult.alerts.map(async (alert) => {
        const alertData = {
          ipal_id: data.ipal_id,
          reading_id: readingId,
          parameter: alert.parameter,
          location: alert.location,
          rule: alert.rule,
          message: alert.message,
          severity: alert.severity,
          inlet_value: alert.inlet_value,
          outlet_value: alert.outlet_value,
          difference: alert.difference || null,
          reduction: alert.reduction || null,
          threshold: alert.threshold || null,
          status: "active",
          timestamp:
            data.timestamp || admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Simpan ke collection alerts
        const alertRef = await db.collection("alerts").add(alertData);

        console.log(`✅ Alert created: ${alertRef.id} - ${alert.rule}`);

        return alertRef.id;
      });

      await Promise.all(alertPromises);

      console.log(
        `✅ All ${fuzzyResult.alertCount} alert(s) saved successfully`
      );
    } else {
      console.log("✅ No alerts triggered - Water quality is good");
    }

    return {
      success: true,
      readingId,
      alertCount: fuzzyResult.alertCount,
      qualityScore: fuzzyResult.qualityScore,
    };
  } catch (error) {
    console.error("💥 Error in readingTrigger:", error);

    // Log error tapi jangan throw agar tidak retry terus-menerus
    await db.collection("trigger_errors").add({
      trigger: "onNewWaterQualityReading",
      reading_id: context.params.readingId,
      error_message: error.message,
      error_stack: error.stack,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  onNewWaterQualityReading,
};

console.log("📦 readingTrigger loaded");
