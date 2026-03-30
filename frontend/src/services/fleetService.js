import API from "./api";

export const getTenants = () =>
    API.get(`/fleet/tenants`);

export const getOcpiClients = (tenant_id) =>
    API.get(`/fleet/ocpi-clients`, { params: tenant_id ? { tenant_id } : {} });

export const getExistingFleets = (tenant_id) =>
    API.get(`/fleet/existing-fleets`, { params: { tenant_id } });

export const createFleet = (data) =>
    API.post(`/fleet/create`, data);