/**
 * ========================================
 * CACHE MIDDLEWARE
 * ========================================
 * In-memory caching using node-cache
 * Reduces Firestore reads and improves response time
 */

const NodeCache = require("node-cache");

// Initialize cache with configuration
const cache = new NodeCache({
  stdTTL: 60, // Default: 60 seconds
  checkperiod: 120, // Check for expired keys every 120 seconds
  useClones: false, // Performance: Don't clone objects
  deleteOnExpire: true, // Auto-delete expired keys
});

/**
 * Cache statistics for monitoring
 */
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  startTime: Date.now(),
};

/**
 * Cache middleware factory
 * @param {Number} duration - Cache duration in seconds
 * @param {Function} keyGenerator - Optional custom key generator
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (duration = 60, keyGenerator = null) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Generate cache key
    const key = keyGenerator
      ? keyGenerator(req)
      : `${req.method}:${req.originalUrl || req.url}`;

    // Check if response is cached
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      stats.hits++;
      const hitRate = (
        (stats.hits / (stats.hits + stats.misses)) *
        100
      ).toFixed(2);

      console.log(
        `🎯 Cache HIT: ${key} | Hit rate: ${hitRate}% (${stats.hits}/${
          stats.hits + stats.misses
        })`
      );

      // Return cached response
      return res.json(cachedResponse);
    }

    // Cache miss - continue to controller
    stats.misses++;
    console.log(`❌ Cache MISS: ${key} | Total misses: ${stats.misses}`);

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, duration);
        stats.sets++;
        console.log(
          `💾 Cached: ${key} | TTL: ${duration}s | Total cached keys: ${
            cache.keys().length
          }`
        );
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Clear cache for specific pattern
 * @param {String} pattern - URL pattern to clear (e.g., '/api/dashboard')
 * @returns {Number} Number of keys deleted
 */
const clearCache = (pattern = null) => {
  if (pattern) {
    const keys = cache.keys();
    const keysToDelete = keys.filter((key) => key.includes(pattern));

    keysToDelete.forEach((key) => cache.del(key));

    console.log(
      `🗑️  Cleared ${keysToDelete.length} cache entries matching: ${pattern}`
    );
    return keysToDelete.length;
  } else {
    const keyCount = cache.keys().length;
    cache.flushAll();
    console.log(`🗑️  Cleared all cache (${keyCount} entries)`);
    return keyCount;
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const getCacheStats = () => {
  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const cacheKeys = cache.keys();

  return {
    hits: stats.hits,
    misses: stats.misses,
    sets: stats.sets,
    total_requests: totalRequests,
    hit_rate: `${hitRate.toFixed(2)}%`,
    hit_rate_numeric: hitRate,
    keys_count: cacheKeys.length,
    uptime_seconds: uptime,
    memory_stats: cache.getStats(),
    cache_keys: cacheKeys.slice(0, 20), // Show first 20 keys
  };
};

/**
 * Invalidate cache on data change
 * Use this in controllers after POST/PUT/DELETE operations
 * @param {Array<String>} patterns - Array of URL patterns to invalidate
 * @returns {Number} Total entries cleared
 */
const invalidateCache = (patterns = []) => {
  let totalCleared = 0;

  patterns.forEach((pattern) => {
    totalCleared += clearCache(pattern);
  });

  if (totalCleared > 0) {
    console.log(`♻️  Cache invalidation: ${totalCleared} entries cleared`);
  }

  return totalCleared;
};

/**
 * Reset cache statistics
 */
const resetStats = () => {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.startTime = Date.now();
  console.log("📊 Cache statistics reset");
};

// Log cache initialization
console.log("💾 Cache middleware initialized");
console.log(`   Default TTL: ${cache.options.stdTTL}s`);
console.log(`   Check period: ${cache.options.checkperiod}s`);

module.exports = {
  cacheMiddleware,
  clearCache,
  getCacheStats,
  invalidateCache,
  resetStats,
  cache, // Export cache instance for direct access if needed
};
