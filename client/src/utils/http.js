import axios from 'axios';
import useAuthStore from '../stores/useAuthStore';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pending = [];

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const isAuthEndpoint =
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register') ||
      original.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pending.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return http.request(original);
          })
          .catch((err) => {
            useAuthStore.getState().logout();
            return Promise.reject(err);
          });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await http.post('/auth/refresh', {});
        const newToken = data?.accessToken;
        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken);
          pending.forEach((p) => p.resolve(newToken));
          pending = [];
          original.headers.Authorization = `Bearer ${newToken}`;
          return http.request(original);
        } else {
          throw new Error('No access token received');
        }
      } catch (e) {
        pending.forEach((p) => p.reject(e));
        pending = [];
        useAuthStore.getState().logout();
        throw e;
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default http;
