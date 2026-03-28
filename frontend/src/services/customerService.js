const BASE = "https://api.chargezoneops.online/api/customers";

export const searchUsers = async (query) => {
    const res = await fetch(`${BASE}/search?query=${encodeURIComponent(query)}`);
    return res.json();
};

export const getUserDetails = async (userId, { page = 1, limit = 10, startDate, endDate } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const res = await fetch(`${BASE}/${userId}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch user details");
    return res.json();
};
