/**
 * ========================================
 * CACHE SERVICE
 * ========================================
 * Wrapper for cache operations with predefined keys
 * Provides consistent caching patterns across controllers
 */

const NodeCache = require("node-cache");

// Initialize cache with configuration
const cache = new NodeCache({
  stdTTL: 300, // Default: 5 minutes
  checkperiod: 120, // Check for expired keys every 120 seconds
  useClones: false, // Performance: Don't clone objects
  deleteOnExpire: true, // Auto-delete expired keys
});

/**
 * Predefined cache keys for consistency
 */
const KEYS = {
  // IPAL keys
  IPAL: (ipal_id) => `ipal:${ipal_id}`,
  IPAL_STATS: (ipal_id) => `ipal:${ipal_id}:stats`,
  IPALS: (filter) => `ipals:all:${filter || "all"}`,

  // Sensor keys
  SENSOR: (sensor_id) => `sensor:${sensor_id}`,
  SENSORS: (ipal_id) => `sensors:${ipal_id || "all"}`,
  LATEST_READING: (sensor_id) => `reading:latest:${sensor_id}`,
  SENSOR_HISTORY: (sensor_id, limit) => `history:${sensor_id}:${limit || 100}`,

  // Dashboard keys
  DASHBOARD_SUMMARY: (ipal_id) => `dashboard:summary:${ipal_id}`,
  DASHBOARD_READINGS: (ipal_id, period) =>
    `dashboard:readings:${ipal_id}:${period || "today"}`,

  // Alert keys
  ALERTS: (ipal_id, status) => `alerts:${ipal_id || "all"}:${status || "all"}`,
  ALERT: (alert_id) => `alert:${alert_id}`,
};

/**
 * Get cached data or fetch if not exists
 * @param {String} key - Cache key
 * @param {Function} fetchFunction - Async function to fetch data if cache miss
 * @param {Number} ttl - Time to live in seconds (optional, default: 300)
 * @returns {Promise<Any>} Cached or fetched data
 */
const getCached = async (key, fetchFunction, ttl = 300) => {
  try {
    // Try to get from cache
    const cachedData = cache.get(key);

    if (cachedData !== undefined) {
      console.log(`🎯 Cache HIT: ${key}`);
      return cachedData;
    }

    // Cache miss - fetch data
    console.log(`❌ Cache MISS: ${key}`);
    const data = await fetchFunction();

    // Store in cache (only if data is not null/undefined)
    if (data !== null && data !== undefined) {
      cache.set(key, data, ttl);
      console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
    }

    return data;
  } catch (error) {
    console.error(`💥 Cache error for key ${key}:`, error.message);
    // On error, try to fetch directly without caching
    return await fetchFunction();
  }
};

/**
 * Set cache manually
 * @param {String} key - Cache key
 * @param {Any} value - Value to cache
 * @param {Number} ttl - Time to live in seconds (optional)
 */
const set = (key, value, ttl = 300) => {
  cache.set(key, value, ttl);
  console.log(`💾 Manual cache set: ${key} (TTL: ${ttl}s)`);
};

/**
 * Get cache value
 * @param {String} key - Cache key
 * @returns {Any} Cached value or undefined
 */
const get = (key) => {
  const value = cache.get(key);
  if (value !== undefined) {
    console.log(`🎯 Cache retrieved: ${key}`);
  }
  return value;
};

/**
 * Invalidate specific cache key
 * @param {String} key - Cache key to invalidate
 */
const invalidate = (key) => {
  const deleted = cache.del(key);
  if (deleted) {
    console.log(`🗑️  Cache invalidated: ${key}`);
  }
  return deleted;
};

/**
 * Invalidate cache keys by pattern
 * @param {String} pattern - Pattern to match (e.g., 'sensors:*', 'ipal:1:*')
 * @returns {Number} Number of keys deleted
 */
const invalidatePattern = (pattern) => {
  const keys = cache.keys();
  let deleted = 0;

  // Convert glob pattern to regex
  const regexPattern = pattern.replace(/\*/g, ".*");
  const regex = new RegExp(`^${regexPattern}$`);

  keys.forEach((key) => {
    if (regex.test(key)) {
      cache.del(key);
      deleted++;
    }
  });

  if (deleted > 0) {
    console.log(
      `🗑️  Cache invalidated by pattern '${pattern}': ${deleted} keys`
    );
  }

  return deleted;
};

/**
 * Clear all cache
 * @returns {Number} Number of keys deleted
 */
const clear = () => {
  const keyCount = cache.keys().length;
  cache.flushAll();
  console.log(`🗑️  All cache cleared: ${keyCount} keys`);
  return keyCount;
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const getStats = () => {
  const stats = cache.getStats();
  const keys = cache.keys();

  return {
    keys_count: keys.length,
    hits: stats.hits,
    misses: stats.misses,
    keys: stats.keys,
    ksize: stats.ksize,
    vsize: stats.vsize,
    sample_keys: keys.slice(0, 10), // Show first 10 keys
  };
};

// Log initialization
console.log("💾 Cache service initialized");
console.log(`   Default TTL: ${cache.options.stdTTL}s`);

module.exports = {
  KEYS,
  getCached,
  set,
  get,
  invalidate,
  invalidatePattern,
  clear,
  getStats,
};
