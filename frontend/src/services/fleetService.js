import axios from "axios";

const API = "https://api.chargezoneops.online/api";

export const getTenants = () =>
    axios.get(`${API}/fleet/tenants`);

export const getOcpiClients = () =>
    axios.get(`${API}/fleet/ocpi-clients`);

export const createFleet = (data) =>
    axios.post(`${API}/fleet/create`, data);