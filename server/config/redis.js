/**
 * Redis connection with graceful fallback.
 * If REDIS_URL is not set or connection fails, falls back to in-memory store.
 */

let redis = null;
let memoryStore = new Map();
let usingMemory = false;

function getRedis() {
  if (redis) return redis;

  if (!process.env.REDIS_URL) {
    console.log('[REDIS] No REDIS_URL set — using in-memory fallback');
    usingMemory = true;
    return createMemoryFallback();
  }

  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('[REDIS] Connection failed — falling back to in-memory');
          usingMemory = true;
          redis = createMemoryFallback();
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('connect', () => console.log('[REDIS] Connected'));
    redis.on('error', (err) => console.warn('[REDIS] Error:', err.message));

    return redis;
  } catch (err) {
    console.log('[REDIS] Module not available — using in-memory fallback');
    usingMemory = true;
    return createMemoryFallback();
  }
}

function createMemoryFallback() {
  return {
    async get(key) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiry && Date.now() > entry.expiry) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value) {
      memoryStore.set(key, { value, expiry: null });
      return 'OK';
    },
    async setex(key, seconds, value) {
      memoryStore.set(key, { value, expiry: Date.now() + seconds * 1000 });
      return 'OK';
    },
    async del(key) {
      memoryStore.delete(key);
      return 1;
    },
    async keys(pattern) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return [...memoryStore.keys()].filter((k) => regex.test(k));
    },
    isMemoryFallback: true,
  };
}

function isUsingMemory() {
  return usingMemory;
}

module.exports = { getRedis, isUsingMemory };
