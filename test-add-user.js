// test-add-user.js
const { db } = require("./config/firebase-config");

async function addTestUser() {
  try {
    await db.collection("users").add({
      email: "abdulfattah@students.undip.ac.id",
      username: "Fattah",
      role: "manager",
      created_at: new Date(),
    });

    console.log("✅ Test admin user added!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

addTestUser();
