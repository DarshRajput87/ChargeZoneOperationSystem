import API from "./api";

export const fetchStations = async (search = "", page = 1, limit = 10) => {
  const res = await API.get("/station-explorer", {
    params: { search, page, limit },
  });
  return res.data;
};

export const fetchChargers = async (stationId) => {
  const res = await API.get(`/station-explorer/${stationId}/chargers`);
  return res.data;
};