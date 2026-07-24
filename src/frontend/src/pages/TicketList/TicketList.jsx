import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import {
  selectAllTickets,
  selectTicketsLoading,
  selectTicketsError,
  selectTicketFilters,
  selectTicketPagination,
  selectFilteredTickets,
} from '../../store/selectors'
import {
  fetchTickets,
  setFilters,
  clearFilters,
  setCurrentPage,
  deleteTicket,
} from '../../store/slices/ticketsSlice'
import './TicketList.css'

/**
 * Ticket list page with filtering and search
 * @returns {React.ReactNode} Ticket list page
 */
const TicketList = () => {
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const tickets = useSelector(selectAllTickets)
  const filteredTickets = useSelector(selectFilteredTickets)
  const loading = useSelector(selectTicketsLoading)
  const error = useSelector(selectTicketsError)
  const filters = useSelector(selectTicketFilters)
  const pagination = useSelector(selectTicketPagination)

  useEffect(() => {
    // Load filters from URL params
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const assignee = searchParams.get('assignee') || ''
    const search = searchParams.get('search') || ''

    dispatch(setFilters({ status, priority, assignee, search }))
    setSearchTerm(search)
    
    // Fetch tickets
    dispatch(fetchTickets({ page: 1, pageSize: 10, filters: { status, priority, assignee, search } }))
  }, [dispatch, searchParams])

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value }
    dispatch(setFilters(newFilters))
    
    // Update URL params
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(filterName, value)
    } else {
      params.delete(filterName)
    }
    setSearchParams(params)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    handleFilterChange('search', searchTerm)
  }

  const handleClearFilters = () => {
    dispatch(clearFilters())
    setSearchTerm('')
    setSearchParams({})
  }

  const handleDeleteTicket = async (ticketId) => {
    if (confirmDelete === ticketId) {
      await dispatch(deleteTicket(ticketId))
      setConfirmDelete(null)
    } else {
      setConfirmDelete(ticketId)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      'open': 'status-open',
      'in_progress': 'status-progress',
      'resolved': 'status-resolved',
      'closed': 'status-closed',
      'cancelled': 'status-cancelled',
    }
    return colors[status] || 'status-default'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': 'priority-critical',
      'high': 'priority-high',
      'medium': 'priority-medium',
      'low': 'priority-low',
    }
    return colors[priority] || 'priority-default'
  }

  const formatLabel = (value) => {
    if (!value) return ''
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="ticket-list-page">
        <div className="loading">Loading tickets...</div>
      </div>
    )
  }

  return (
    <div className="ticket-list-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Tickets</h1>
          <Link to="/tickets/create" className="create-button">
            + Create Ticket
          </Link>
        </div>
        <p>Manage and track all tickets in the system</p>
      </div>

      {error && (
        <div className="error-message">
          Error loading tickets: {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="filters-section">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets by title or description..."
            className="search-input"
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>

        <div className="filters-row">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="filter-select"
          >
            <option value="">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <input
            type="text"
            value={filters.assignee}
            onChange={(e) => handleFilterChange('assignee', e.target.value)}
            placeholder="Filter by assignee"
            className="filter-input"
          />

          <button
            onClick={handleClearFilters}
            className="clear-filters-button"
            type="button"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        <p>
          Showing {filteredTickets.length} of {tickets.length} tickets
          {Object.values(filters).some(f => f) && ' (filtered)'}
        </p>
      </div>

      {/* Tickets Table */}
      {filteredTickets.length === 0 ? (
        <div className="no-tickets">
          <h3>No tickets found</h3>
          <p>
            {Object.values(filters).some(f => f)
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by creating your first ticket.'
            }
          </p>
          <Link to="/tickets/create" className="create-link">
            Create New Ticket
          </Link>
        </div>
      ) : (
        <div className="tickets-table">
          <div className="table-header">
            <div className="col-title">Title</div>
            <div className="col-status">Status</div>
            <div className="col-priority">Priority</div>
            <div className="col-assignee">Assignee</div>
            <div className="col-updated">Updated</div>
            <div className="col-actions">Actions</div>
          </div>

          <div className="table-body">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="table-row">
                <div className="col-title">
                  <Link to={`/tickets/${ticket.id}`} className="ticket-title-link">
                    {ticket.title}
                  </Link>
                </div>
                <div className="col-status">
                  <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                    {formatLabel(ticket.status)}
                  </span>
                </div>
                <div className="col-priority">
                  <span className={`priority-badge ${getPriorityColor(ticket.priority)}`}>
                    {formatLabel(ticket.priority)}
                  </span>
                </div>
                <div className="col-assignee">{ticket.assignee || 'Unassigned'}</div>
                <div className="col-updated">{formatDate(ticket.updatedDate)}</div>
                <div className="col-actions">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="action-button view-button"
                    title="View ticket"
                  >
                    👁️
                  </Link>
                  <Link
                    to={`/tickets/${ticket.id}/edit`}
                    className="action-button edit-button"
                    title="Edit ticket"
                  >
                    ✏️
                  </Link>
                  <button
                    onClick={() => handleDeleteTicket(ticket.id)}
                    className={`action-button delete-button ${
                      confirmDelete === ticket.id ? 'confirm' : ''
                    }`}
                    title={confirmDelete === ticket.id ? 'Click again to confirm' : 'Delete ticket'}
                  >
                    {confirmDelete === ticket.id ? '✅' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => dispatch(setCurrentPage(pagination.currentPage - 1))}
            disabled={pagination.currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <button
            onClick={() => dispatch(setCurrentPage(pagination.currentPage + 1))}
            disabled={pagination.currentPage === pagination.totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default TicketList