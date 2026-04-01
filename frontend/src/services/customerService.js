import API from "./api";

export const searchUsers = async (query, filters = {}, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.segment) params.append("segment", filters.segment);
    if (filters.hasFeedback) params.append("hasFeedback", "true");
    if (filters.ratings && filters.ratings.length > 0) {
        params.append("ratings", filters.ratings.join(","));
    }
    params.append("page", page);
    params.append("limit", limit);

    const res = await API.get(`/customers/search?${params.toString()}`);
    return res.data;
};

export const getUserDetails = async (userId, { page = 1, limit = 10, startDate, endDate } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const res = await API.get(`/customers/${userId}?${params.toString()}`);
    return res.data;
};
