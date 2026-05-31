import axios from "axios";
import { supabase } from "./supabase";
import { API_URL } from "./config";

const DB_UNAVAILABLE_MSG =
  "Database is temporarily unavailable. Please try again in a moment.";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token interceptor to attach JWT to all requests
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Normalize server errors — callers still catch/reject; avoids opaque 500 noise in UI.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    if (status === 503 && detail) {
      error.message = typeof detail === "string" ? detail : DB_UNAVAILABLE_MSG;
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: async (email, password, name) => {
    const response = await apiClient.post("/auth/register", {
      email,
      password,
      name,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  resetPassword: async (email) => {
    const response = await apiClient.post("/auth/reset-password", {
      email,
    });
    return response.data;
  },

  updatePassword: async (oldPassword, newPassword) => {
    const response = await apiClient.post("/auth/update-password", {
      oldPassword,
      newPassword,
    });
    return response.data;
  },
};

// Profile API endpoints
export const profileAPI = {
  getProfile: async () => {
    const response = await apiClient.get("/profile");
    return response.data;
  },

  createOrUpdateProfile: async (profileData) => {
    const response = await apiClient.post("/profile", profileData);
    return response.data;
  },

  getProfileById: async (userId) => {
    const response = await apiClient.get(`/profile/${userId}`);
    return response.data;
  },
};

// Test Results API endpoints
export const testResultsAPI = {
  getResults: async () => {
    const response = await apiClient.get("/test-results");
    return response.data;
  },

  createResult: async (resultData) => {
    const response = await apiClient.post("/test-results", resultData);
    return response.data;
  },

  getResultById: async (resultId) => {
    const response = await apiClient.get(`/test-results/${resultId}`);
    return response.data;
  },

  updateResult: async (resultId, resultData) => {
    const response = await apiClient.put(`/test-results/${resultId}`, resultData);
    return response.data;
  },

  deleteResult: async (resultId) => {
    const response = await apiClient.delete(`/test-results/${resultId}`);
    return response.data;
  },
};

// Onboarding API endpoints
export const onboardingAPI = {
  getStatus: async () => {
    const response = await apiClient.get("/api/onboarding/status");
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get("/api/onboarding");
    return response.data;
  },

  saveProfile: async (profileData) => {
    const response = await apiClient.post("/api/onboarding", profileData);
    return response.data;
  },

  skipProfile: async () => {
    const response = await apiClient.post("/api/onboarding/skip");
    return response.data;
  },
};

// User API endpoints
export const userAPI = {
  getCurrentUser: async () => {
    const response = await apiClient.get("/user/me");
    return response.data;
  },

  updateUser: async (userData) => {
    const response = await apiClient.put("/user/me", userData);
    return response.data;
  },
};

// Notify API endpoints
export const notifyAPI = {
  loginNotify: async () => {
    try {
      await apiClient.post("/api/notify/login");
    } catch {
      // Never block the login flow if this fails
    }
  },
};

// Plan API endpoints
export const planAPI = {
  getPlan: async () => {
    const response = await apiClient.get("/api/plan");
    return response.data;
  },
  setPlan: async (plan) => {
    const response = await apiClient.put("/api/plan", { plan });
    return response.data;
  },
};

// AI Chat API endpoints
export const chatAPI = {
  // Conversations
  listConversations: async () => {
    const response = await apiClient.get("/api/chat/conversations");
    return response.data;
  },
  createConversation: async (title = "New Chat") => {
    const response = await apiClient.post("/api/chat/conversations", { title });
    return response.data;
  },
  renameConversation: async (convId, title) => {
    const response = await apiClient.patch(`/api/chat/conversations/${convId}`, { title });
    return response.data;
  },
  deleteConversation: async (convId) => {
    await apiClient.delete(`/api/chat/conversations/${convId}`);
  },

  // Messages
  listMessages: async (convId) => {
    const response = await apiClient.get(`/api/chat/conversations/${convId}/messages`);
    return response.data;
  },
  sendMessage: async (convId, content) => {
    const response = await apiClient.post(`/api/chat/conversations/${convId}/messages`, { content });
    return response.data;
  },

  // Profile update from chat
  updateProfileField: async (field, value) => {
    const response = await apiClient.patch("/api/chat/update-profile-field", { field, value });
    return response.data;
  },
};


export default apiClient;
