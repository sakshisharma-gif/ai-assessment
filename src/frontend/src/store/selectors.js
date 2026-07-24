import { createSelector } from '@reduxjs/toolkit'

// Auth selectors
export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthLoading = (state) => state.auth.loading
export const selectAuthError = (state) => state.auth.error

// Tickets selectors
export const selectTickets = (state) => state.tickets
export const selectAllTickets = (state) => state.tickets.tickets
export const selectCurrentTicket = (state) => state.tickets.currentTicket
export const selectTicketsLoading = (state) => state.tickets.loading
export const selectTicketsError = (state) => state.tickets.error
export const selectTicketFilters = (state) => state.tickets.filters
export const selectTicketPagination = (state) => state.tickets.pagination

// Dashboard selectors
export const selectDashboard = (state) => state.dashboard
export const selectKPIMetrics = (state) => state.dashboard.kpiMetrics
export const selectTicketsByPriority = (state) => state.dashboard.ticketsByPriority
export const selectAssignedTickets = (state) => state.dashboard.assignedTickets
export const selectRecentTickets = (state) => state.dashboard.recentTickets
export const selectDashboardLoading = (state) => state.dashboard.loading
export const selectDashboardError = (state) => state.dashboard.error

// Memoized selectors for computed values
export const selectFilteredTickets = createSelector(
  [selectAllTickets, selectTicketFilters],
  (tickets, filters) => {
    if (!tickets || tickets.length === 0) return []
    
    return tickets.filter((ticket) => {
      // Filter by status
      if (filters.status && ticket.status !== filters.status) {
        return false
      }
      
      // Filter by priority
      if (filters.priority && ticket.priority !== filters.priority) {
        return false
      }
      
      // Filter by assignee
      if (filters.assignee && ticket.assignee !== filters.assignee) {
        return false
      }
      
      // Filter by search term
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const titleMatch = ticket.title.toLowerCase().includes(searchTerm)
        const descMatch = ticket.description.toLowerCase().includes(searchTerm)
        if (!titleMatch && !descMatch) {
          return false
        }
      }
      
      return true
    })
  }
)

export const selectTicketCounts = createSelector(
  [selectAllTickets],
  (tickets) => {
    if (!tickets || tickets.length === 0) {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
      }
    }
    
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    }
  }
)

export const selectTicketsByStatus = createSelector(
  [selectAllTickets],
  (tickets) => {
    if (!tickets || tickets.length === 0) return {}
    
    return tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1
      return acc
    }, {})
  }
)

export const selectTicketsByAssignee = createSelector(
  [selectAllTickets],
  (tickets) => {
    if (!tickets || tickets.length === 0) return {}
    
    return tickets.reduce((acc, ticket) => {
      const assignee = ticket.assignee || 'Unassigned'
      acc[assignee] = (acc[assignee] || 0) + 1
      return acc
    }, {})
  }
)

export const selectUserTickets = createSelector(
  [selectAllTickets, selectUser],
  (tickets, user) => {
    if (!tickets || !user) return []
    
    return tickets.filter(ticket => 
      ticket.assignee === user.username || 
      ticket.assignee === user.fullName ||
      ticket.reporter === user.username ||
      ticket.reporter === user.fullName
    )
  }
)

export const selectHighPriorityTickets = createSelector(
  [selectAllTickets],
  (tickets) => {
    if (!tickets || tickets.length === 0) return []
    
    return tickets.filter(ticket => 
      ticket.priority === 'high' || ticket.priority === 'critical'
    )
  }
)

export const selectTotalKPIMetrics = createSelector(
  [selectKPIMetrics],
  (kpiMetrics) => {
    return {
      ...kpiMetrics,
      totalActive: kpiMetrics.openTickets + kpiMetrics.inProgressTickets,
      completionRate: kpiMetrics.totalTickets > 0 
        ? ((kpiMetrics.resolvedTickets + kpiMetrics.closedTickets) / kpiMetrics.totalTickets * 100).toFixed(1)
        : 0
    }
  }
)

export const selectIsLoading = createSelector(
  [selectAuthLoading, selectTicketsLoading, selectDashboardLoading],
  (authLoading, ticketsLoading, dashboardLoading) => {
    return authLoading || ticketsLoading || dashboardLoading
  }
)

export const selectHasErrors = createSelector(
  [selectAuthError, selectTicketsError, selectDashboardError],
  (authError, ticketsError, dashboardError) => {
    return !!(authError || ticketsError || dashboardError)
  }
)

export const selectAllErrors = createSelector(
  [selectAuthError, selectTicketsError, selectDashboardError],
  (authError, ticketsError, dashboardError) => {
    const errors = []
    if (authError) errors.push({ type: 'auth', message: authError })
    if (ticketsError) errors.push({ type: 'tickets', message: ticketsError })
    if (dashboardError) errors.push({ type: 'dashboard', message: dashboardError })
    return errors
  }
)