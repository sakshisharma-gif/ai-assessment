import { describe, it, expect } from 'vitest'
import {
  selectAuth,
  selectIsAuthenticated,
  selectAllTickets,
  selectKPIMetrics,
  selectFilteredTickets,
  selectTicketCounts,
  selectUserTickets,
} from '../../store/selectors'

describe('Redux Selectors', () => {
  const mockState = {
    auth: {
      user: { id: 1, username: 'testuser', fullName: 'Test User' },
      token: 'test-token',
      isAuthenticated: true,
      loading: false,
      error: null,
    },
    tickets: {
      tickets: [
        {
          id: 1,
          title: 'Fix bug in login',
          description: 'Login form not working',
          status: 'open',
          priority: 'high',
          assignee: 'testuser',
          reporter: 'manager',
        },
        {
          id: 2,
          title: 'Update documentation',
          description: 'API docs need updating',
          status: 'in_progress',
          priority: 'medium',
          assignee: 'developer',
          reporter: 'testuser',
        },
        {
          id: 3,
          title: 'Database optimization',
          description: 'Query performance issues',
          status: 'closed',
          priority: 'critical',
          assignee: 'dba',
          reporter: 'admin',
        },
      ],
      filters: {
        status: '',
        priority: '',
        assignee: '',
        search: '',
      },
      loading: false,
      error: null,
    },
    dashboard: {
      kpiMetrics: {
        totalTickets: 45,
        openTickets: 12,
        inProgressTickets: 8,
        resolvedTickets: 20,
        closedTickets: 5,
      },
      loading: false,
      error: null,
    },
  }

  describe('auth selectors', () => {
    it('should select auth state', () => {
      const result = selectAuth(mockState)
      expect(result).toEqual(mockState.auth)
    })

    it('should select authentication status', () => {
      const result = selectIsAuthenticated(mockState)
      expect(result).toBe(true)
    })
  })

  describe('ticket selectors', () => {
    it('should select all tickets', () => {
      const result = selectAllTickets(mockState)
      expect(result).toEqual(mockState.tickets.tickets)
      expect(result).toHaveLength(3)
    })

    it('should select filtered tickets with status filter', () => {
      const stateWithFilter = {
        ...mockState,
        tickets: {
          ...mockState.tickets,
          filters: {
            ...mockState.tickets.filters,
            status: 'open',
          },
        },
      }

      const result = selectFilteredTickets(stateWithFilter)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('open')
    })

    it('should select filtered tickets with search filter', () => {
      const stateWithFilter = {
        ...mockState,
        tickets: {
          ...mockState.tickets,
          filters: {
            ...mockState.tickets.filters,
            search: 'login',
          },
        },
      }

      const result = selectFilteredTickets(stateWithFilter)
      expect(result).toHaveLength(1)
      expect(result[0].title).toContain('login')
    })

    it('should select ticket counts by status', () => {
      const result = selectTicketCounts(mockState)
      expect(result).toEqual({
        total: 3,
        open: 1,
        inProgress: 1,
        resolved: 0,
        closed: 1,
      })
    })

    it('should select user tickets (assigned or reported)', () => {
      const result = selectUserTickets(mockState)
      expect(result).toHaveLength(2) // One assigned to testuser, one reported by testuser
    })
  })

  describe('dashboard selectors', () => {
    it('should select KPI metrics', () => {
      const result = selectKPIMetrics(mockState)
      expect(result).toEqual(mockState.dashboard.kpiMetrics)
    })
  })

  describe('edge cases', () => {
    it('should handle empty tickets array', () => {
      const emptyState = {
        ...mockState,
        tickets: {
          ...mockState.tickets,
          tickets: [],
        },
      }

      const filteredResult = selectFilteredTickets(emptyState)
      const countsResult = selectTicketCounts(emptyState)

      expect(filteredResult).toEqual([])
      expect(countsResult.total).toBe(0)
    })

    it('should handle null user in selectUserTickets', () => {
      const stateWithoutUser = {
        ...mockState,
        auth: {
          ...mockState.auth,
          user: null,
        },
      }

      const result = selectUserTickets(stateWithoutUser)
      expect(result).toEqual([])
    })
  })
})