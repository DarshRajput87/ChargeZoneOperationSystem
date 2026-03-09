import axios from "axios";

const VITE_API_URL = import.meta.env.VITE_API_URL;

const API = axios.create({
  baseURL: `${VITE_API_URL}/api`,
});

export const loginUser = async (email, password) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};