// test-add-user.js
const { db } = require("./config/firebase-config");

async function addTestUser() {
  try {
    await db.collection("users").add({
      email: "fattah.afr2@gmail.com",
      username: "Fattah",
      role: "admin",
      created_at: new Date(),
    });

    console.log("✅ Test admin user added!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

addTestUser();
