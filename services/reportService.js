/**
 * ========================================
 * REPORT SERVICE V3 (FIXED)
 * ========================================
 * Using html-pdf-node for better PDF support
 */

const { db, admin } = require("../config/firebase-config");
const ExcelJS = require("exceljs");
const pdf = require("html-pdf-node");

const reportService = {
  /**
   * Fetch water quality data dengan filter
   */
  fetchWaterQualityData: async (filters) => {
    const {
      ipal_id = 1,
      start_date,
      end_date,
      parameters = ["ph", "tds", "turbidity", "temperature"],
      location = "both", // both, inlet, outlet
    } = filters;

    try {
      console.log("📊 Fetching water quality data with filters:", filters);

      // Build query
      let query = db
        .collection("water_quality_readings")
        .where("ipal_id", "==", parseInt(ipal_id));

      // Date filters
      if (start_date) {
        const startTimestamp = admin.firestore.Timestamp.fromDate(
          new Date(start_date + "T00:00:00Z")
        );
        query = query.where("timestamp", ">=", startTimestamp);
      }

      if (end_date) {
        const endTimestamp = admin.firestore.Timestamp.fromDate(
          new Date(end_date + "T23:59:59Z")
        );
        query = query.where("timestamp", "<=", endTimestamp);
      }

      query = query.orderBy("timestamp", "desc").limit(1000);

      const snapshot = await query.get();

      if (snapshot.empty) {
        return [];
      }

      // Process data
      const data = [];
      snapshot.forEach((doc) => {
        const reading = doc.data();

        const row = {
          timestamp: reading.timestamp?.toDate
            ? reading.timestamp.toDate().toISOString()
            : null,
          reading_id: doc.id,
        };

        // Add inlet data
        if (location === "both" || location === "inlet") {
          parameters.forEach((param) => {
            row[`inlet_${param}`] = reading.inlet?.[param] || null;
          });
        }

        // Add outlet data
        if (location === "both" || location === "outlet") {
          parameters.forEach((param) => {
            row[`outlet_${param}`] = reading.outlet?.[param] || null;
          });
        }

        data.push(row);
      });

      console.log(`✅ Fetched ${data.length} readings`);
      return data;
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      throw error;
    }
  },

  /**
   * Calculate summary statistics
   */
  calculateSummary: (data, parameters) => {
    if (!data || data.length === 0) {
      return null;
    }

    const summary = {
      total_readings: data.length,
      period_start: data[data.length - 1]?.timestamp,
      period_end: data[0]?.timestamp,
      parameters: {},
    };

    parameters.forEach((param) => {
      // Inlet stats
      const inletValues = data
        .map((d) => d[`inlet_${param}`])
        .filter((v) => v != null);

      if (inletValues.length > 0) {
        summary.parameters[`inlet_${param}`] = {
          avg: (
            inletValues.reduce((a, b) => a + b, 0) / inletValues.length
          ).toFixed(2),
          min: Math.min(...inletValues).toFixed(2),
          max: Math.max(...inletValues).toFixed(2),
          count: inletValues.length,
        };
      }

      // Outlet stats
      const outletValues = data
        .map((d) => d[`outlet_${param}`])
        .filter((v) => v != null);

      if (outletValues.length > 0) {
        summary.parameters[`outlet_${param}`] = {
          avg: (
            outletValues.reduce((a, b) => a + b, 0) / outletValues.length
          ).toFixed(2),
          min: Math.min(...outletValues).toFixed(2),
          max: Math.max(...outletValues).toFixed(2),
          count: outletValues.length,
        };
      }

      // Calculate removal efficiency
      if (
        summary.parameters[`inlet_${param}`] &&
        summary.parameters[`outlet_${param}`]
      ) {
        const inletAvg = parseFloat(summary.parameters[`inlet_${param}`].avg);
        const outletAvg = parseFloat(summary.parameters[`outlet_${param}`].avg);

        if (param !== "ph" && param !== "temperature") {
          const removal = ((inletAvg - outletAvg) / inletAvg) * 100;
          summary.parameters[`${param}_removal`] = removal.toFixed(2) + "%";
        }
      }
    });

    return summary;
  },

  /**
   * Generate CSV content
   */
  generateCSV: (data) => {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    // Get headers
    const headers = Object.keys(data[0]);

    // CSV header row
    let csv = headers.join(",") + "\n";

    // CSV data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        // Handle nulls
        if (value == null) return "";
        // Escape commas and quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(",") + "\n";
    });

    return csv;
  },

  /**
   * Generate Excel file
   */
  generateExcel: async (data, summary, filters) => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IPAL Monitoring System";
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 35 },
        { header: "Value", key: "value", width: 30 },
      ];

      // Add summary data
      summarySheet.addRow({
        metric: "Report Generated",
        value: new Date().toLocaleString("id-ID"),
      });
      summarySheet.addRow({
        metric: "Period",
        value: `${filters.start_date} to ${filters.end_date}`,
      });
      summarySheet.addRow({
        metric: "Total Readings",
        value: summary.total_readings,
      });
      summarySheet.addRow({ metric: "", value: "" });

      // Add parameter statistics
      summarySheet.addRow({ metric: "Parameter Statistics", value: "" });
      Object.entries(summary.parameters).forEach(([key, stats]) => {
        if (typeof stats === "object" && stats !== null) {
          summarySheet.addRow({ metric: key.toUpperCase(), value: "" });
          summarySheet.addRow({ metric: "  Average", value: stats.avg });
          summarySheet.addRow({ metric: "  Minimum", value: stats.min });
          summarySheet.addRow({ metric: "  Maximum", value: stats.max });
          summarySheet.addRow({ metric: "  Count", value: stats.count });
        } else {
          summarySheet.addRow({ metric: key.toUpperCase(), value: stats });
        }
      });

      // Style summary sheet
      summarySheet.getRow(1).font = { bold: true, size: 12 };
      summarySheet.getRow(5).font = { bold: true, size: 11 };
      summarySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Sheet 2: Raw Data
      const dataSheet = workbook.addWorksheet("Raw Data");

      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        dataSheet.columns = headers.map((header) => ({
          header: header.toUpperCase().replace(/_/g, " "),
          key: header,
          width: 20,
        }));

        data.forEach((row) => {
          dataSheet.addRow(row);
        });

        // Style data sheet
        dataSheet.getRow(1).font = { bold: true };
        dataSheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        dataSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        // Auto-filter
        dataSheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: headers.length },
        };
      }

      // Return buffer
      return await workbook.xlsx.writeBuffer();
    } catch (error) {
      console.error("❌ Error generating Excel:", error);
      throw error;
    }
  },

  /**
   * Generate PDF file using HTML template
   */
  generatePDF: async (data, summary, filters) => {
    try {
      // Create HTML content
      const recentData = data.slice(0, 20);

      let tableRows = "";
      recentData.forEach((row) => {
        const timestamp = row.timestamp
          ? new Date(row.timestamp).toLocaleString("id-ID")
          : "N/A";

        tableRows += `
          <tr>
            <td>${timestamp}</td>
            <td>${row.inlet_ph != null ? row.inlet_ph : "-"}</td>
            <td>${row.inlet_tds != null ? row.inlet_tds : "-"}</td>
            <td>${row.outlet_ph != null ? row.outlet_ph : "-"}</td>
            <td>${row.outlet_tds != null ? row.outlet_tds : "-"}</td>
          </tr>
        `;
      });

      let parameterStats = "";
      Object.entries(summary.parameters).forEach(([key, stats]) => {
        if (typeof stats === "object" && stats !== null) {
          parameterStats += `
            <div style="margin-bottom: 10px;">
              <strong>${key.toUpperCase()}</strong><br>
              <span style="margin-left: 20px;">Average: ${stats.avg}</span><br>
              <span style="margin-left: 20px;">Min: ${stats.min} | Max: ${
            stats.max
          }</span>
            </div>
          `;
        } else if (typeof stats === "string") {
          parameterStats += `
            <div style="margin-bottom: 10px;">
              <strong>${key.toUpperCase()}</strong><br>
              <span style="margin-left: 20px;">${stats}</span>
            </div>
          `;
        }
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
            }
            h1 {
              text-align: center;
              color: #333;
              margin-bottom: 5px;
            }
            h2 {
              text-align: center;
              color: #666;
              font-size: 18px;
              margin-top: 5px;
            }
            .info {
              margin: 20px 0;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 5px;
            }
            .section {
              margin: 30px 0;
            }
            .section h3 {
              color: #333;
              border-bottom: 2px solid #0066cc;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background-color: #0066cc;
              color: white;
              padding: 10px;
              text-align: left;
              font-size: 12px;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #ddd;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>LAPORAN KUALITAS AIR</h1>
          <h2>IPAL Teknik Lingkungan UNDIP</h2>
          
          <div class="info">
            <strong>Generated:</strong> ${new Date().toLocaleString(
              "id-ID"
            )}<br>
            <strong>Period:</strong> ${filters.start_date} to ${
        filters.end_date
      }<br>
            <strong>Total Readings:</strong> ${summary.total_readings}
          </div>

          <div class="section">
            <h3>Summary Statistics</h3>
            ${parameterStats}
          </div>

          <div class="section">
            <h3>Recent Readings (Last 20)</h3>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Inlet pH</th>
                  <th>Inlet TDS</th>
                  <th>Outlet pH</th>
                  <th>Outlet TDS</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>

          <div class="footer">
            Generated by Water Quality Monitoring System - IPAL UNDIP
          </div>
        </body>
        </html>
      `;

      // Generate PDF from HTML
      const file = { content: htmlContent };
      const options = {
        format: "A4",
        margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      };

      const pdfBuffer = await pdf.generatePdf(file, options);
      return pdfBuffer;
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      throw error;
    }
  },
};

module.exports = reportService;
