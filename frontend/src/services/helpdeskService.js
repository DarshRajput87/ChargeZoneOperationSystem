import API from "./api";

export const getHelpdeskUsers = async () => {
    const res = await API.get("/helpdesk");
    return res.data;
};

export const getClosedHelpdeskUsers = async () => {
    const res = await API.get("/helpdesk/closed");
    return res.data;
};

export const updateAttendedBy = async (id, attendedBy) => {
    return API.patch(`/helpdesk/${id}/attended`, { attendedBy });
};

export const updateTags = async (id, tags) => {
    return API.patch(`/helpdesk/${id}/tags`, { tags });
};

export const closeTicket = async (id) => {
    return API.patch(`/helpdesk/${id}/close`);
};

export const updateComment = async (id, comment) => {
    return API.patch(`/helpdesk/${id}/comment`, { comment });
};