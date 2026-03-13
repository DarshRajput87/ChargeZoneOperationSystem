import axios from "axios";

const API = axios.create({
  baseURL: "http://13.232.112.152:5000/api",
});

export const loginUser = async (email, password) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};