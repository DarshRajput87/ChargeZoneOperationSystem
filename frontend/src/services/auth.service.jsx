import axios from "axios";

const API = axios.create({
  baseURL: "https://api.chargezoneops.online/api",
});

export const loginUser = async (email, password) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};