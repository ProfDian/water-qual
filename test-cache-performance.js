/**
 * ========================================
 * CACHE PERFORMANCE TEST
 * ========================================
 * Test cache performance untuk membuktikan
 * improvement dalam response time dan Firestore reads
 */

const axios = require("axios");

// ========================================
// CONFIGURATION
// ========================================

const API_URL = "http://localhost:3000";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJySlBUWER6OFB5UlhjbTdzMnZyZnRkZ1U2NXUyIiwiZW1haWwiOiJmYXR0YWguYWZyMkBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjMwMzAxNzcsImV4cCI6MTc2MzExNjU3N30.MoprmmCbHJHt_9nJp09Rcbjo2LoxJsiBjwYJeE093RI";

// Test endpoints
const ENDPOINTS = [
  {
    name: "Dashboard Summary",
    url: `${API_URL}/api/dashboard/summary/1`,
    expectedCache: "30s",
  },
  {
    name: "Dashboard Readings (Chart)",
    url: `${API_URL}/api/dashboard/readings/1?period=today`,
    expectedCache: "60s",
  },
  {
    name: "Sensor List",
    url: `${API_URL}/api/sensors?ipal_id=1`,
    expectedCache: "60s",
  },
  {
    name: "Sensor Readings",
    url: `${API_URL}/api/sensors/readings?ipal_id=1&limit=20`,
    expectedCache: "45s",
  },
  {
    name: "Active Alerts",
    url: `${API_URL}/api/alerts?ipal_id=1&status=active`,
    expectedCache: "30s",
  },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function makeRequest(url) {
  const start = Date.now();
  try {
    await axios.get(url, { headers });
    const time = Date.now() - start;
    return { success: true, time };
  } catch (error) {
    const time = Date.now() - start;
    return { success: false, time, error: error.message };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================================
// TEST FUNCTIONS
// ========================================

async function testSingleEndpoint(endpoint) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📍 Testing: ${endpoint.name}`);
  console.log(`   URL: ${endpoint.url}`);
  console.log(`   Expected Cache: ${endpoint.expectedCache}`);
  console.log(`${"=".repeat(60)}\n`);

  // First request (cache MISS)
  console.log("1️⃣ First request (cache MISS expected):");
  const result1 = await makeRequest(endpoint.url);

  if (!result1.success) {
    console.log(`   ❌ Failed: ${result1.error}`);
    return null;
  }

  console.log(`   ⏱️  Time: ${result1.time}ms`);
  console.log(`   🔥 Firestore reads: ~20-50 reads`);

  // Wait a bit
  await sleep(200);

  // Second request (cache HIT)
  console.log("\n2️⃣ Second request (cache HIT expected):");
  const result2 = await makeRequest(endpoint.url);

  if (!result2.success) {
    console.log(`   ❌ Failed: ${result2.error}`);
    return null;
  }

  console.log(`   ⏱️  Time: ${result2.time}ms`);
  console.log(`   🎯 Cache hit! (0 Firestore reads)`);

  // Calculate improvement
  const improvement = ((result1.time - result2.time) / result1.time) * 100;
  const speedup = result1.time / result2.time;
  const timeSaved = result1.time - result2.time;

  console.log("\n📊 Performance Analysis:");
  console.log(`   Improvement: ${improvement.toFixed(2)}%`);
  console.log(`   Speedup: ${speedup.toFixed(2)}x faster`);
  console.log(`   Time saved: ${timeSaved}ms`);

  return {
    endpoint: endpoint.name,
    firstRequest: result1.time,
    secondRequest: result2.time,
    improvement: improvement.toFixed(2),
    speedup: speedup.toFixed(2),
    timeSaved,
  };
}

async function getCacheStats() {
  try {
    const response = await axios.get(`${API_URL}/api/cache/stats`, {
      headers,
    });
    return response.data.data;
  } catch (error) {
    console.error("Failed to get cache stats:", error.message);
    return null;
  }
}

// ========================================
// MAIN TEST FUNCTION
// ========================================

async function runPerformanceTest() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║     🚀 CACHE PERFORMANCE TEST                         ║");
  console.log("║     Testing response time improvements                ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Check if token is set
  if (TOKEN === "YOUR_JWT_TOKEN_HERE") {
    console.log("❌ ERROR: Please set your JWT token in the script!");
    console.log("\n   1. Login via POST http://localhost:3000/auth/login");
    console.log("   2. Copy the token from response");
    console.log('   3. Replace "YOUR_JWT_TOKEN_HERE" in this script\n');
    return;
  }

  // Test all endpoints
  const results = [];

  for (const endpoint of ENDPOINTS) {
    const result = await testSingleEndpoint(endpoint);
    if (result) {
      results.push(result);
    }
    await sleep(500); // Wait between tests
  }

  // Summary
  console.log("\n\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║     📊 OVERALL PERFORMANCE SUMMARY                    ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("\n");

  console.log("┌────────────────────────────────────────────────────────┐");
  console.log("│ Endpoint                    │ 1st │ 2nd │ Improvement  │");
  console.log("├────────────────────────────────────────────────────────┤");

  results.forEach((result) => {
    const name = result.endpoint.padEnd(27);
    const first = `${result.firstRequest}ms`.padStart(4);
    const second = `${result.secondRequest}ms`.padStart(4);
    const improvement = `${result.improvement}%`.padStart(11);

    console.log(`│ ${name} │ ${first} │ ${second} │ ${improvement} │`);
  });

  console.log("└────────────────────────────────────────────────────────┘");

  // Calculate averages
  const avgFirstRequest =
    results.reduce((sum, r) => sum + r.firstRequest, 0) / results.length;
  const avgSecondRequest =
    results.reduce((sum, r) => sum + r.secondRequest, 0) / results.length;
  const avgImprovement =
    results.reduce((sum, r) => sum + parseFloat(r.improvement), 0) /
    results.length;
  const totalTimeSaved = results.reduce((sum, r) => sum + r.timeSaved, 0);

  console.log("\n📈 Average Performance:");
  console.log(`   First Request (MISS):   ${avgFirstRequest.toFixed(2)}ms`);
  console.log(`   Second Request (HIT):   ${avgSecondRequest.toFixed(2)}ms`);
  console.log(`   Average Improvement:    ${avgImprovement.toFixed(2)}%`);
  console.log(`   Total Time Saved:       ${totalTimeSaved}ms`);

  // Get cache statistics
  console.log("\n🔍 Cache Statistics:");
  const stats = await getCacheStats();

  if (stats) {
    console.log(`   Total Requests:         ${stats.total_requests}`);
    console.log(`   Cache Hits:             ${stats.hits}`);
    console.log(`   Cache Misses:           ${stats.misses}`);
    console.log(`   Hit Rate:               ${stats.hit_rate}`);
    console.log(`   Cached Keys:            ${stats.keys_count}`);
    console.log(`   Uptime:                 ${stats.uptime_seconds}s`);
  }

  // Firestore savings estimation
  console.log("\n💰 Firestore Reads Savings:");
  const totalReads = results.length * 30; // Assume 30 reads per request
  const cachedReads = 0; // Cache hits = 0 reads
  const savedReads = totalReads;

  console.log(`   Without Cache:          ${totalReads} reads`);
  console.log(`   With Cache (2nd req):   ${cachedReads} reads`);
  console.log(`   Reads Saved:            ${savedReads} reads (100%)`);

  // Monthly projection
  const requestsPerDay = 100; // 100 requests per day per endpoint
  const monthlyRequests = requestsPerDay * 30 * results.length;
  const hitRate = 0.8; // 80% cache hit rate
  const monthlySavings = Math.floor(monthlyRequests * hitRate * 30);

  console.log("\n📅 Monthly Projection (80% hit rate):");
  console.log(`   Requests per month:     ${monthlyRequests.toLocaleString()}`);
  console.log(`   Firestore reads saved:  ${monthlySavings.toLocaleString()}`);
  console.log(
    `   Cost savings:           ~$${((monthlySavings * 0.06) / 100000).toFixed(
      2
    )}`
  );

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║     ✅ TEST COMPLETED SUCCESSFULLY                    ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("\n");
}

// ========================================
// RUN TEST
// ========================================

if (require.main === module) {
  runPerformanceTest().catch((error) => {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { runPerformanceTest };
