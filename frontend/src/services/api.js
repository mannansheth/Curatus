import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  signup: (email, password, name) =>
    api.post('/auth/signup', { email, password, name }),
  logout: () => api.post('/auth/logout'),
  me : () => api.post("/auth/me")
};

export const journalService = {
  submitJournal: (content) =>
    api.post('/journal/submit', { content }),
  getJournals: () => api.get('/journal/list'),
  deleteJournal: (id) => api.delete(`/journal/${id}`),
  addEntry : (id, content, timestamp) => api.post("journal/addEntry", {id, content, timestamp}),
  getEntries: () => api.get("/journal/entries")
};

export const appointmentService = {
  getAvailableSlots: (therapistId, date) =>
    api.get(`/appointments/available`, { params: { therapistId, date } }),
  bookAppointment: (therapistId, date, time) =>
    api.post('/appointments/book', { therapistId, date, time }),
  getAppointments: () => api.get('/appointments/list'),
  cancelAppointment: (id) => api.delete(`/appointments/${id}`),
};

export const therapistService = {
  getTherapists: (filters) =>
    api.get('/therapists', { params: filters }),
  getTherapistDetails: (id) =>
    api.get(`/therapists/${id}`),
};

export const communityService = {
  sendMessage: (message) => api.post("/community/message", {message}), 
  getMessages: () => api.get("/community/messages"),
  getPosts: () => api.get('/community/posts'),
  createPost: (content, isAnonymous) =>
    api.post('/community/posts', { content, isAnonymous }),
  addReaction: (postId, reaction) =>
    api.post(`/community/posts/${postId}/react`, { reaction }),
  deletePost: (id) => api.delete(`/community/posts/${id}`),
};  

export const moodService = {
  getMoodHistory: () => api.get('/mood/history'),
  analyzeMood: (text) =>
    api.post('/mood/analyze', { text }),
};

export const userService = {
  getUserProfile: () => api.get('/user/profile'),
  updateUserProfile: (data) =>
    api.put('/user/profile', data),
  getUserStats: () => api.get('/user/stats'),
};

export default api;
