import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  selectKPIMetrics,
  selectTicketsByPriority,
  selectAssignedTickets,
  selectRecentTickets,
  selectDashboardLoading,
  selectDashboardError,
} from '../../store/selectors'
import {
  fetchKPIMetrics,
  fetchTicketsByPriority,
  fetchAssignedTickets,
  fetchRecentTickets,
} from '../../store/slices/dashboardSlice'
import './Dashboard.css'

/**
 * Dashboard component showing KPI metrics and ticket overviews
 * @returns {React.ReactNode} Dashboard page
 */
const Dashboard = () => {
  const dispatch = useDispatch()
  const kpiMetrics = useSelector(selectKPIMetrics) || {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0
  }
  const ticketsByPriority = useSelector(selectTicketsByPriority) || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
  const assignedTickets = useSelector(selectAssignedTickets) || []
  const recentTickets = useSelector(selectRecentTickets) || []
  const loading = useSelector(selectDashboardLoading)
  const error = useSelector(selectDashboardError)

  useEffect(() => {
    // Fetch all dashboard data on component mount
    dispatch(fetchKPIMetrics())
    dispatch(fetchTicketsByPriority())
    dispatch(fetchAssignedTickets(1)) // Mock user ID
    dispatch(fetchRecentTickets({ limit: 5 }))
  }, [dispatch])

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">Error loading dashboard: {error}</div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's an overview of your tickets.</p>
      </div>

      {/* KPI Metrics */}
      <section className="kpi-section">
        <h2>Key Performance Indicators</h2>
        <div className="kpi-grid">
          <div className="kpi-card total">
            <div className="kpi-icon">📊</div>
            <div className="kpi-content">
              <h3>Total Tickets</h3>
              <div className="kpi-value">{kpiMetrics.totalTickets}</div>
            </div>
          </div>
          <div className="kpi-card open">
            <div className="kpi-icon">🔓</div>
            <div className="kpi-content">
              <h3>Open Tickets</h3>
              <div className="kpi-value">{kpiMetrics.openTickets}</div>
            </div>
          </div>
          <div className="kpi-card progress">
            <div className="kpi-icon">🔄</div>
            <div className="kpi-content">
              <h3>In Progress</h3>
              <div className="kpi-value">{kpiMetrics.inProgressTickets}</div>
            </div>
          </div>
          <div className="kpi-card resolved">
            <div className="kpi-icon">✅</div>
            <div className="kpi-content">
              <h3>Resolved</h3>
              <div className="kpi-value">{kpiMetrics.resolvedTickets}</div>
            </div>
          </div>
          <div className="kpi-card closed">
            <div className="kpi-icon">🔒</div>
            <div className="kpi-content">
              <h3>Closed</h3>
              <div className="kpi-value">{kpiMetrics.closedTickets}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tickets by Priority */}
      <section className="priority-section">
        <h2>Tickets by Priority</h2>
        <div className="priority-grid">
          <div className="priority-card critical">
            <h4>Critical</h4>
            <div className="priority-count">{ticketsByPriority.critical}</div>
          </div>
          <div className="priority-card high">
            <h4>High</h4>
            <div className="priority-count">{ticketsByPriority.high}</div>
          </div>
          <div className="priority-card medium">
            <h4>Medium</h4>
            <div className="priority-count">{ticketsByPriority.medium}</div>
          </div>
          <div className="priority-card low">
            <h4>Low</h4>
            <div className="priority-count">{ticketsByPriority.low}</div>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        {/* Assigned Tickets */}
        <section className="assigned-section">
          <div className="section-header">
            <h2>Your Assigned Tickets</h2>
            <Link to="/tickets?filter=assigned" className="view-all-link">
              View All
            </Link>
          </div>
          <div className="ticket-list">
            {assignedTickets.length === 0 ? (
              <p className="no-tickets">No tickets assigned to you</p>
            ) : (
              assignedTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="ticket-item"
                >
                  <div className="ticket-info">
                    <h4>{ticket.title}</h4>
                    <div className="ticket-meta">
                      <span className={`status ${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                      <span className={`priority ${ticket.priority.toLowerCase()}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="ticket-date">
                    {formatDate(ticket.updatedDate)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent Tickets */}
        <section className="recent-section">
          <div className="section-header">
            <h2>Recently Updated</h2>
            <Link to="/tickets" className="view-all-link">
              View All
            </Link>
          </div>
          <div className="ticket-list">
            {recentTickets.length === 0 ? (
              <p className="no-tickets">No recent ticket updates</p>
            ) : (
              recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="ticket-item"
                >
                  <div className="ticket-info">
                    <h4>{ticket.title}</h4>
                    <div className="ticket-meta">
                      <span className={`status ${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                      <span className="reporter">by {ticket.reporter}</span>
                    </div>
                  </div>
                  <div className="ticket-date">
                    {formatDate(ticket.updatedDate)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard