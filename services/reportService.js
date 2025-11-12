/**
 * ========================================
 * REPORT SERVICE V4 (FIXED + PDFKit)
 * ========================================
 */

const { db, admin } = require("../config/firebase-config");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

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
      location = "both",
    } = filters;

    try {
      console.log("📊 Fetching water quality data with filters:", filters);

      let query = db
        .collection("water_quality_readings")
        .where("ipal_id", "==", parseInt(ipal_id));

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

      const data = [];
      snapshot.forEach((doc) => {
        const reading = doc.data();

        const row = {
          timestamp: reading.timestamp?.toDate
            ? reading.timestamp.toDate().toISOString()
            : null,
          reading_id: doc.id,
        };

        if (location === "both" || location === "inlet") {
          parameters.forEach((param) => {
            row[`inlet_${param}`] = reading.inlet?.[param] || null;
          });
        }

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
   * Generate CSV content (returns STRING)
   */
  generateCSV: (data) => {
    if (!data || data.length === 0) {
      throw new Error("No data to export");
    }

    const headers = Object.keys(data[0]);
    let csv = "\ufeff"; // BOM for UTF-8 Excel compatibility
    csv += headers.join(",") + "\n";

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (value == null) return "";
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
   * Generate Excel file (returns BUFFER)
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

        dataSheet.getRow(1).font = { bold: true };
        dataSheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        dataSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        dataSheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: headers.length },
        };
      }

      // ✅ Return Buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error("❌ Error generating Excel:", error);
      throw error;
    }
  },

  /**
   * Generate PDF file using PDFKit (returns BUFFER)
   */
  /**
   * Generate PDF file using PDFKit (returns BUFFER)
   * 🔥 COMPACT VERSION - 1-2 Pages Maximum
   */
  generatePDF: async (data, summary, filters) => {
    return new Promise((resolve, reject) => {
      try {
        console.log("🔧 Starting PDF generation...");
        console.log(`📊 Data rows: ${data.length}`);

        // Create PDF document - COMPACT margins
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 30, bottom: 40, left: 40, right: 40 },
          bufferPages: true,
          info: {
            Title: "Water Quality Report",
            Author: "IPAL Monitoring System - UNDIP",
            Subject: "Water Quality Analysis Report",
            Keywords: "water quality, IPAL, monitoring, UNDIP",
          },
        });

        // Collect buffer chunks
        const chunks = [];

        doc.on("data", (chunk) => {
          chunks.push(chunk);
        });

        doc.on("end", () => {
          const buffer = Buffer.concat(chunks);
          console.log(`✅ PDF generation complete: ${buffer.length} bytes`);
          resolve(buffer);
        });

        doc.on("error", (error) => {
          console.error("❌ PDFKit error:", error);
          reject(error);
        });

        // ========================================
        // COLOR PALETTE
        // ========================================
        const colors = {
          primary: "#0066cc",
          secondary: "#4a90e2",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          dark: "#1f2937",
          gray: "#6b7280",
          lightGray: "#f3f4f6",
          white: "#ffffff",
        };

        // ========================================
        // 🔥 COMPACT HEADER - All in one page
        // ========================================
        let yPosition = 30;

        // Thin header bar
        doc.rect(0, 0, 612, 80).fill(colors.primary);

        // Title
        doc
          .fillColor(colors.white)
          .fontSize(20)
          .font("Helvetica-Bold")
          .text("LAPORAN KUALITAS AIR", 40, 20);

        // Subtitle
        doc
          .fontSize(11)
          .font("Helvetica")
          .text("IPAL Teknik Lingkungan - Universitas Diponegoro", 40, 48);

        yPosition = 100;

        // ========================================
        // COMPACT INFO BOX (3 columns in 1 row)
        // ========================================
        doc.rect(40, yPosition, 532, 60).fill(colors.lightGray);

        // Column 1: Period
        doc
          .fontSize(8)
          .fillColor(colors.gray)
          .font("Helvetica")
          .text("PERIODE", 50, yPosition + 12);

        doc
          .fontSize(10)
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text(
            `${filters.start_date}\nsampai\n${filters.end_date}`,
            50,
            yPosition + 25,
            { width: 150, lineGap: 1 }
          );

        // Column 2: Total Readings
        doc
          .fontSize(8)
          .fillColor(colors.gray)
          .font("Helvetica")
          .text("TOTAL PEMBACAAN", 220, yPosition + 12);

        doc
          .fontSize(18)
          .fillColor(colors.primary)
          .font("Helvetica-Bold")
          .text(summary.total_readings.toString(), 220, yPosition + 28);

        // Column 3: Report Date
        doc
          .fontSize(8)
          .fillColor(colors.gray)
          .font("Helvetica")
          .text("DIBUAT TANGGAL", 390, yPosition + 12);

        doc
          .fontSize(10)
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text(
            new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            390,
            yPosition + 28
          );

        yPosition += 80;

        yPosition += 10;

        // ========================================
        // 🔥 COMPACT STATISTICS TABLE
        // ========================================

        doc
          .fontSize(12)
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text("STATISTIK PARAMETER", 40, yPosition);

        doc
          .strokeColor(colors.primary)
          .lineWidth(2)
          .moveTo(40, yPosition + 18)
          .lineTo(160, yPosition + 18)
          .stroke();

        yPosition += 30;

        // Compact table header
        doc.rect(40, yPosition, 532, 20).fill(colors.primary);

        const statsHeaders = ["Parameter", "Avg", "Min", "Max", "Count"];
        const statsColX = [45, 230, 310, 390, 480];
        const statsColW = [180, 70, 70, 80, 50];

        doc.fontSize(8).font("Helvetica-Bold").fillColor(colors.white);
        statsHeaders.forEach((header, i) => {
          doc.text(header, statsColX[i], yPosition + 6, {
            width: statsColW[i],
            align: i === 0 ? "left" : "center",
          });
        });

        yPosition += 20;

        // Compact statistics rows
        let rowAlt = true;
        Object.entries(summary.parameters).forEach(([key, stats]) => {
          if (typeof stats === "object" && stats !== null) {
            // Check page break
            if (yPosition > 750) {
              doc.addPage();
              yPosition = 60;

              // Repeat header
              doc.rect(40, yPosition, 532, 20).fill(colors.primary);
              doc.fontSize(8).font("Helvetica-Bold").fillColor(colors.white);
              statsHeaders.forEach((header, i) => {
                doc.text(header, statsColX[i], yPosition + 6, {
                  width: statsColW[i],
                  align: i === 0 ? "left" : "center",
                });
              });
              yPosition += 20;
              rowAlt = true;
            }

            if (rowAlt) {
              doc.rect(40, yPosition, 532, 18).fill(colors.lightGray);
            }
            rowAlt = !rowAlt;

            doc.fontSize(8).font("Helvetica").fillColor(colors.dark);

            doc.text(
              key.toUpperCase().replace(/_/g, " "),
              statsColX[0],
              yPosition + 5,
              { width: statsColW[0] }
            );
            doc.text(stats.avg, statsColX[1], yPosition + 5, {
              width: statsColW[1],
              align: "center",
            });
            doc.text(stats.min, statsColX[2], yPosition + 5, {
              width: statsColW[2],
              align: "center",
            });
            doc.text(stats.max, statsColX[3], yPosition + 5, {
              width: statsColW[3],
              align: "center",
            });
            doc.text(stats.count.toString(), statsColX[4], yPosition + 5, {
              width: statsColW[4],
              align: "center",
            });

            yPosition += 18;
          }
        });

        // ========================================
        // 🔥 COMPACT REMOVAL EFFICIENCY
        // ========================================
        const removalStats = Object.entries(summary.parameters).filter(
          ([key, value]) => typeof value === "string" && key.includes("removal")
        );

        if (removalStats.length > 0) {
          yPosition += 15;

          doc
            .fontSize(12)
            .fillColor(colors.dark)
            .font("Helvetica-Bold")
            .text("EFISIENSI REMOVAL", 40, yPosition);

          doc
            .strokeColor(colors.success)
            .lineWidth(2)
            .moveTo(40, yPosition + 18)
            .lineTo(170, yPosition + 18)
            .stroke();

          yPosition += 30;

          // Horizontal layout for removal efficiency
          const removalBoxWidth = 532 / removalStats.length;
          removalStats.forEach(([key, value], index) => {
            const xPos = 40 + index * removalBoxWidth;

            doc.rect(xPos, yPosition, removalBoxWidth - 5, 40).fill("#d1fae5");

            doc
              .fontSize(7)
              .fillColor(colors.dark)
              .font("Helvetica")
              .text(
                key.toUpperCase().replace(/_REMOVAL/g, ""),
                xPos + 5,
                yPosition + 8,
                { width: removalBoxWidth - 10, align: "center" }
              );

            doc
              .fontSize(14)
              .fillColor(colors.success)
              .font("Helvetica-Bold")
              .text(value, xPos + 5, yPosition + 20, {
                width: removalBoxWidth - 10,
                align: "center",
              });
          });

          yPosition += 50;
        }

        // ========================================
        // 🔥 COMPACT DATA TABLE (Only if space available)
        // ========================================

        // Check if we need new page
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 60;
        } else {
          yPosition += 15;
        }

        doc
          .fontSize(12)
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text("DATA PEMBACAAN TERAKHIR (Top 20)", 40, yPosition);

        doc
          .strokeColor(colors.secondary)
          .lineWidth(2)
          .moveTo(40, yPosition + 18)
          .lineTo(240, yPosition + 18)
          .stroke();

        yPosition += 30;

        // Compact table header
        const tableTop = yPosition;
        const colWidths = [110, 55, 60, 55, 60];
        const colX = [40, 150, 205, 265, 320];
        const headers = [
          "Waktu",
          "Inlet pH",
          "Inlet TDS",
          "Outlet pH",
          "Outlet TDS",
        ];

        // Header background
        doc.rect(40, tableTop, 380, 18).fill(colors.primary);

        // Header text
        doc.fontSize(7).font("Helvetica-Bold").fillColor(colors.white);
        headers.forEach((header, i) => {
          doc.text(header, colX[i], tableTop + 5, {
            width: colWidths[i],
            align: i === 0 ? "left" : "center",
          });
        });

        // Table rows - LIMIT TO 20 rows only
        yPosition = tableTop + 18;
        const recentData = data.slice(0, 20);
        let rowColor = true;

        doc.font("Helvetica").fontSize(7);

        recentData.forEach((row, index) => {
          // Check if need new page (but unlikely with 20 rows)
          if (yPosition > 770) {
            doc.addPage();
            yPosition = 60;

            // Repeat table header
            doc.rect(40, yPosition, 380, 18).fill(colors.primary);
            doc.fontSize(7).font("Helvetica-Bold").fillColor(colors.white);
            headers.forEach((header, i) => {
              doc.text(header, colX[i], yPosition + 5, {
                width: colWidths[i],
                align: i === 0 ? "left" : "center",
              });
            });

            yPosition += 18;
            rowColor = true;
          }

          // Alternate row colors
          if (rowColor) {
            doc.rect(40, yPosition - 2, 380, 15).fill(colors.lightGray);
          }
          rowColor = !rowColor;

          doc.fillColor(colors.dark);

          const timestamp = row.timestamp
            ? new Date(row.timestamp).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A";

          doc.text(timestamp, colX[0], yPosition, { width: colWidths[0] });
          doc.text(
            row.inlet_ph != null ? row.inlet_ph.toFixed(2) : "-",
            colX[1],
            yPosition,
            { width: colWidths[1], align: "center" }
          );
          doc.text(
            row.inlet_tds != null ? row.inlet_tds.toFixed(1) : "-",
            colX[2],
            yPosition,
            { width: colWidths[2], align: "center" }
          );
          doc.text(
            row.outlet_ph != null ? row.outlet_ph.toFixed(2) : "-",
            colX[3],
            yPosition,
            { width: colWidths[3], align: "center" }
          );
          doc.text(
            row.outlet_tds != null ? row.outlet_tds.toFixed(1) : "-",
            colX[4],
            yPosition,
            { width: colWidths[4], align: "center" }
          );

          yPosition += 15;
        });

        // ========================================
        // ADD PAGE NUMBERS
        // ========================================
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          // Footer
          doc
            .fontSize(8)
            .fillColor(colors.gray)
            .font("Helvetica")
            .text(
              `Halaman ${i + 1} dari ${pages.count}`,
              0,
              doc.page.height - 50,
              { align: "center", width: doc.page.width }
            );

          doc
            .fontSize(7)
            .text(
              "Water Quality Monitoring System - IPAL UNDIP",
              0,
              doc.page.height - 35,
              { align: "center", width: doc.page.width }
            );
        }

        console.log("✅ PDF content written, finalizing...");

        // Finalize PDF
        doc.end();

        console.log("✅ doc.end() called");
      } catch (error) {
        console.error("❌ Error in PDF generation:", error);
        console.error("Stack:", error.stack);
        reject(error);
      }
    });
  },
};

module.exports = reportService;

console.log("📦 reportService (v4 - PDFKit) loaded");
