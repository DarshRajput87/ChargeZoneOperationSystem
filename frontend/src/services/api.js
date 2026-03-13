import axios from "axios";

const api = axios.create({
    baseURL: "https://api.chargezoneops.online/api"
});

export default api;