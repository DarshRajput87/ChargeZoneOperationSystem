import API from "./api";

export const searchUsers = async (query) => {
    const res = await API.get(`/customers/search?query=${encodeURIComponent(query)}`);
    return res.data;
};

export const getUserDetails = async (userId, { page = 1, limit = 10, startDate, endDate } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const res = await API.get(`/customers/${userId}?${params.toString()}`);
    return res.data;
};
