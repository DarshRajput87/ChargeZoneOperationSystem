/**
 * ─── utils/dataFilters.js ────────────────────────────────────────────────────
 * Logic for filtering OCPI Master Data on the frontend.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Filter the master dataset based on user-selected criteria.
 * @param {object} data - The master fetch result { summary, modules, partners, failures, logs }
 * @param {object} filters - Active filters { module, party_id, status }
 */
export const filterMasterData = (data, filters) => {
    if (!data) return null;

    const { module, party_id, status } = filters;

    // 1. Filter Logs (The source of truth for trends and heatmap)
    const filteredLogs = data.logs.filter(log => {
        const matchModule = !module || log.module === module;
        const matchParty = !party_id || log.ocpiCredential === party_id || log.party_id === party_id;
        const matchStatus = !status || 
            (status === "success" && log.isSuccess === 1) || 
            (status === "failed" && log.isSuccess === 0);
        
        return matchModule && matchParty && matchStatus;
    });

    // 2. Filter Aggregates (For charts that use pre-aggregated data like partners/modules)
    // Note: If we want absolute precision, we could re-aggregate from filteredLogs here.
    // However, filtering the pre-aggregated arrays is efficient if logs are limited.
    
    const filteredModules = data.modules.filter(m => !module || m._id === module);
    
    const filteredPartners = data.partners.filter(p => 
        !party_id || p._id?.party_id === party_id || p._id?.partner_name === party_id
    );

    const filteredFailures = data.failures.filter(f => {
        const matchModule = !module || f._id?.includes(module);
        return matchModule;
    });

    // 3. Derived Summary from Aggregates (Not Logs!)
    // Ensures KPI cards match the actual backend totals even for large datasets.
    let derivedSummary = { total: 0, success: 0 };

    if (module) {
        // Find the specific module's totals
        const mod = data.modules.find(m => m._id === module);
        if (mod) {
            derivedSummary.total = mod.total || 0;
            derivedSummary.success = mod.success || 0;
        }
    } else if (party_id) {
        // Sum up totals for the selected party across all its entries
        filteredPartners.forEach(p => {
            derivedSummary.total += (p.total || 0);
            derivedSummary.success += (p.success || 0);
        });
    } else {
        // Use Global Summary
        derivedSummary.total = data.summary?.total || 0;
        derivedSummary.success = data.summary?.success || 0;
    }

    // 4. Handle Status Filter on Summary
    if (status === "success") {
        derivedSummary.total = derivedSummary.success;
    } else if (status === "failed") {
        derivedSummary.total = derivedSummary.total - derivedSummary.success;
        derivedSummary.success = 0;
    }

    return {
        summary: derivedSummary,
        modules: filteredModules,
        partners: filteredPartners,
        failures: filteredFailures,
        logs: filteredLogs
    };
};
