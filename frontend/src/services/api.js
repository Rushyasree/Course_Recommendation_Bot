import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function retryRequest(fn, maxRetries = 2, baseDelay = 500) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
    }
  }
}

export const endpoints = {
  chat: (payload) => retryRequest(() => api.post("/chat", payload)),
  dashboard: (userId, token) => api.get(token ? "/stats/dashboard" : `/stats/dashboard?user_id=${userId}`),
  roadmap: (userId, token) => api.get(token ? "/roadmap/timeline" : `/roadmap/timeline?user_id=${userId}`),
  updateRoadmapProgress: (payload) => api.post("/roadmap/progress", payload),
  courses: (params = {}) => api.get("/courses", { params }),
  feedback: (payload) => api.post("/courses/feedback", payload),
  personalization: (userId, token) => api.get(token ? "/courses/personalization" : `/courses/personalization?user_id=${userId}`),
  savedCourses: (userId, token) => api.get(token ? "/courses/saved" : `/courses/saved?user_id=${userId}`),
  saveCourse: (payload) => api.post("/courses/save", payload),
  profile: () => api.get("/auth/profile"),
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/register", payload),
  uploadResume: (formData) =>
    api.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default api;
