import axios from "axios";

const API = "https://api.chargezoneops.online/api/simulator";

export const connectCharger = (wsUrl) =>
    axios.post(`${API}/connect`, { wsUrl });

export const sendStatus = (status) =>
    axios.post(`${API}/status`, { status });

export const startTransaction = () =>
    axios.post(`${API}/start`);

export const stopTransaction = () =>
    axios.post(`${API}/stop`);

export const getLogs = () =>
    axios.get(`${API}/logs`);

export const createFaultScenario = (data) =>
    axios.post(`${API}/fault/create`, data);

export const getFaultScenarios = () =>
    axios.get(`${API}/fault/list`);

export const sendFaultScenario = (id) =>
    axios.post(`${API}/fault/send`, { id });

export const sendMeterValues = (payload) =>
    axios.post(`${API}/meter/values`, payload);