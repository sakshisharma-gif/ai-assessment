import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { createTicket } from '../../store/slices/ticketsSlice'
import { selectTicketsLoading, selectTicketsError, selectUser } from '../../store/selectors'
import './TicketCreate.css'

/**
 * Ticket creation form page
 * @returns {React.ReactNode} Ticket creation page
 */
const TicketCreate = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const loading = useSelector(selectTicketsLoading)
  const error = useSelector(selectTicketsError)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    labels: '',
  })

  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters long'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long'
    }

    if (!formData.priority) {
      newErrors.priority = 'Priority is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const ticketData = {
      ...formData,
      status: 'open',
      reporter: user?.username || user?.fullName || 'Unknown',
      labels: formData.labels ? formData.labels.split(',').map(l => l.trim()) : [],
    }

    const result = await dispatch(createTicket(ticketData))
    
    if (result.type === 'tickets/createTicket/fulfilled') {
      navigate('/tickets')
    }
  }

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assignee: '',
      labels: '',
    })
    setErrors({})
  }

  return (
    <div className="ticket-create-page">
      <div className="page-header">
        <div className="header-top">
          <Link to="/tickets" className="back-link">← Back to Tickets</Link>
        </div>
        <h1>Create New Ticket</h1>
        <p>Fill out the form below to create a new support ticket.</p>
      </div>

      {error && (
        <div className="error-message">
          Error creating ticket: {error}
        </div>
      )}

      <div className="create-content">
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-section">
            <h2>Ticket Details</h2>
            
            <div className="form-group">
              <label htmlFor="title" className="required">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={errors.title ? 'error' : ''}
                placeholder="Brief description of the issue"
                disabled={loading}
              />
              {errors.title && (
                <span className="error-text">{errors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="required">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={errors.description ? 'error' : ''}
                placeholder="Detailed description of the issue, steps to reproduce, expected behavior, etc."
                rows="6"
                disabled={loading}
              />
              {errors.description && (
                <span className="error-text">{errors.description}</span>
              )}
              <div className="form-help">
                Provide as much detail as possible to help resolve the issue quickly.
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Assignment & Priority</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="priority" className="required">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className={errors.priority ? 'error' : ''}
                  disabled={loading}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
                {errors.priority && (
                  <span className="error-text">{errors.priority}</span>
                )}
                <div className="form-help">
                  Select the urgency level of this issue.
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="assignee">
                  Assignee
                </label>
                <input
                  type="text"
                  id="assignee"
                  name="assignee"
                  value={formData.assignee}
                  onChange={handleInputChange}
                  placeholder="Username or name (optional)"
                  disabled={loading}
                />
                <div className="form-help">
                  Leave empty to assign later.
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Additional Information</h2>
            
            <div className="form-group">
              <label htmlFor="labels">
                Labels/Tags
              </label>
              <input
                type="text"
                id="labels"
                name="labels"
                value={formData.labels}
                onChange={handleInputChange}
                placeholder="bug, feature, enhancement (comma-separated)"
                disabled={loading}
              />
              <div className="form-help">
                Add relevant tags separated by commas (e.g., bug, ui, urgent).
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="reset-button"
              disabled={loading}
            >
              Reset Form
            </button>
            <Link
              to="/tickets"
              className="cancel-link"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="form-sidebar">
          <div className="help-section">
            <h3>📋 Tips for Better Tickets</h3>
            <ul>
              <li>
                <strong>Be specific:</strong> Use clear, descriptive titles
              </li>
              <li>
                <strong>Provide context:</strong> Include relevant details about the environment
              </li>
              <li>
                <strong>Steps to reproduce:</strong> List the exact steps that led to the issue
              </li>
              <li>
                <strong>Expected vs actual:</strong> Describe what should happen vs what actually happened
              </li>
              <li>
                <strong>Screenshots:</strong> Include screenshots when helpful
              </li>
            </ul>
          </div>

          <div className="priority-guide">
            <h3>🚨 Priority Levels</h3>
            <div className="priority-item">
              <span className="priority-badge critical">Critical</span>
              <span>System down, data loss, security issues</span>
            </div>
            <div className="priority-item">
              <span className="priority-badge high">High</span>
              <span>Major feature broken, blocking work</span>
            </div>
            <div className="priority-item">
              <span className="priority-badge medium">Medium</span>
              <span>Minor bugs, feature requests</span>
            </div>
            <div className="priority-item">
              <span className="priority-badge low">Low</span>
              <span>Cosmetic issues, nice-to-have features</span>
            </div>
          </div>

          <div className="reporter-info">
            <h3>👤 Reporter Information</h3>
            <p><strong>Reported by:</strong> {user?.fullName || user?.username || 'Unknown User'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            <p><strong>Role:</strong> {user?.role || 'User'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketCreate