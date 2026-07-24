import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or Redux store
    const token = localStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log request in development
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        headers: config.headers,
        data: config.data,
      })
    }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      })
    }
    
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // Handle 401 Unauthorized responses
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      // Clear token and redirect to login
      localStorage.removeItem('token')
      
      // Dispatch logout action if Redux store is available
      if (window.__REDUX_STORE__) {
        window.__REDUX_STORE__.dispatch({ type: 'auth/clearCredentials' })
      }
      
      // Redirect to login page
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      
      return Promise.reject(error)
    }
    
    // Handle network errors
    if (!error.response) {
      error.message = 'Network error - please check your internet connection'
    } else {
      // Format error message from response
      const errorMessage = error.response.data?.message || 
                          error.response.data?.error || 
                          error.message || 
                          'An unexpected error occurred'
      error.message = errorMessage
    }
    
    // Log error in development
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      console.error('API Error:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url,
        data: error.response?.data,
      })
    }
    
    return Promise.reject(error)
  }
)

/**
 * Ticket Service
 */
export const ticketService = {
  getTickets: (params = {}) => api.get('/tickets', { params }),
  getTicketById: (id) => api.get(`/tickets/${id}`),
  createTicket: (ticketData) => api.post('/tickets', ticketData),
  updateTicket: (id, ticketData) => api.put(`/tickets/${id}`, ticketData),
  updateTicketStatus: (id, status) => api.patch(`/tickets/${id}/status`, { status }),
  deleteTicket: (id) => api.delete(`/tickets/${id}`),
  getTicketsByStatus: (status, params = {}) => api.get(`/tickets/status/${status}`, { params }),
  getTicketsByAssignee: (assignee, params = {}) => api.get(`/tickets/assignee/${assignee}`, { params }),
}

/**
 * Comment Service
 */
export const commentService = {
  getComments: (ticketId, params = {}) => api.get(`/tickets/${ticketId}/comments`, { params }),
  addComment: (ticketId, commentData) => api.post(`/tickets/${ticketId}/comments`, commentData),
  getCommentById: (id) => api.get(`/comments/${id}`),
  updateComment: (id, commentData) => api.put(`/comments/${id}`, commentData),
  deleteComment: (id) => api.delete(`/comments/${id}`),
  getRecentComments: (params = {}) => api.get('/comments/recent', { params }),
  getCommentStats: (ticketId) => api.get(`/tickets/${ticketId}/comments/stats`),
}

/**
 * Dashboard Service
 */
export const dashboardService = {
  getDashboardStats: (params = {}) => api.get('/dashboard/stats', { params }),
  getDashboardTrends: (params = {}) => api.get('/dashboard/trends', { params }),
  getTeamDashboard: (teamId) => api.get(`/dashboard/team/${teamId}`),
  getUserDashboard: (userId) => api.get(`/dashboard/user/${userId}`),
}

/**
 * Auth Service
 */
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
}

// Helper function to handle API responses
export const handleApiResponse = (response) => {
  return response.data
}

// Helper function to handle API errors
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const errorMessage = error.response.data?.message || 
                        error.response.data?.error || 
                        `HTTP ${error.response.status}: ${error.response.statusText}`
    
    throw new Error(errorMessage)
  } else if (error.request) {
    // Network error
    throw new Error('Network error - please check your internet connection')
  } else {
    // Other error
    throw new Error(error.message || 'An unexpected error occurred')
  }
}

export default api