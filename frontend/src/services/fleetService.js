import axios from "axios";

const API = "http://13.232.112.152:5000/api";

export const getTenants = () =>
    axios.get(`${API}/fleet/tenants`);

export const getOcpiClients = () =>
    axios.get(`${API}/fleet/ocpi-clients`);

export const createFleet = (data) =>
    axios.post(`${API}/fleet/create`, data);