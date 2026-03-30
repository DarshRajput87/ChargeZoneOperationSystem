import API from "../../services/api";

export const connectCharger = (wsUrl) =>
    API.post(`/simulator/connect`, { wsUrl });

export const sendStatus = (status) =>
    API.post(`/simulator/status`, { status });

export const startTransaction = () =>
    API.post(`/simulator/start`);

export const stopTransaction = () =>
    API.post(`/simulator/stop`);

export const getLogs = () =>
    API.get(`/simulator/logs`);

export const createFaultScenario = (data) =>
    API.post(`/simulator/fault/create`, data);

export const getFaultScenarios = () =>
    API.get(`/simulator/fault/list`);

export const sendFaultScenario = (id) =>
    API.post(`/simulator/fault/send`, { id });

export const sendMeterValues = (payload) =>
    API.post(`/simulator/meter/values`, payload);

export const clearLogs = () =>
    API.delete(`/simulator/logs`);