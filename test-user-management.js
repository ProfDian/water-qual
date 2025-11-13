/**
 * ========================================
 * TEST USER MANAGEMENT API
 * ========================================
 * Script untuk test user management endpoints
 * Run: node test-user-management.js
 */

const axios = require("axios");

const BASE_URL = "http://localhost:3000";
let adminToken = null;

// Colors untuk console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.blue}🔷 ${msg}${colors.reset}`),
};

/**
 * Step 1: Login as Admin
 */
async function loginAsAdmin() {
  try {
    log.step("Step 1: Login as Admin");

    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@example.com",
      password: "admin123",
    });

    if (response.data.success) {
      adminToken = response.data.token;
      log.success(`Logged in as: ${response.data.user.email}`);
      log.info(`Role: ${response.data.user.role}`);
      log.info(`Token: ${adminToken.substring(0, 20)}...`);
      return true;
    }
  } catch (error) {
    log.error(
      `Login failed: ${error.response?.data?.message || error.message}`
    );
    log.warn("Make sure you have an admin user created first!");
    log.info("Create admin user with: node test-add-user.js");
    return false;
  }
}

/**
 * Step 2: Create New Users
 */
async function createUsers() {
  try {
    log.step("\nStep 2: Create New Users");

    const usersToCreate = [
      {
        email: "manager1@ipal.com",
        password: "manager123",
        role: "manager",
        username: "Manager Lapangan 1",
      },
      {
        email: "teknisi1@ipal.com",
        password: "teknisi123",
        role: "teknisi",
        username: "Teknisi Lapangan 1",
      },
      {
        email: "teknisi2@ipal.com",
        password: "teknisi123",
        role: "teknisi",
        username: "Teknisi Lapangan 2",
      },
    ];

    for (const userData of usersToCreate) {
      try {
        const response = await axios.post(`${BASE_URL}/api/users`, userData, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });

        log.success(
          `Created: ${response.data.user.username} (${response.data.user.role})`
        );
      } catch (error) {
        if (error.response?.data?.message === "Email already exists") {
          log.warn(`User ${userData.email} already exists - skipping`);
        } else {
          log.error(
            `Failed to create ${userData.email}: ${
              error.response?.data?.message || error.message
            }`
          );
        }
      }
    }
  } catch (error) {
    log.error(`Create users failed: ${error.message}`);
  }
}

/**
 * Step 3: Get All Users
 */
async function getAllUsers() {
  try {
    log.step("\nStep 3: Get All Users");

    const response = await axios.get(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (response.data.success) {
      log.success(`Found ${response.data.count} users`);

      console.log("\n📋 Users List:");
      console.log("─".repeat(80));
      console.log(
        "Email".padEnd(30) +
          "Username".padEnd(25) +
          "Role".padEnd(15) +
          "FCM Token"
      );
      console.log("─".repeat(80));

      response.data.users.forEach((user) => {
        console.log(
          user.email.padEnd(30) +
            user.username.padEnd(25) +
            user.role.padEnd(15) +
            (user.fcm_token || "-")
        );
      });
      console.log("─".repeat(80) + "\n");

      return response.data.users;
    }
  } catch (error) {
    log.error(
      `Get users failed: ${error.response?.data?.message || error.message}`
    );
    return [];
  }
}

/**
 * Step 4: Get User by ID
 */
async function getUserById(uid) {
  try {
    log.step(`\nStep 4: Get User by ID (${uid})`);

    const response = await axios.get(`${BASE_URL}/api/users/${uid}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (response.data.success) {
      const user = response.data.user;
      log.success("User details retrieved");
      console.log(JSON.stringify(user, null, 2));
      return user;
    }
  } catch (error) {
    log.error(
      `Get user failed: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Step 5: Update User
 */
async function updateUser(uid) {
  try {
    log.step(`\nStep 5: Update User (${uid})`);

    const response = await axios.put(
      `${BASE_URL}/api/users/${uid}`,
      {
        username: "Teknisi Updated via API",
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    if (response.data.success) {
      log.success(
        `Updated: ${response.data.user.username} (${response.data.user.role})`
      );
      return response.data.user;
    }
  } catch (error) {
    log.error(
      `Update user failed: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Step 6: Reset Password
 */
async function resetPassword(uid) {
  try {
    log.step(`\nStep 6: Reset Password (${uid})`);

    const response = await axios.post(
      `${BASE_URL}/api/users/${uid}/reset-password`,
      {
        newPassword: "newpassword123",
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    if (response.data.success) {
      log.success("Password reset successfully");
      return true;
    }
  } catch (error) {
    log.error(
      `Reset password failed: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Step 7: Delete User (Optional - commented out for safety)
 */
async function deleteUser(uid) {
  try {
    log.step(`\nStep 7: Delete User (${uid})`);
    log.warn("⚠️  This will permanently delete the user!");

    // Uncomment to actually delete:
    // const response = await axios.delete(`${BASE_URL}/api/users/${uid}`, {
    //   headers: { Authorization: `Bearer ${adminToken}` }
    // });
    //
    // if (response.data.success) {
    //   log.success('User deleted successfully');
    //   return true;
    // }

    log.info("Delete is commented out for safety. Uncomment in code to test.");
  } catch (error) {
    log.error(
      `Delete user failed: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Test Permission Denied (try to create user as non-admin)
 */
async function testPermissionDenied() {
  try {
    log.step("\nStep 8: Test Permission Denied");
    log.info("Trying to create user as teknisi (should fail)...");

    // Login as teknisi first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: "teknisi1@ipal.com",
      password: "teknisi123",
    });

    const teknisiToken = loginResponse.data.token;

    // Try to create user (should fail)
    await axios.post(
      `${BASE_URL}/api/users`,
      {
        email: "test@test.com",
        password: "test123",
        role: "teknisi",
      },
      {
        headers: { Authorization: `Bearer ${teknisiToken}` },
      }
    );

    log.error("Permission check failed - teknisi was able to create user!");
  } catch (error) {
    if (error.response?.status === 403) {
      log.success(
        "✓ Permission denied as expected: Only admins can create users"
      );
    } else {
      log.error(`Unexpected error: ${error.message}`);
    }
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 USER MANAGEMENT API TEST");
  console.log("=".repeat(80) + "\n");

  // Step 1: Login
  const loggedIn = await loginAsAdmin();
  if (!loggedIn) {
    log.error("Cannot proceed without admin login");
    process.exit(1);
  }

  // Step 2: Create users
  await createUsers();

  // Step 3: Get all users
  const users = await getAllUsers();

  // Step 4-7: Test with first non-admin user (if exists)
  const testUser = users.find((u) => u.role !== "admin");
  if (testUser) {
    await getUserById(testUser.uid);
    await updateUser(testUser.uid);
    await resetPassword(testUser.uid);
    // await deleteUser(testUser.uid); // Commented for safety
  }

  // Step 8: Test permission denied
  await testPermissionDenied();

  console.log("\n" + "=".repeat(80));
  log.success("All tests completed!");
  console.log("=".repeat(80) + "\n");
}

// Run tests
runTests().catch((error) => {
  log.error(`Test failed: ${error.message}`);
  process.exit(1);
});
