import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { ticketService, commentService } from '../../services/api'

// Initial state for tickets
const initialState = {
  tickets: [],
  currentTicket: null,
  loading: false,
  commentLoading: false,
  error: null,
  filters: {
    status: '',
    priority: '',
    assignee: '',
    search: '',
  },
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalPages: 0,
    totalCount: 0,
  },
}

// Async thunks for ticket actions
export const fetchTickets = createAsyncThunk(
  'tickets/fetchTickets',
  async ({ page = 1, pageSize = 10, filters = {} }, { rejectWithValue }) => {
    try {
      const response = await ticketService.getTickets({
        page,
        limit: pageSize,
        ...filters
      });
      
      return {
        tickets: response.data.data.tickets,
        totalCount: response.data.data.pagination.totalCount,
        totalPages: response.data.data.pagination.totalPages,
        currentPage: response.data.data.pagination.currentPage,
        pageSize
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tickets');
    }
  }
);

export const fetchTicketById = createAsyncThunk(
  'tickets/fetchTicketById',
  async (ticketId, { rejectWithValue }) => {
    try {
      const response = await ticketService.getTicketById(ticketId);
      const { ticket, comments } = response.data.data;
      return { ...ticket, comments: comments || [] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch ticket');
    }
  }
);

export const createTicket = createAsyncThunk(
  'tickets/createTicket',
  async (ticketData, { rejectWithValue }) => {
    try {
      const response = await ticketService.createTicket(ticketData);
      return response.data.data.ticket;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create ticket');
    }
  }
);

export const updateTicket = createAsyncThunk(
  'tickets/updateTicket',
  async ({ ticketId, updates }, { rejectWithValue }) => {
    try {
      const response = await ticketService.updateTicket(ticketId, updates);
      return response.data.data.ticket;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update ticket');
    }
  }
);

export const deleteTicket = createAsyncThunk(
  'tickets/deleteTicket',
  async (ticketId, { rejectWithValue }) => {
    try {
      await ticketService.deleteTicket(ticketId);
      return ticketId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete ticket');
    }
  }
);

export const addComment = createAsyncThunk(
  'tickets/addComment',
  async ({ ticketId, content, author }, { rejectWithValue }) => {
    try {
      const response = await commentService.addComment(ticketId, { content, author });
      return response.data.data.comment;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

// Tickets slice
const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearFilters: (state) => {
      state.filters = initialState.filters
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload
    },
    setPageSize: (state, action) => {
      state.pagination.pageSize = action.payload
    },
    clearCurrentTicket: (state) => {
      state.currentTicket = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tickets cases
      .addCase(fetchTickets.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.loading = false
        state.tickets = action.payload.tickets
        state.pagination = {
          currentPage: action.payload.currentPage,
          pageSize: action.payload.pageSize,
          totalPages: action.payload.totalPages,
          totalCount: action.payload.totalCount,
        }
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch ticket by ID cases
      .addCase(fetchTicketById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTicketById.fulfilled, (state, action) => {
        state.loading = false
        state.currentTicket = action.payload
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create ticket cases
      .addCase(createTicket.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.loading = false
        state.tickets.unshift(action.payload) // Add to beginning of list
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Update ticket cases
      .addCase(updateTicket.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateTicket.fulfilled, (state, action) => {
        state.loading = false
        const index = state.tickets.findIndex(ticket => ticket.id === action.payload.id)
        if (index !== -1) {
          state.tickets[index] = { ...state.tickets[index], ...action.payload }
        }
        if (state.currentTicket && state.currentTicket.id === action.payload.id) {
          state.currentTicket = { ...state.currentTicket, ...action.payload }
        }
      })
      .addCase(updateTicket.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Delete ticket cases
      .addCase(deleteTicket.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteTicket.fulfilled, (state, action) => {
        state.loading = false
        state.tickets = state.tickets.filter(ticket => ticket.id !== action.payload)
        if (state.currentTicket && state.currentTicket.id === action.payload) {
          state.currentTicket = null
        }
      })
      .addCase(deleteTicket.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Add comment cases
      .addCase(addComment.pending, (state) => {
        state.commentLoading = true
        state.error = null
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.commentLoading = false
        if (state.currentTicket) {
          if (!Array.isArray(state.currentTicket.comments)) {
            state.currentTicket.comments = []
          }
          state.currentTicket.comments.push(action.payload)
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.commentLoading = false
        state.error = action.payload
      })
  },
})

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentPage,
  setPageSize,
  clearCurrentTicket,
} = ticketsSlice.actions

export default ticketsSlice.reducer