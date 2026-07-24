/**
 * API Service Layer for Frontend
 * Handles all HTTP communication with the backend API
 */

import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Ticket Service
 */
export const ticketService = {
  // Get all tickets with optional filters and pagination
  getTickets: (params = {}) => {
    return api.get('/tickets', { params });
  },

  // Get single ticket by ID
  getTicketById: (id) => {
    return api.get(`/tickets/${id}`);
  },

  // Create new ticket
  createTicket: (ticketData) => {
    return api.post('/tickets', ticketData);
  },

  // Update existing ticket
  updateTicket: (id, ticketData) => {
    return api.put(`/tickets/${id}`, ticketData);
  },

  // Update ticket status specifically
  updateTicketStatus: (id, status) => {
    return api.patch(`/tickets/${id}/status`, { status });
  },

  // Delete ticket
  deleteTicket: (id) => {
    return api.delete(`/tickets/${id}`);
  },

  // Get tickets by status
  getTicketsByStatus: (status, params = {}) => {
    return api.get(`/tickets/status/${status}`, { params });
  },

  // Get tickets by assignee
  getTicketsByAssignee: (assignee, params = {}) => {
    return api.get(`/tickets/assignee/${assignee}`, { params });
  }
};

/**
 * Comment Service
 */
export const commentService = {
  // Get comments for a ticket
  getComments: (ticketId, params = {}) => {
    return api.get(`/tickets/${ticketId}/comments`, { params });
  },

  // Add comment to ticket
  addComment: (ticketId, commentData) => {
    return api.post(`/tickets/${ticketId}/comments`, commentData);
  },

  // Get comment by ID
  getCommentById: (id) => {
    return api.get(`/comments/${id}`);
  },

  // Update comment
  updateComment: (id, commentData) => {
    return api.put(`/comments/${id}`, commentData);
  },

  // Delete comment
  deleteComment: (id) => {
    return api.delete(`/comments/${id}`);
  },

  // Get recent comments
  getRecentComments: (params = {}) => {
    return api.get('/comments/recent', { params });
  },

  // Get comment statistics for ticket
  getCommentStats: (ticketId) => {
    return api.get(`/tickets/${ticketId}/comments/stats`);
  }
};

/**
 * Dashboard Service
 */
export const dashboardService = {
  // Get dashboard statistics
  getDashboardStats: (params = {}) => {
    return api.get('/dashboard/stats', { params });
  },

  // Get dashboard trends
  getDashboardTrends: (params = {}) => {
    return api.get('/dashboard/trends', { params });
  },

  // Get team dashboard
  getTeamDashboard: (teamId) => {
    return api.get(`/dashboard/team/${teamId}`);
  },

  // Get user dashboard
  getUserDashboard: (userId) => {
    return api.get(`/dashboard/user/${userId}`);
  }
};

/**
 * Auth Service
 */
export const authService = {
  // Login user
  login: (credentials) => {
    return api.post('/auth/login', credentials);
  },

  // Register user
  register: (userData) => {
    return api.post('/auth/register', userData);
  },

  // Refresh token
  refreshToken: () => {
    return api.post('/auth/refresh');
  },

  // Logout user
  logout: () => {
    return api.post('/auth/logout');
  },

  // Get current user profile
  getProfile: () => {
    return api.get('/auth/profile');
  },

  // Update user profile
  updateProfile: (userData) => {
    return api.put('/auth/profile', userData);
  }
};

// Default export
export default api;