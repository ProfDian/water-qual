// models/notificationModel.js
const admin = require("../config/firebase-config");

// Fungsi untuk menambahkan notifikasi baru
const addNotification = async (notificationData) => {
  try {
    const notificationsRef = admin.firestore().collection("notifications");
    const newNotificationRef = await notificationsRef.add(notificationData); // Menambahkan notifikasi baru
    return newNotificationRef.id; // Mengembalikan ID notifikasi yang baru ditambahkan
  } catch (error) {
    throw new Error("Error adding notification: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil semua notifikasi
const getNotifications = async () => {
  try {
    const notificationsRef = admin.firestore().collection("notifications");
    const snapshot = await notificationsRef.get(); // Mengambil semua dokumen dalam koleksi 'notifications'
    const notifications = snapshot.docs.map((doc) => doc.data()); // Mengambil data dari setiap dokumen
    return notifications;
  } catch (error) {
    throw new Error("Error fetching notifications: " + error.message); // Menangani error
  }
};

// Fungsi untuk mengambil notifikasi berdasarkan ID
const getNotificationById = async (notificationId) => {
  try {
    const notificationRef = admin
      .firestore()
      .collection("notifications")
      .doc(notificationId); // Mengakses dokumen berdasarkan ID
    const doc = await notificationRef.get();
    if (!doc.exists) {
      throw new Error("Notification not found"); // Menangani jika notifikasi tidak ditemukan
    }
    return doc.data(); // Mengembalikan data notifikasi
  } catch (error) {
    throw new Error("Error fetching notification: " + error.message); // Menangani error
  }
};

module.exports = { addNotification, getNotifications, getNotificationById };
