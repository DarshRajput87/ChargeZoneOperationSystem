import axios from "axios";

const API = "http://localhost:5000/api";

export const getTenants = () =>
    axios.get(`${API}/fleet/tenants`);

export const getOcpiClients = () =>
    axios.get(`${API}/fleet/ocpi-clients`);

export const createFleet = (data) =>
    axios.post(`${API}/fleet/create`, data);