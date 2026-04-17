/**
 * ─── ocpiAnalytics.cache.js ──────────────────────────────────────────────────
 * Simple in-memory cache for OCPI Analytics aggregated responses.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const cache = new Map();
const activeKeys = new Set(); // Track keys that have been requested

/**
 * Generates a cache key based on the endpoint and query parameters.
 * @param {string} endpoint - The API endpoint (e.g., 'summary', 'modules')
 * @param {object} query - The request query parameters
 * @returns {string}
 */
const generateKey = (endpoint, query) => {
    return `${endpoint}:${JSON.stringify(query)}`;
};

/**
 * Retrieves data from the cache.
 */
const get = (key) => {
    return cache.get(key);
};

/**
 * Stores data in the cache and tracks the key for background refresh.
 */
const set = (key, data) => {
    cache.set(key, data);
    activeKeys.add(key);
};

/**
 * Returns all active keys currently in the cache.
 */
const getActiveKeys = () => Array.from(activeKeys);

/**
 * Clears a specific key or everything.
 */
const clear = (key = null) => {
    if (key) {
        cache.delete(key);
        activeKeys.delete(key);
    } else {
        cache.clear();
        activeKeys.clear();
    }
};

module.exports = {
    generateKey,
    get,
    set,
    getActiveKeys,
    clear
};
