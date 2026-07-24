import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { dashboardService, ticketService } from '../../services/api'

// Initial state for dashboard
const initialState = {
  kpiMetrics: {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
  },
  ticketsByPriority: {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  },
  assignedTickets: [],
  recentTickets: [],
  loading: false,
  error: null,
}

// Async thunks for dashboard actions
export const fetchKPIMetrics = createAsyncThunk(
  'dashboard/fetchKPIMetrics',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getDashboardStats(params)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch KPI metrics')
    }
  }
)

export const fetchTicketsByPriority = createAsyncThunk(
  'dashboard/fetchTicketsByPriority',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getDashboardStats(params)
      return response.data.data.priorityBreakdown || {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch priority breakdown')
    }
  }
)

export const fetchAssignedTickets = createAsyncThunk(
  'dashboard/fetchAssignedTickets',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getUserDashboard(userId);
      return response.data.data.recentActivity || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assigned tickets');
    }
  }
);

export const fetchRecentTickets = createAsyncThunk(
  'dashboard/fetchRecentTickets',
  async ({ limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await ticketService.getTickets({ 
        limit, 
        sortBy: 'updatedDate',
        order: 'desc' 
      });
      return response.data.data.tickets || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recent tickets');
    }
  }
);

export const refreshDashboard = createAsyncThunk(
  'dashboard/refreshDashboard',
  async (userId, { dispatch, rejectWithValue }) => {
    try {
      // Fetch all dashboard data
      await Promise.all([
        dispatch(fetchKPIMetrics()),
        dispatch(fetchTicketsByPriority()),
        dispatch(fetchAssignedTickets(userId)),
        dispatch(fetchRecentTickets({ limit: 10 })),
      ])
      return true
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to refresh dashboard')
    }
  }
)

// Dashboard slice
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearDashboard: (state) => {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch KPI metrics cases
      .addCase(fetchKPIMetrics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchKPIMetrics.fulfilled, (state, action) => {
        state.loading = false
        state.kpiMetrics = action.payload
      })
      .addCase(fetchKPIMetrics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch tickets by priority cases
      .addCase(fetchTicketsByPriority.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchTicketsByPriority.fulfilled, (state, action) => {
        state.loading = false
        state.ticketsByPriority = action.payload
      })
      .addCase(fetchTicketsByPriority.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch assigned tickets cases
      .addCase(fetchAssignedTickets.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchAssignedTickets.fulfilled, (state, action) => {
        state.loading = false
        state.assignedTickets = action.payload
      })
      .addCase(fetchAssignedTickets.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch recent tickets cases
      .addCase(fetchRecentTickets.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchRecentTickets.fulfilled, (state, action) => {
        state.loading = false
        state.recentTickets = action.payload
      })
      .addCase(fetchRecentTickets.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Refresh dashboard cases
      .addCase(refreshDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(refreshDashboard.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(refreshDashboard.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearError, clearDashboard } = dashboardSlice.actions

export default dashboardSlice.reducer