import axios from "axios";
import toast from "react-hot-toast";

const API = axios.create({
  baseURL: "https://api.chargezoneops.online/api",
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const msg = error.response.data?.message;
      if (msg && msg.toLowerCase().includes("viewer")) {
        toast.error("Forbidden: You do not have permission to perform this action.", {
          duration: 4000,
          position: "top-center",
        });
      } else {
        toast.error(msg || "Forbidden action.");
      }
    }
    return Promise.reject(error);
  }
);

export default API;
