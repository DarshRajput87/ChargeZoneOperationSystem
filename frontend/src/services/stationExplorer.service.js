import axios from "axios";

const BASE_URL = "http://13.232.112.152:5000/api/station-explorer";

export const fetchStations = async (search = "", page = 1, limit = 10) => {
  const res = await axios.get(BASE_URL, {
    params: { search, page, limit },
  });
  return res.data;
};

export const fetchChargers = async (stationId) => {
  const res = await axios.get(`${BASE_URL}/${stationId}/chargers`);
  return res.data;
};