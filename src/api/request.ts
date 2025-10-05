import axios from "axios";
import { useAppStore } from "../stores/appStore";
import { ElMessage } from "element-plus";

const appStore = useAppStore();

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "/api",
});

api.interceptors.request.use(
  (config) => {
    const token = appStore.token;
    if (token) {
      config.headers.Authorization = "Bearer " + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      ElMessage.error("登录认证失败，请重新登录");
      appStore.logout();
    }
    return Promise.reject(error);
  }
);

export default api;
