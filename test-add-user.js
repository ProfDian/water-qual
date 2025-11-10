// test-add-user.js
const { db } = require("./config/firebase-config");

async function addTestUser() {
  try {
    await db.collection("users").add({
      email: "rahadian.arif.wicaksana@gmail.com",
      username: "ian",
      role: "manager",
      created_at: new Date(),
    });

    console.log("✅ Test admin user added!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

addTestUser();
