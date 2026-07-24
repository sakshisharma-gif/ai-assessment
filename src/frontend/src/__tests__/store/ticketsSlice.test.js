import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import ticketsReducer, {
  setFilters,
  clearFilters,
  setCurrentPage,
  clearCurrentTicket,
  fetchTickets,
  createTicket,
  addComment,
} from '../../store/slices/ticketsSlice'

// Test store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      tickets: ticketsReducer,
    },
  })
}

describe('Tickets Slice', () => {
  let store

  beforeEach(() => {
    store = createTestStore()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().tickets
      expect(state).toEqual({
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
      })
    })
  })

  describe('reducers', () => {
    it('should set filters', () => {
      const newFilters = {
        status: 'Open',
        priority: 'High',
      }

      store.dispatch(setFilters(newFilters))
      const state = store.getState().tickets

      expect(state.filters.status).toBe('Open')
      expect(state.filters.priority).toBe('High')
      expect(state.filters.assignee).toBe('') // Should remain unchanged
    })

    it('should clear filters', () => {
      // First set some filters
      store.dispatch(setFilters({ status: 'Open', priority: 'High' }))
      
      // Then clear them
      store.dispatch(clearFilters())
      const state = store.getState().tickets

      expect(state.filters).toEqual({
        status: '',
        priority: '',
        assignee: '',
        search: '',
      })
    })

    it('should set current page', () => {
      store.dispatch(setCurrentPage(3))
      const state = store.getState().tickets

      expect(state.pagination.currentPage).toBe(3)
    })

    it('should clear current ticket', () => {
      // First set a current ticket (simulate fetchTicketById.fulfilled)
      const mockTicket = { id: 1, title: 'Test Ticket' }
      const initialState = {
        tickets: [],
        currentTicket: mockTicket,
        loading: false,
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

      store = configureStore({
        reducer: { tickets: ticketsReducer },
        preloadedState: { tickets: initialState },
      })

      store.dispatch(clearCurrentTicket())
      const state = store.getState().tickets

      expect(state.currentTicket).toBeNull()
    })
  })

  describe('async thunks', () => {
    it('should handle fetchTickets.pending', () => {
      store.dispatch(fetchTickets.pending(''))
      const state = store.getState().tickets

      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should handle fetchTickets.fulfilled', () => {
      const mockResponse = {
        tickets: [
          { id: 1, title: 'Test Ticket 1', status: 'Open' },
          { id: 2, title: 'Test Ticket 2', status: 'Closed' },
        ],
        totalCount: 2,
        totalPages: 1,
        currentPage: 1,
        pageSize: 10,
      }

      store.dispatch(fetchTickets.fulfilled(mockResponse, ''))
      const state = store.getState().tickets

      expect(state.loading).toBe(false)
      expect(state.tickets).toEqual(mockResponse.tickets)
      expect(state.pagination.totalCount).toBe(2)
      expect(state.pagination.totalPages).toBe(1)
    })

    it('should handle createTicket.fulfilled', () => {
      const newTicket = {
        id: 3,
        title: 'New Ticket',
        description: 'Test description',
        status: 'Open',
        priority: 'Medium',
      }

      store.dispatch(createTicket.fulfilled(newTicket, ''))
      const state = store.getState().tickets

      expect(state.loading).toBe(false)
      expect(state.tickets).toHaveLength(1)
      expect(state.tickets[0]).toEqual(newTicket)
    })

    it('should handle fetchTickets.rejected', () => {
      const errorMessage = 'Failed to fetch tickets'
      
      store.dispatch(fetchTickets.rejected(new Error(errorMessage), '', {}, errorMessage))
      const state = store.getState().tickets

      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })

    it('should append a comment to the current ticket on addComment.fulfilled', () => {
      const currentTicket = { id: 't1', title: 'Ticket with comments', comments: [] }
      store = configureStore({
        reducer: { tickets: ticketsReducer },
        preloadedState: {
          tickets: {
            tickets: [],
            currentTicket,
            loading: false,
            commentLoading: false,
            error: null,
            filters: { status: '', priority: '', assignee: '', search: '' },
            pagination: { currentPage: 1, pageSize: 10, totalPages: 0, totalCount: 0 },
          },
        },
      })

      const newComment = {
        id: 'c1',
        content: 'A new comment',
        author: 'Demo User',
        timestamp: new Date().toISOString(),
      }

      store.dispatch(addComment.fulfilled(newComment, '', { ticketId: 't1' }))
      const state = store.getState().tickets

      expect(state.commentLoading).toBe(false)
      expect(state.currentTicket.comments).toHaveLength(1)
      expect(state.currentTicket.comments[0]).toEqual(newComment)
    })

    it('should set commentLoading on addComment.pending', () => {
      store.dispatch(addComment.pending('', { ticketId: 't1' }))
      const state = store.getState().tickets

      expect(state.commentLoading).toBe(true)
    })
  })
})