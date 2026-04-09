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
  me : () => api.post("/auth/me"),
  registerTherapist: (payload) => api.post("/auth/therapist-signup", {...payload})
};

export const journalService = {
  addEntry : (id, content, timestamp) => api.post("journal/addEntry", {id, content, timestamp}),
  getEntries: () => api.get("/journal/entries"),

  deleteJournal: (id) => api.delete(`/journal/${id}`),
};

export const appointmentService = {
  getAvailableSlots: (therapistId, date) =>
    api.get(`/appointments/slots`, { params: {therapistId, date} }),
  bookAppointment: (data) =>
    api.post('/appointments/book', { ...data }),
  getUserAppointments: () => api.get('/appointments/user'),
  getTherapistAppointments: () => api.get('/appointments/therapist'),
  saveRemarks: ({id, remarks}) => api.put("/appointments/remark", {id, remarks}), 

  cancelAppointment: (id) => api.delete(`/appointments/${id}`),
};

export const therapistService = {
  getTherapists: (searchTerm, specialization, mode, maxFee) => api.get(`/therapist/all`, {
    params: {
      searchTerm, specialization, mode, maxFee
    }
  }),

  getTherapistDetails: (id) =>
    api.get(`/therapists/${id}`),
};

export const communityService = {
  sendMessage: (message) => api.post("/community/message", {message}), 
  getMessages: () => api.get("/community/messages"),
  addReaction: (postId, reaction) =>
    api.post(`/community/posts/${postId}/react`, { reaction }),
  
  getPosts: () => api.get('/community/posts'),
  createPost: (content, isAnonymous) =>
    api.post('/community/posts', { content, isAnonymous }),
  deletePost: (id) => api.delete(`/community/posts/${id}`),
};  

export const moodService = {
  getMoodHistory: () => api.get('/mood/history'),
  analyzeMood: (text) =>
    api.post('/mood/analyze', { text }),
};

export const userService = {
  getUserStats: () => api.get('/user/stats'),
  storeAssessment: (data) => api.post("/user/assessment", {data}), 

  getUserProfile: () => api.get('/user/profile'),
  updateUserProfile: (data) =>
    api.put('/user/profile', data),
  
};
export const chatbotService = {
  sendMessage: (message) => api.post("/chatbot/message", {message}),
  getMessages: () => api.get("/chatbot/messages")
}

export default api;
