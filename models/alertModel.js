// models/alertModel.js
const admin = require("../config/firebase-config");

// Fungsi untuk menambahkan alert baru ke Firestore
const addAlert = async (alertData) => {
  try {
    const alertsRef = admin.firestore().collection("alerts");
    const newAlertRef = await alertsRef.add(alertData); // Menambahkan data alert baru
    return newAlertRef.id; // Mengembalikan ID alert yang baru ditambahkan
  } catch (error) {
    throw new Error("Error adding alert: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil semua alert
const getAlerts = async () => {
  try {
    const alertsRef = admin.firestore().collection("alerts");
    const snapshot = await alertsRef.get(); // Mengambil semua dokumen dalam koleksi 'alerts'
    const alerts = snapshot.docs.map((doc) => doc.data()); // Mengambil data dari setiap dokumen
    return alerts;
  } catch (error) {
    throw new Error("Error fetching alerts: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil alert berdasarkan ID
const getAlertById = async (alertId) => {
  try {
    const alertRef = admin.firestore().collection("alerts").doc(alertId); // Mengakses dokumen berdasarkan ID
    const doc = await alertRef.get();
    if (!doc.exists) {
      throw new Error("Alert not found"); // Menangani jika alert tidak ditemukan
    }
    return doc.data(); // Mengembalikan data alert
  } catch (error) {
    throw new Error("Error fetching alert: " + error.message); // Menangani error
  }
};

module.exports = { addAlert, getAlerts, getAlertById };
