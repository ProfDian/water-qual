// models/sensorModel.js
const admin = require("../config/firebase-config"); // Firebase Admin SDK

// Fungsi untuk menambahkan sensor baru ke Firestore
const addSensor = async (sensorData) => {
  try {
    const sensorsRef = admin.firestore().collection("sensors");
    const newSensorRef = await sensorsRef.add(sensorData); // Menambahkan data sensor baru
    return newSensorRef.id; // Mengembalikan ID sensor yang baru ditambahkan
  } catch (error) {
    throw new Error("Error adding sensor: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil semua data sensor
const getSensors = async () => {
  try {
    const sensorsRef = admin.firestore().collection("sensors");
    const snapshot = await sensorsRef.get(); // Mengambil semua dokumen dalam koleksi 'sensors'
    const sensors = snapshot.docs.map((doc) => doc.data()); // Mengambil data dari setiap dokumen
    return sensors;
  } catch (error) {
    throw new Error("Error fetching sensors: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil sensor berdasarkan ID
const getSensorById = async (sensorId) => {
  try {
    const sensorRef = admin.firestore().collection("sensors").doc(sensorId); // Mengakses dokumen berdasarkan ID
    const doc = await sensorRef.get();
    if (!doc.exists) {
      throw new Error("Sensor not found"); // Menangani jika sensor tidak ditemukan
    }
    return doc.data(); // Mengembalikan data sensor
  } catch (error) {
    throw new Error("Error fetching sensor: " + error.message); // Menangani error
  }
};

module.exports = { addSensor, getSensors, getSensorById };
