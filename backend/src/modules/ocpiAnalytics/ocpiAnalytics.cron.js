const cron = require("node-cron");
const cacheUtil = require("./ocpiAnalytics.cache");
const service = require("./ocpiAnalytics.service");

/**
 * Maps endpoint names to their service methods.
 */
const serviceMap = {
    summary: service.getSummary,
    modules: service.getModuleStats,
    partners: service.getPartnerStats,
    failures: service.getFailureStats,
    logs: service.getLogs
};

/**
 * Background refresh logic.
 * Iterates through all keys currently in the cache and re-fetches them.
 */
const refreshActiveCache = async () => {
    // console.log("[CRON] Starting OCPI Analytics cache refresh...");
    const keys = cacheUtil.getActiveKeys();

    for (const key of keys) {
        try {
            const [endpoint, queryStr] = key.split(":");
            const query = JSON.parse(queryStr);
            const serviceMethod = serviceMap[endpoint];

            if (serviceMethod) {
                const newData = await serviceMethod(global.cmsDb, query);
                cacheUtil.set(key, newData);
                // console.log(`[CRON] Refreshed: ${key}`);
            }
        } catch (err) {
            console.error(`[CRON Error] Failed to refresh ${key}:`, err.message);
        }
    }
    // console.log("[CRON] Cache refresh complete.");
};

/**
 * Schedule: Disabled to clear caching mismatch behaviors.
 */
const initCron = () => {
    // cron.schedule("0 * * * *", () => {
    //     refreshActiveCache();
    // });
    // console.log("[CRON] Cache refresh disabled to enforce Live API consistency.");
};

module.exports = {
    initCron,
    refreshActiveCache
};
