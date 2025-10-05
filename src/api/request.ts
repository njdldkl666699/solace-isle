import axios from "axios";
import { useAppStore } from "../stores/appStore";
import {ElMessageBox} from "element-plus";

const appStore = useAppStore();

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "/api",
});

api.interceptors.request.use(
  (config) => {
    const token = appStore.token;
    if (token) {
      config.headers.Authentication = "Bearer " + token;
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
      ElMessageBox.alert('登录已过期，请重新登陆', '提示', {
          confirmButtonText: '确定',
          type: 'warning'
      }).then(() => {
          appStore.logout();
      });
    }
    return Promise.reject(error);
  }
);

export default api;
