import axios from "axios";

const API = "https://api.chargezoneops.online/api";

export const getTenants = () =>
    axios.get(`${API}/fleet/tenants`);

export const getOcpiClients = (tenant_id) =>
    axios.get(`${API}/fleet/ocpi-clients`, { params: tenant_id ? { tenant_id } : {} });

export const getExistingFleets = (tenant_id) =>
    axios.get(`${API}/fleet/existing-fleets`, { params: { tenant_id } });

export const createFleet = (data) =>
    axios.post(`${API}/fleet/create`, data);