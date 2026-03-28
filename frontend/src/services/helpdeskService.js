const BASE = "https://api.chargezoneops.online/api/helpdesk";

export const getHelpdeskUsers = async () => {
    const res = await fetch(BASE);
    return res.json();
};

export const getClosedHelpdeskUsers = async () => {
    const res = await fetch(`${BASE}/closed`);
    return res.json();
};

export const updateAttendedBy = async (id, attendedBy) => {
    return fetch(`${BASE}/${id}/attended`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendedBy })
    });
};

export const updateTags = async (id, tags) => {
    return fetch(`${BASE}/${id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags })
    });
};

export const closeTicket = async (id) => {
    return fetch(`${BASE}/${id}/close`, {
        method: "PATCH"
    });
};

export const updateComment = async (id, comment) => {
    return fetch(`${BASE}/${id}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
    });
};