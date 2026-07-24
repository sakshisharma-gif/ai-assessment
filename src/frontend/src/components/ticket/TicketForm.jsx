/**
 * TicketForm Component
 * Reusable form for creating and editing tickets with validation,
 * accessibility support, and basic input sanitization.
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTicket, updateTicket } from '../../store/slices/ticketsSlice';

const TITLE_MAX = 100;
const TITLE_MIN = 3;
const DESC_MAX = 2000;
const DESC_MIN = 10;

// Strip script tags to provide basic XSS protection on free-text inputs.
const sanitize = (value) => value.replace(/<\/?script[^>]*>/gi, '');

const TicketForm = ({ ticket = null, mode = 'create', onSubmit, onCancel, isLoading = false }) => {
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.tickets);
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    priority: ticket?.priority || 'medium',
    assignee: ticket?.assignee || '',
    reporter: ticket?.reporter || user?.fullName || user?.name || '',
    labels: ticket?.labels?.join(', ') || '',
    status: ticket?.status || 'open'
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Returns an error message for a single field, or '' when valid.
  const fieldValidator = (name, value) => {
    const trimmed = (value || '').trim();
    switch (name) {
      case 'title':
        if (!trimmed) return 'Title is required';
        if (trimmed.length < TITLE_MIN) return 'Title must be at least 3 characters long';
        return '';
      case 'description':
        if (!trimmed) return 'Description is required';
        if (trimmed.length < DESC_MIN) return 'Description must be at least 10 characters long';
        return '';
      case 'assignee':
        if (!trimmed) return 'Assignee is required';
        return '';
      case 'reporter':
        if (!trimmed) return 'Reporter is required';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name } = e.target;
    let value = sanitize(e.target.value);
    let lengthError = '';

    if (name === 'title' && value.length > TITLE_MAX) {
      lengthError = 'Title cannot exceed 100 characters';
      value = value.slice(0, TITLE_MAX);
    }
    if (name === 'description' && value.length > DESC_MAX) {
      lengthError = 'Description cannot exceed 2000 characters';
      value = value.slice(0, DESC_MAX);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({
      ...prev,
      [name]: lengthError || fieldValidator(name, value)
    }));
  };

  const validateForm = () => {
    const errors = {};
    ['title', 'description', 'assignee', 'reporter'].forEach((field) => {
      const message = fieldValidator(field, formData[field]);
      if (message) errors[field] = message;
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    const ticketData = {
      ...formData,
      labels: formData.labels
        ? formData.labels.split(',').map((label) => label.trim()).filter(Boolean)
        : []
    };

    if (mode === 'edit' && ticket) {
      ticketData.id = ticket.id;
    }

    try {
      if (onSubmit) {
        await onSubmit(ticketData);
      } else if (mode === 'create') {
        await dispatch(createTicket(ticketData)).unwrap();
      } else {
        await dispatch(updateTicket({ ticketId: ticket.id, updates: ticketData })).unwrap();
      }
    } catch (err) {
      setSubmitError(mode === 'create' ? 'Failed to create ticket' : 'Failed to update ticket');
    }
  };

  const submitLabel = mode === 'create'
    ? (isLoading ? 'Creating...' : 'Create Ticket')
    : (isLoading ? 'Updating...' : 'Update Ticket');

  return (
    <div className="ticket-form" role="form">
      <h2>{mode === 'create' ? 'Create New Ticket' : 'Edit Ticket'}</h2>

      {(submitError || error) && (
        <div className="error-message" role="alert">
          {submitError || error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={validationErrors.title ? 'error' : ''}
            aria-required="true"
            aria-describedby="title-error"
            placeholder="Enter a clear, descriptive title"
          />
          {validationErrors.title && (
            <span id="title-error" className="error-text" role="alert">
              {validationErrors.title}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={validationErrors.description ? 'error' : ''}
            rows="4"
            aria-required="true"
            aria-describedby="description-error"
            placeholder="Provide detailed information about the issue"
          />
          <small className="char-count">{formData.description.length}/{DESC_MAX}</small>
          {validationErrors.description && (
            <span id="description-error" className="error-text" role="alert">
              {validationErrors.description}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assignee">Assignee *</label>
          <input
            type="text"
            id="assignee"
            name="assignee"
            value={formData.assignee}
            onChange={handleChange}
            className={validationErrors.assignee ? 'error' : ''}
            aria-required="true"
            aria-describedby="assignee-error"
            placeholder="Who should work on this?"
          />
          {validationErrors.assignee && (
            <span id="assignee-error" className="error-text" role="alert">
              {validationErrors.assignee}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="reporter">Reporter *</label>
          <input
            type="text"
            id="reporter"
            name="reporter"
            value={formData.reporter}
            onChange={handleChange}
            className={validationErrors.reporter ? 'error' : ''}
            aria-required="true"
            aria-describedby="reporter-error"
            placeholder="Who is reporting this?"
          />
          {validationErrors.reporter && (
            <span id="reporter-error" className="error-text" role="alert">
              {validationErrors.reporter}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="labels">Labels</label>
          <input
            type="text"
            id="labels"
            name="labels"
            value={formData.labels}
            onChange={handleChange}
            placeholder="Enter labels separated by commas"
          />
          <small>Separate multiple labels with commas</small>
        </div>

        {mode === 'edit' && (
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
          >
            {submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TicketForm;
