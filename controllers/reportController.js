/**
 * ========================================
 * REPORT CONTROLLER
 * ========================================
 * Controller untuk export data sensor & alerts
 * Supports CSV and Excel formats
 */

const { db, admin } = require("../config/firebase-config");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

/**
 * ========================================
 * HELPER: Query Water Quality Readings
 * ========================================
 */
async function getWaterQualityData(filters) {
  const { ipal_id, start_date, end_date, parameter } = filters;

  let query = db.collection("water_quality_readings");

  // Filter by IPAL ID
  if (ipal_id) {
    query = query.where("ipal_id", "==", parseInt(ipal_id));
  }

  // Filter by date range
  if (start_date) {
    const startTimestamp = admin.firestore.Timestamp.fromDate(
      new Date(start_date)
    );
    query = query.where("timestamp", ">=", startTimestamp);
  }

  if (end_date) {
    const endTimestamp = admin.firestore.Timestamp.fromDate(
      new Date(end_date + "T23:59:59Z")
    );
    query = query.where("timestamp", "<=", endTimestamp);
  }

  // Order by timestamp
  query = query.orderBy("timestamp", "desc");

  // Execute query
  const snapshot = await query.get();

  if (snapshot.empty) {
    return [];
  }

  // Transform data
  const data = [];
  snapshot.forEach((doc) => {
    const docData = doc.data();

    // Base row
    const baseRow = {
      id: doc.id,
      ipal_id: docData.ipal_id,
      device_id: docData.device_id || "unknown",
      timestamp: docData.timestamp?.toDate
        ? docData.timestamp.toDate().toISOString()
        : null,
    };

    // Include all parameters or specific one
    if (!parameter || parameter === "all") {
      data.push({
        ...baseRow,
        inlet_ph: docData.inlet?.ph,
        inlet_tds: docData.inlet?.tds,
        inlet_turbidity: docData.inlet?.turbidity,
        inlet_temperature: docData.inlet?.temperature,
        outlet_ph: docData.outlet?.ph,
        outlet_tds: docData.outlet?.tds,
        outlet_turbidity: docData.outlet?.turbidity,
        outlet_temperature: docData.outlet?.temperature,
      });
    } else {
      // Specific parameter only
      data.push({
        ...baseRow,
        [`inlet_${parameter}`]: docData.inlet?.[parameter],
        [`outlet_${parameter}`]: docData.outlet?.[parameter],
      });
    }
  });

  return data;
}

/**
 * ========================================
 * HELPER: Query Alerts Data
 * ========================================
 */
async function getAlertsData(filters) {
  const { ipal_id, start_date, end_date, severity } = filters;

  let query = db.collection("alerts");

  // Filter by IPAL ID
  if (ipal_id) {
    query = query.where("ipal_id", "==", parseInt(ipal_id));
  }

  // Filter by severity
  if (severity) {
    query = query.where("severity", "==", severity);
  }

  // Filter by date range
  if (start_date) {
    const startTimestamp = admin.firestore.Timestamp.fromDate(
      new Date(start_date)
    );
    query = query.where("timestamp", ">=", startTimestamp);
  }

  if (end_date) {
    const endTimestamp = admin.firestore.Timestamp.fromDate(
      new Date(end_date + "T23:59:59Z")
    );
    query = query.where("timestamp", "<=", endTimestamp);
  }

  // Order by timestamp
  query = query.orderBy("timestamp", "desc");

  // Execute query
  const snapshot = await query.get();

  if (snapshot.empty) {
    return [];
  }

  // Transform data
  const data = [];
  snapshot.forEach((doc) => {
    const docData = doc.data();
    data.push({
      alert_id: doc.id,
      ipal_id: docData.ipal_id,
      parameter: docData.parameter,
      location: docData.location,
      rule: docData.rule,
      severity: docData.severity,
      status: docData.status,
      inlet_value: docData.inlet_value,
      outlet_value: docData.outlet_value,
      threshold_value: docData.threshold_value,
      message: docData.message,
      timestamp: docData.timestamp?.toDate
        ? docData.timestamp.toDate().toISOString()
        : null,
      read: docData.read || false,
    });
  });

  return data;
}

/**
 * ========================================
 * EXPORT DATA TO CSV
 * ========================================
 */
async function generateCSV(data, filename) {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  // Define fields (CSV columns)
  const fields = Object.keys(data[0]);

  // Create parser
  const json2csvParser = new Parser({ fields });

  // Generate CSV
  const csv = json2csvParser.parse(data);

  return {
    data: csv,
    filename: `${filename}.csv`,
    contentType: "text/csv",
  };
}

/**
 * ========================================
 * EXPORT DATA TO EXCEL
 * ========================================
 */
async function generateExcel(data, filename, sheetName = "Data") {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IPAL Monitoring System";
  workbook.created = new Date();

  // Add worksheet
  const worksheet = workbook.addWorksheet(sheetName);

  // Get columns from data keys
  const columns = Object.keys(data[0]).map((key) => ({
    header: key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    key: key,
    width: 20,
  }));

  worksheet.columns = columns;

  // Add rows
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    data: buffer,
    filename: `${filename}.xlsx`,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

/**
 * ========================================
 * ENDPOINT: EXPORT SENSOR DATA
 * ========================================
 */
exports.exportData = async (req, res) => {
  try {
    const { format, ipal_id, start_date, end_date, parameter } = req.query;
    const user = req.user;

    console.log("📊 Export request from:", user.email);
    console.log("   Format:", format);
    console.log("   Filters:", { ipal_id, start_date, end_date, parameter });

    // Validate format
    if (!format || !["csv", "excel"].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid format. Use 'csv' or 'excel'",
      });
    }

    // Get data
    console.log("🔍 Fetching water quality data...");
    const data = await getWaterQualityData({
      ipal_id,
      start_date,
      end_date,
      parameter,
    });

    if (data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No data found for the specified filters",
        count: 0,
        data: [],
      });
    }

    console.log(`✅ Found ${data.length} records`);

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `water_quality_data_${timestamp}`;

    // Generate export file
    let exportFile;
    if (format.toLowerCase() === "csv") {
      exportFile = await generateCSV(data, filename);
    } else {
      exportFile = await generateExcel(data, filename, "Water Quality Data");
    }

    // Set headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exportFile.filename}"`
    );
    res.setHeader("Content-Type", exportFile.contentType);

    console.log(`✅ Sending file: ${exportFile.filename}`);

    // Send file
    return res.send(exportFile.data);
  } catch (error) {
    console.error("💥 Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export data",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * ENDPOINT: EXPORT ALERTS SUMMARY
 * ========================================
 */
exports.exportAlertsSummary = async (req, res) => {
  try {
    const { format, ipal_id, start_date, end_date, severity } = req.query;
    const user = req.user;

    console.log("🚨 Alert export request from:", user.email);
    console.log("   Format:", format);
    console.log("   Filters:", { ipal_id, start_date, end_date, severity });

    // Validate format
    if (!format || !["csv", "excel"].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid format. Use 'csv' or 'excel'",
      });
    }

    // Get data
    console.log("🔍 Fetching alerts data...");
    const data = await getAlertsData({
      ipal_id,
      start_date,
      end_date,
      severity,
    });

    if (data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No alerts found for the specified filters",
        count: 0,
        data: [],
      });
    }

    console.log(`✅ Found ${data.length} alerts`);

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `alerts_summary_${timestamp}`;

    // Generate export file
    let exportFile;
    if (format.toLowerCase() === "csv") {
      exportFile = await generateCSV(data, filename);
    } else {
      exportFile = await generateExcel(data, filename, "Alerts Summary");
    }

    // Set headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exportFile.filename}"`
    );
    res.setHeader("Content-Type", exportFile.contentType);

    console.log(`✅ Sending file: ${exportFile.filename}`);

    // Send file
    return res.send(exportFile.data);
  } catch (error) {
    console.error("💥 Error exporting alerts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export alerts",
      error: error.message,
    });
  }
};

/**
 * ========================================
 * ENDPOINT: PREVIEW DATA (untuk UI)
 * ========================================
 */
exports.previewData = async (req, res) => {
  try {
    const { ipal_id, start_date, end_date, parameter, limit = 100 } = req.query;

    console.log("👀 Data preview request");
    console.log("   Filters:", { ipal_id, start_date, end_date, parameter });

    // Get data
    let data = await getWaterQualityData({
      ipal_id,
      start_date,
      end_date,
      parameter,
    });

    // Limit results for preview
    data = data.slice(0, parseInt(limit));

    return res.status(200).json({
      success: true,
      count: data.length,
      preview: data,
      message: `Showing ${data.length} records (limited for preview)`,
    });
  } catch (error) {
    console.error("💥 Error previewing data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to preview data",
      error: error.message,
    });
  }
};

console.log("📦 reportController loaded");
