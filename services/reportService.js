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
   * Professional & Beautiful Design
   */
  generatePDF: async (data, summary, filters) => {
    return new Promise((resolve, reject) => {
      try {
        console.log("🔧 Starting PDF generation...");
        console.log(`📊 Data rows: ${data.length}`);

        // Create PDF document
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 40, bottom: 60, left: 50, right: 50 },
          bufferPages: true, // Enable page numbering
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
        // HEADER - Cover Page
        // ========================================

        // Background rectangle
        doc.rect(0, 0, 612, 250).fill(colors.primary);

        // White title box
        doc.rect(50, 80, 512, 120).fill(colors.white);

        // Main Title
        doc
          .fillColor(colors.primary)
          .fontSize(28)
          .font("Helvetica-Bold")
          .text("LAPORAN KUALITAS AIR", 50, 100, {
            align: "center",
            width: 512,
          });

        // Subtitle
        doc
          .fontSize(16)
          .fillColor(colors.gray)
          .font("Helvetica")
          .text("Instalasi Pengolahan Air Limbah (IPAL)", 50, 140, {
            align: "center",
            width: 512,
          });

        // Institution
        doc
          .fontSize(14)
          .fillColor(colors.secondary)
          .font("Helvetica-Bold")
          .text("Teknik Lingkungan - Universitas Diponegoro", 50, 170, {
            align: "center",
            width: 512,
          });

        // Info Box
        doc.rect(50, 280, 512, 100).fill(colors.lightGray);

        doc
          .fontSize(10)
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text("PERIODE PELAPORAN", 70, 295);

        doc
          .fontSize(12)
          .fillColor(colors.primary)
          .font("Helvetica")
          .text(`${filters.start_date} sampai ${filters.end_date}`, 70, 315);

        doc
          .fontSize(10)
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text("TANGGAL PEMBUATAN", 70, 345);

        doc
          .fontSize(12)
          .fillColor(colors.gray)
          .font("Helvetica")
          .text(
            new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            70,
            365
          );

        // Decorative bottom bar
        doc.rect(0, 750, 612, 92).fill(colors.primary);
        doc
          .fontSize(9)
          .fillColor(colors.white)
          .font("Helvetica")
          .text("Water Quality Monitoring System", 0, 795, {
            align: "center",
            width: 612,
          });

        // ========================================
        // PAGE 2 - Executive Summary
        // ========================================
        doc.addPage();

        // Page Header
        doc.rect(0, 0, 612, 60).fill(colors.primary);
        doc
          .fontSize(16)
          .fillColor(colors.white)
          .font("Helvetica-Bold")
          .text("RINGKASAN EKSEKUTIF", 50, 22);

        doc.moveDown(4);
        let yPosition = 100;

        // Summary Cards
        const summaryCards = [
          {
            label: "Total Pembacaan",
            value: summary.total_readings.toString(),
            color: colors.primary,
            bgColor: "#e3f2fd",
          },
          {
            label: "Periode Mulai",
            value: new Date(summary.period_start).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            color: colors.success,
            bgColor: "#d1fae5",
          },
          {
            label: "Periode Selesai",
            value: new Date(summary.period_end).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            color: colors.secondary,
            bgColor: "#dbeafe",
          },
        ];

        summaryCards.forEach((card, index) => {
          const xPos = 50 + index * 174;

          // Card background
          doc.roundedRect(xPos, yPosition, 160, 80, 8).fill(card.bgColor);

          // Label
          doc
            .fontSize(10)
            .fillColor(colors.gray)
            .font("Helvetica")
            .text(card.label, xPos + 15, yPosition + 20, { width: 130 });

          // Value
          doc
            .fontSize(20)
            .fillColor(card.color)
            .font("Helvetica-Bold")
            .text(card.value, xPos + 15, yPosition + 40, { width: 130 });
        });

        yPosition += 120;

        // ========================================
        // STATISTICS SECTION
        // ========================================

        doc
          .fontSize(14)
          .fillColor(colors.dark)
          .font("Helvetica-Bold")
          .text("STATISTIK PARAMETER", 50, yPosition);

        // Decorative line
        doc
          .strokeColor(colors.primary)
          .lineWidth(3)
          .moveTo(50, yPosition + 25)
          .lineTo(200, yPosition + 25)
          .stroke();

        yPosition += 50;

        // Statistics Table
        Object.entries(summary.parameters).forEach(([key, stats]) => {
          if (typeof stats === "object" && stats !== null) {
            // Check if need new page
            if (yPosition > 680) {
              doc.addPage();

              // Page Header
              doc.rect(0, 0, 612, 60).fill(colors.primary);
              doc
                .fontSize(16)
                .fillColor(colors.white)
                .font("Helvetica-Bold")
                .text("STATISTIK PARAMETER (Lanjutan)", 50, 22);

              yPosition = 100;
            }

            // Parameter box
            doc.roundedRect(50, yPosition, 512, 100, 8).fill(colors.lightGray);

            // Parameter name
            doc
              .fontSize(12)
              .fillColor(colors.primary)
              .font("Helvetica-Bold")
              .text(key.toUpperCase().replace(/_/g, " "), 70, yPosition + 15);

            // Stats grid
            const statsData = [
              { label: "Rata-rata", value: stats.avg, icon: "●" },
              { label: "Minimum", value: stats.min, icon: "▼" },
              { label: "Maximum", value: stats.max, icon: "▲" },
              { label: "Jumlah Data", value: stats.count, icon: "■" },
            ];

            statsData.forEach((stat, index) => {
              const xOffset = 70 + (index % 2) * 250;
              const yOffset = yPosition + 45 + Math.floor(index / 2) * 25;

              doc
                .fontSize(8)
                .fillColor(colors.gray)
                .font("Helvetica")
                .text(stat.label, xOffset, yOffset);

              doc
                .fontSize(11)
                .fillColor(colors.dark)
                .font("Helvetica-Bold")
                .text(stat.value.toString(), xOffset + 80, yOffset);
            });

            yPosition += 120;
          }
        });

        // Removal Efficiency Section
        const removalStats = Object.entries(summary.parameters).filter(
          ([key, value]) => typeof value === "string" && key.includes("removal")
        );

        if (removalStats.length > 0) {
          if (yPosition > 650) {
            doc.addPage();
            doc.rect(0, 0, 612, 60).fill(colors.primary);
            doc
              .fontSize(16)
              .fillColor(colors.white)
              .font("Helvetica-Bold")
              .text("EFISIENSI REMOVAL", 50, 22);
            yPosition = 100;
          } else {
            yPosition += 20;
            doc
              .fontSize(14)
              .fillColor(colors.dark)
              .font("Helvetica-Bold")
              .text("EFISIENSI REMOVAL", 50, yPosition);

            doc
              .strokeColor(colors.success)
              .lineWidth(3)
              .moveTo(50, yPosition + 25)
              .lineTo(220, yPosition + 25)
              .stroke();

            yPosition += 50;
          }

          removalStats.forEach(([key, value]) => {
            doc.roundedRect(50, yPosition, 512, 50, 8).fill("#d1fae5");

            doc
              .fontSize(11)
              .fillColor(colors.dark)
              .font("Helvetica-Bold")
              .text(key.toUpperCase().replace(/_/g, " "), 70, yPosition + 12);

            doc
              .fontSize(16)
              .fillColor(colors.success)
              .font("Helvetica-Bold")
              .text(value, 70, yPosition + 28);

            yPosition += 65;
          });
        }

        // ========================================
        // PAGE 3+ - Data Table
        // ========================================
        doc.addPage();

        // Page Header
        doc.rect(0, 0, 612, 60).fill(colors.primary);
        doc
          .fontSize(16)
          .fillColor(colors.white)
          .font("Helvetica-Bold")
          .text("DATA PEMBACAAN TERAKHIR", 50, 22);

        yPosition = 100;

        // Table Header
        const tableTop = yPosition;
        const colWidths = [130, 60, 65, 60, 65];
        const colX = [50, 180, 240, 305, 365];
        const headers = [
          "Waktu",
          "Inlet pH",
          "Inlet TDS",
          "Outlet pH",
          "Outlet TDS",
        ];

        // Header background
        doc.rect(50, tableTop, 480, 25).fill(colors.primary);

        // Header text
        doc.fontSize(9).font("Helvetica-Bold").fillColor(colors.white);
        headers.forEach((header, i) => {
          doc.text(header, colX[i], tableTop + 8, {
            width: colWidths[i],
            align: i === 0 ? "left" : "center",
          });
        });

        // Table rows
        yPosition = tableTop + 30;
        const recentData = data.slice(0, 25);
        let rowColor = true;

        doc.font("Helvetica").fontSize(8);

        recentData.forEach((row, index) => {
          // Check if need new page
          if (yPosition > 750) {
            doc.addPage();

            // Repeat header
            doc.rect(0, 0, 612, 60).fill(colors.primary);
            doc
              .fontSize(16)
              .fillColor(colors.white)
              .font("Helvetica-Bold")
              .text("DATA PEMBACAAN (Lanjutan)", 50, 22);

            yPosition = 100;

            // Repeat table header
            doc.rect(50, yPosition, 480, 25).fill(colors.primary);
            doc.fontSize(9).font("Helvetica-Bold").fillColor(colors.white);
            headers.forEach((header, i) => {
              doc.text(header, colX[i], yPosition + 8, {
                width: colWidths[i],
                align: i === 0 ? "left" : "center",
              });
            });

            yPosition += 30;
            rowColor = true;
          }

          // Alternate row colors
          if (rowColor) {
            doc.rect(50, yPosition - 3, 480, 20).fill(colors.lightGray);
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

          yPosition += 20;
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
