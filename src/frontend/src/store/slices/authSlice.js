import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services/api'

// Initial state for authentication
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
}

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null
    } catch (error) {
      console.warn('localStorage not available:', error)
      return null
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value)
      }
    } catch (error) {
      console.warn('localStorage not available:', error)
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn('localStorage not available:', error)
    }
  }
}

// Async thunks for authentication actions
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      // For demo purposes, accept demo/demo123 or any credentials
      if (credentials.username && credentials.password) {
        return {
          user: { 
            id: 1, 
            username: credentials.username, 
            email: `${credentials.username}@example.com`,
            fullName: credentials.username === 'demo' ? 'Demo User' : 'Test User',
            role: 'User'
          },
          token: 'demo-jwt-token-' + Date.now()
        }
      } else {
        throw new Error('Username and password are required')
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed')
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // Clear token from safe localStorage
      safeLocalStorage.removeItem('token')
      return true
    } catch (error) {
      // Even if there's an error, clear local storage
      safeLocalStorage.removeItem('token')
      return rejectWithValue(error.message || 'Logout failed')
    }
  }
)

export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = safeLocalStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const response = await authService.getProfile();
      return {
        user: response.data.data.user,
        token
      };
    } catch (error) {
      safeLocalStorage.removeItem('token');
      return rejectWithValue(error.response?.data?.message || 'Token verification failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(profileData)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Profile update failed')
    }
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await authService.changePassword(passwordData)
      return response
    } catch (error) {
      return rejectWithValue(error.message || 'Password change failed')
    }
  }
)

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCredentials: (state, action) => {
      const { user, token } = action.payload
      state.user = user
      state.token = token
      state.isAuthenticated = true
      safeLocalStorage.setItem('token', token)
    },
    clearCredentials: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      safeLocalStorage.removeItem('token')
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        safeLocalStorage.setItem('token', action.payload.token)
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        state.isAuthenticated = false
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.loading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        // Still clear credentials on logout error
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
      // Token verification cases
      .addCase(verifyToken.pending, (state) => {
        state.loading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
      })
      .addCase(verifyToken.rejected, (state) => {
        state.loading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        safeLocalStorage.setItem('token', action.payload.token)
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Update profile cases
      .addCase(updateProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user || action.payload
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Change password cases
      .addCase(changePassword.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false
        // Password change doesn't update user data
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearError, setCredentials, clearCredentials } = authSlice.actions

export default authSlice.reducer