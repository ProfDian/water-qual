/**
 * ========================================
 * EMAIL NOTIFICATION SERVICE
 * ========================================
 * Service untuk mengirim email notification
 * menggunakan Nodemailer + Gmail SMTP
 */

const nodemailer = require("nodemailer");

// ========================================
// KONFIGURASI EMAIL TRANSPORTER
// ========================================

let transporter = null;

function initializeEmailService() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Gmail address
      pass: process.env.EMAIL_PASS, // App Password (NOT regular Gmail password!)
    },
  });

  // Verify connection
  transporter.verify(function (error, success) {
    if (error) {
      console.error("❌ Email service failed to initialize:", error.message);
    } else {
      console.log("✅ Email service is ready");
    }
  });

  return transporter;
}

// ========================================
// FUNGSI UTAMA: KIRIM EMAIL ALERT
// ========================================

/**
 * Kirim email notification untuk water quality alert
 *
 * @param {Object} alertData - Data alert dari Firestore
 * @param {Array<string>} recipients - Array of email addresses
 * @returns {Promise<Object>} Send result
 */
async function sendWaterQualityAlert(alertData, recipients = []) {
  try {
    const emailTransporter = initializeEmailService();

    if (!emailTransporter) {
      throw new Error("Email service not initialized");
    }

    if (!recipients || recipients.length === 0) {
      console.log("⚠️  No recipients specified, skipping email");
      return { success: false, message: "No recipients" };
    }

    console.log("📧 Preparing email notification...");
    console.log(`   Recipients: ${recipients.join(", ")}`);

    // Generate email content
    const emailContent = generateAlertEmailHTML(alertData);

    // Email options
    const mailOptions = {
      from: {
        name: "IPAL Monitoring System",
        address: process.env.EMAIL_USER || "noreply@ipal-monitoring.com",
      },
      to: recipients.join(", "),
      subject: `🚨 ALERT: ${alertData.rule} - IPAL ${alertData.ipal_id}`,
      html: emailContent,
      priority: alertData.severity === "critical" ? "high" : "normal",
    };

    // Send email
    const info = await emailTransporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully!");
    console.log(`   Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      recipients: recipients,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("💥 Failed to send email:", error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Generate HTML email content
 */
function generateAlertEmailHTML(alertData) {
  const severityColor = {
    critical: "#dc3545",
    high: "#fd7e14",
    medium: "#ffc107",
    low: "#28a745",
  };

  const severityLabel = {
    critical: "KRITIS",
    high: "TINGGI",
    medium: "SEDANG",
    low: "RENDAH",
  };

  const color = severityColor[alertData.severity] || "#6c757d";
  const label = severityLabel[alertData.severity] || "UNKNOWN";

  const timestamp = alertData.timestamp?.toDate
    ? alertData.timestamp.toDate()
    : new Date();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background-color: ${color}; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .severity-badge { display: inline-block; background-color: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; margin-top: 10px; font-weight: bold; }
    .content { padding: 30px; }
    .alert-info { background-color: #f8f9fa; border-left: 4px solid ${color}; padding: 15px; margin-bottom: 20px; }
    .alert-info h2 { margin-top: 0; color: ${color}; font-size: 18px; }
    .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    .data-table th { background-color: #f8f9fa; font-weight: bold; color: #495057; }
    .value-high { color: #dc3545; font-weight: bold; }
    .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 PERINGATAN KUALITAS AIR</h1>
      <div class="severity-badge">TINGKAT: ${label}</div>
    </div>
    <div class="content">
      <div class="alert-info">
        <h2>${alertData.rule}</h2>
        <p><strong>Pesan:</strong> ${alertData.message}</p>
      </div>
      <h3>📊 Detail Alert:</h3>
      <table class="data-table">
        <tr><th>IPAL ID</th><td>${alertData.ipal_id}</td></tr>
        <tr><th>Parameter</th><td><strong>${alertData.parameter.toUpperCase()}</strong></td></tr>
        <tr><th>Lokasi</th><td>${
          alertData.location === "inlet"
            ? "Inlet (Masuk)"
            : alertData.location === "outlet"
            ? "Outlet (Keluar)"
            : alertData.location
        }</td></tr>
        <tr><th>Waktu</th><td>${timestamp.toLocaleString("id-ID")}</td></tr>
      </table>
      <h3>📈 Pembacaan Sensor:</h3>
      <table class="data-table">
        <tr><th>Lokasi</th><th>Nilai</th></tr>
        <tr><td>Inlet</td><td>${
          alertData.inlet_value !== null && alertData.inlet_value !== undefined
            ? alertData.inlet_value
            : "N/A"
        }</td></tr>
        <tr><td>Outlet</td><td class="${
          alertData.severity === "critical" || alertData.severity === "high"
            ? "value-high"
            : ""
        }">${
    alertData.outlet_value !== null && alertData.outlet_value !== undefined
      ? alertData.outlet_value
      : "N/A"
  }</td></tr>
        ${
          alertData.threshold
            ? `<tr><td>Batas Baku Mutu</td><td>${alertData.threshold}</td></tr>`
            : ""
        }
        ${
          alertData.reduction
            ? `<tr><td>Efisiensi Reduksi</td><td class="value-high">${alertData.reduction}%</td></tr>`
            : ""
        }
      </table>
      <div style="text-align: center;">
        <a href="${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/alerts" class="cta-button">🖥️ Lihat di Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>Email ini dikirim otomatis oleh IPAL Monitoring System</p>
      <p>Departemen Teknik Lingkungan Universitas Diponegoro</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send test email
 */
async function sendTestEmail(recipient) {
  const testAlert = {
    ipal_id: 1,
    parameter: "ph",
    location: "outlet",
    rule: "pH outlet melebihi batas maksimum",
    message: "pH outlet (9.5) melebihi batas 9.0",
    severity: "high",
    inlet_value: 7.2,
    outlet_value: 9.5,
    threshold: 9.0,
    timestamp: new Date(),
  };

  return await sendWaterQualityAlert(testAlert, [recipient]);
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  sendWaterQualityAlert,
  sendTestEmail,
  initializeEmailService,
};

console.log("📦 emailService loaded");
