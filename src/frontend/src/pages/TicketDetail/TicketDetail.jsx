import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  selectCurrentTicket,
  selectTicketsLoading,
  selectTicketsError,
  selectUser,
} from '../../store/selectors'
import {
  fetchTicketById,
  updateTicket,
  deleteTicket,
  addComment,
} from '../../store/slices/ticketsSlice'
import './TicketDetail.css'

/**
 * Ticket detail page with view and edit functionality
 * @returns {React.ReactNode} Ticket detail page
 */
const TicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const ticket = useSelector(selectCurrentTicket)
  const loading = useSelector(selectTicketsLoading)
  const error = useSelector(selectTicketsError)
  const user = useSelector(selectUser)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [newComment, setNewComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Ticket status state machine (mirrors the backend rules).
  // Used to only offer valid next statuses in the edit dropdown.
  const STATUS_TRANSITIONS = {
    open: ['in_progress', 'cancelled'],
    in_progress: ['resolved', 'cancelled'],
    resolved: ['closed'],
    closed: [],
    cancelled: [],
  }

  const getStatusOptions = (currentStatus) => {
    const next = STATUS_TRANSITIONS[currentStatus] || []
    return [currentStatus, ...next]
  }

  useEffect(() => {
    if (id) {
      dispatch(fetchTicketById(id))
    }
  }, [id, dispatch])

  useEffect(() => {
    if (ticket) {
      setEditForm({
        title: ticket.title || '',
        description: ticket.description || '',
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        assignee: ticket.assignee || '',
      })
    }
  }, [ticket])

  const handleEditToggle = () => {
    setIsEditing(!isEditing)
    if (ticket && !isEditing) {
      setEditForm({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignee: ticket.assignee,
      })
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveChanges = async () => {
    if (!ticket) return
    setSaveError('')

    const result = await dispatch(updateTicket({
      ticketId: ticket.id,
      updates: editForm
    }))
    
    if (result.type === 'tickets/updateTicket/fulfilled') {
      setIsEditing(false)
    } else {
      // Surface backend validation errors (e.g. invalid status transitions) clearly
      setSaveError(result.payload || 'Failed to update ticket')
    }
  }

  const handleDeleteTicket = async () => {
    if (!ticket) return
    
    const result = await dispatch(deleteTicket(ticket.id))
    if (result.type === 'tickets/deleteTicket/fulfilled') {
      navigate('/tickets')
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    setCommentError('')

    const content = newComment.trim()
    if (!content) {
      setCommentError('Comment cannot be empty')
      return
    }

    const author = user?.fullName || user?.username || user?.name || 'Anonymous'

    setSubmittingComment(true)
    const result = await dispatch(addComment({
      ticketId: ticket.id,
      content,
      author,
    }))
    setSubmittingComment(false)

    if (result.type === 'tickets/addComment/fulfilled') {
      setNewComment('')
    } else {
      setCommentError(result.payload || 'Failed to add comment')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (loading && !ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="loading">Loading ticket details...</div>
      </div>
    )
  }

  if (error && !ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="error-message">
          Error loading ticket: {error}
        </div>
        <Link to="/tickets" className="back-link">← Back to Tickets</Link>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="not-found">
          <h2>Ticket Not Found</h2>
          <p>The ticket you're looking for doesn't exist or has been deleted.</p>
          <Link to="/tickets" className="back-link">← Back to Tickets</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="ticket-detail-page">
      <div className="page-header">
        <div className="header-top">
          <Link to="/tickets" className="back-link">← Back to Tickets</Link>
          <div className="ticket-actions">
            <button
              onClick={handleEditToggle}
              className={`edit-button ${isEditing ? 'active' : ''}`}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="delete-button"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="ticket-id">Ticket #{ticket.id}</div>
      </div>

      <div className="ticket-content">
        <div className="main-content">
          <div className="ticket-header">
            {isEditing ? (
              <input
                type="text"
                name="title"
                value={editForm.title}
                onChange={handleInputChange}
                className="title-input"
                placeholder="Ticket title"
              />
            ) : (
              <h1 className="ticket-title">{ticket.title}</h1>
            )}
            
            <div className="ticket-badges">
              {isEditing ? (
                <>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleInputChange}
                    className="status-select"
                  >
                    {getStatusOptions(ticket.status).map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                  <select
                    name="priority"
                    value={editForm.priority}
                    onChange={handleInputChange}
                    className="priority-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </>
              ) : (
                <>
                  <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                    {formatLabel(ticket.status)}
                  </span>
                  <span className={`priority-badge ${getPriorityColor(ticket.priority)}`}>
                    {formatLabel(ticket.priority)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="ticket-description">
            <h3>Description</h3>
            {isEditing ? (
              <textarea
                name="description"
                value={editForm.description}
                onChange={handleInputChange}
                className="description-textarea"
                placeholder="Ticket description"
                rows="6"
              />
            ) : (
              <div className="description-content">
                {ticket.description || 'No description provided.'}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="edit-actions">
              {saveError && (
                <div className="error-message" role="alert">
                  {saveError}
                </div>
              )}
              <button onClick={handleSaveChanges} className="save-button">
                Save Changes
              </button>
              <button onClick={handleEditToggle} className="cancel-button">
                Cancel
              </button>
            </div>
          )}

          {/* Comments Section */}
          <div className="comments-section">
            <h3>Comments</h3>
            
            <form onSubmit={handleAddComment} className="add-comment-form">
              <textarea
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value)
                  if (commentError) setCommentError('')
                }}
                placeholder="Add a comment..."
                className="comment-textarea"
                rows="3"
                maxLength={1000}
                disabled={submittingComment}
              />
              {commentError && (
                <span className="error-text">{commentError}</span>
              )}
              <button
                type="submit"
                className="add-comment-button"
                disabled={submittingComment || !newComment.trim()}
              >
                {submittingComment ? 'Adding...' : 'Add Comment'}
              </button>
            </form>

            <div className="comments-list">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-date">
                        {formatDate(comment.timestamp)}
                      </span>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </div>
                ))
              ) : (
                <div className="no-comments">
                  No comments yet. Be the first to add one!
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="ticket-info">
            <h3>Ticket Information</h3>
            <div className="info-group">
              <label>Assignee</label>
              {isEditing ? (
                <input
                  type="text"
                  name="assignee"
                  value={editForm.assignee}
                  onChange={handleInputChange}
                  className="assignee-input"
                  placeholder="Assignee name"
                />
              ) : (
                <span className="info-value">
                  {ticket.assignee || 'Unassigned'}
                </span>
              )}
            </div>
            <div className="info-group">
              <label>Reporter</label>
              <span className="info-value">{ticket.reporter}</span>
            </div>
            <div className="info-group">
              <label>Created</label>
              <span className="info-value">
                {formatDate(ticket.createdDate)}
              </span>
            </div>
            <div className="info-group">
              <label>Last Updated</label>
              <span className="info-value">
                {formatDate(ticket.updatedDate)}
              </span>
            </div>
            {ticket.resolutionDate && (
              <div className="info-group">
                <label>Resolved</label>
                <span className="info-value">
                  {formatDate(ticket.resolutionDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Ticket</h3>
            <p>Are you sure you want to delete this ticket? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={handleDeleteTicket}
                className="confirm-delete-button"
              >
                Delete Ticket
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="cancel-modal-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketDetail