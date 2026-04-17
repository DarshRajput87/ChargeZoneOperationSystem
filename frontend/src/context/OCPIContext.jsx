import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import API from "../services/api";

const OCPIContext = createContext();

const getLocalYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const OCPIProvider = ({ children }) => {
    const [masterData, setMasterData] = useState(null);
    const [parties, setParties] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const queryCache = useRef({});

    const [filters, setFilters] = useState({
        date: getLocalYMD(),
        booking_type: "ocpi",
        limit: 2000, 
        module: "",
        party_id: "",
        tenant_id: "",
        status: ""
    });

    const setFilter = useCallback((key, val) => {
        setFilters(f => ({ ...f, [key]: val }));
    }, []);

    // Fetch data whenever ANY filter changes, relying on UI-layer query caching for speed
    const fetchData = useCallback(async (customFilters = filters) => {
        try {
            const cacheKey = JSON.stringify(customFilters);
            // 1. INSTANT O(0) UI Cache Retrieval
            if (queryCache.current[cacheKey]) {
                setMasterData(queryCache.current[cacheKey]);
                return;
            }

            setLoading(true);
            setError(null);

            // 2. BACKEND API Aggregation Delegation
            let query = `?date=${customFilters.date}&limit=${customFilters.limit}&booking_type=${customFilters.booking_type}`;
            if (customFilters.module && customFilters.module !== "all") query += `&module=${customFilters.module}`;
            if (customFilters.party_id && customFilters.party_id !== "all") query += `&party_id=${customFilters.party_id}`;
            if (customFilters.tenant_id && customFilters.tenant_id !== "all") query += `&tenant_id=${customFilters.tenant_id}`;
            if (customFilters.status && customFilters.status !== "all") query += `&status=${customFilters.status}`;

            const base = "/ocpi-analytics";

            const [statsR, logsR, tsR] = await Promise.all([
                API.get(`${base}/dashboard-stats${query}`),
                API.get(`${base}/logs${query}`),
                API.get(`${base}/time-series${query}`)
            ]);

            const dashboardStats = statsR.data?.data || {};

            const newData = {
                summary: dashboardStats.summary?.[0] || { total: 0, success: 0 },
                modules: dashboardStats.modules || [],
                partners: dashboardStats.partners || [],
                failures: dashboardStats.failures || [],
                logs: logsR.data?.data || [],
                timeSeries: tsR.data?.data || []
            };

            // 3. Populate memory cache
            queryCache.current[cacheKey] = newData;
            setMasterData(newData);
        } catch (err) {
            console.error("OCPI Fetch Error:", err);
            setError("Unable to reach the OCPI API.");
        } finally {
            setLoading(false);
        }
    }, [filters]); 

    const value = useMemo(() => ({
        masterData,
        parties,
        tenants,
        loading,
        error,
        filters,
        setFilter,
        fetchData
    }), [masterData, parties, tenants, loading, error, filters, setFilter, fetchData]);

    useEffect(() => {
        API.get("/ocpi-analytics/all-parties").then(res => setParties(res.data.data || [])).catch(console.error);
        API.get("/ocpi-analytics/tenants").then(res => setTenants(res.data.data || [])).catch(console.error);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <OCPIContext.Provider value={value}>
            {children}
        </OCPIContext.Provider>
    );
};

export const useOCPI = () => {
    const context = useContext(OCPIContext);
    if (!context) {
        throw new Error("useOCPI must be used within an OCPIProvider");
    }
    return context;
};
