import axios from "axios";

const API = axios.create({
  baseURL: `${API_URL}/api`,
});

export const loginUser = async (email, password) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};