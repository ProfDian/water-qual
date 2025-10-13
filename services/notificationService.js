const admin = require("../config/firebase-config");

const sendNotification = async (token, message) => {
  const payload = {
    notification: {
      title: "Alert: Kualitas Air Tidak Normal",
      body: message,
    },
  };

  try {
    await admin.messaging().sendToDevice(token, payload);
    console.log("Notifikasi berhasil dikirim");
  } catch (error) {
    console.error("Gagal mengirim notifikasi:", error);
  }
};

module.exports = { sendNotification };
