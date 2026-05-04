import axios from "axios";
import toast from "react-hot-toast";
import { tokenStore } from "./tokenStore";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          "/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        tokenStore.set(data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        tokenStore.clear();
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.detail || error.message || "Something went wrong";
    toast.error(message);
    return Promise.reject(error);
  }
);

export const uploadVideo = async (
  file: File,
  onProgress?: (pct: number) => void
) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<{ analysis_id: string }>("/analyses/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
};

export const analyzeUrl = (url: string) =>
  api.post<{ analysis_id: string }>("/analyses/url", { url }).then((r) => r.data);

export const cancelAnalysis = (id: string) =>
  api.post(`/analyses/${id}/cancel`);

export const getAnalysisResult = (id: string) =>
  api.get(`/analyses/${id}`).then((r) => r.data);

export const getAnalysisHistory = () =>
  api.get("/analyses").then((r) => r.data);

export const exportReport = (id: string, format: "pdf" | "json") =>
  api.get(`/reports/export/${format}/${id}`, { responseType: "blob" });

export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (token: string, new_password: string) =>
  api.post("/auth/reset-password", { token, new_password });

export const resendVerification = () =>
  api.post("/auth/resend-verification");
