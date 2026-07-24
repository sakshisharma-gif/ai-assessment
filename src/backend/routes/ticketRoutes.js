const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticketController');
const {
  validateCreateTicket,
  validateUpdateTicket,
  validateUpdateTicketStatus,
  validateTicketId,
  validateStatusParam,
  validateTicketQuery,
  validateAssigneeParam
} = require('../middleware/validation');

/**
 * Ticket Routes
 * Defines all REST API endpoints for ticket management
 */

/**
 * @route GET /api/tickets
 * @desc Get all tickets with optional filtering, pagination, and search
 * @access Public
 * @query {string} status - Filter by status (open, in_progress, resolved, closed)
 * @query {string} priority - Filter by priority (low, medium, high, critical)
 * @query {string} assignee - Filter by assignee name
 * @query {string} reporter - Filter by reporter name
 * @query {string} search - Search in title, description, assignee, reporter
 * @query {number} page - Page number for pagination (default: 1)
 * @query {number} limit - Number of items per page (default: 10, max: 100)
 * @query {string} sortBy - Sort field (createdDate, updatedDate, title, status, priority)
 * @query {string} sortOrder - Sort order (asc, desc)
 */
router.get('/', validateTicketQuery, TicketController.getAllTickets);

/**
 * @route POST /api/tickets
 * @desc Create a new ticket
 * @access Public
 * @body {string} title - Ticket title (required, 3-100 chars)
 * @body {string} description - Ticket description (required, 10-2000 chars)
 * @body {string} priority - Ticket priority (optional, default: medium)
 * @body {string} assignee - Person assigned to ticket (required, 2-50 chars)
 * @body {string} reporter - Person reporting the ticket (required, 2-50 chars)
 * @body {string[]} labels - Array of labels/tags (optional, each 2-30 chars)
 */
router.post('/', validateCreateTicket, TicketController.createTicket);

/**
 * @route GET /api/tickets/status/:status
 * @desc Get tickets by status
 * @access Public
 * @param {string} status - Ticket status (open, in_progress, resolved, closed)
 * @query {number} limit - Number of tickets to return (default: 50)
 */
router.get('/status/:status', validateStatusParam, TicketController.getTicketsByStatus);

/**
 * @route GET /api/tickets/assignee/:assignee
 * @desc Get tickets assigned to a specific user
 * @access Public
 * @param {string} assignee - Name of the assignee
 * @query {string} status - Optional status filter
 * @query {number} limit - Number of tickets to return (default: 50)
 */
router.get('/assignee/:assignee', validateAssigneeParam, TicketController.getTicketsByAssignee);

/**
 * @route GET /api/tickets/:id
 * @desc Get a single ticket by ID with associated comments
 * @access Public
 * @param {string} id - Ticket ID (MongoDB ObjectId)
 */
router.get('/:id', validateTicketId, TicketController.getTicketById);

/**
 * @route PUT /api/tickets/:id
 * @desc Update a ticket completely
 * @access Public
 * @param {string} id - Ticket ID (MongoDB ObjectId)
 * @body {string} title - Updated title (optional, 3-100 chars)
 * @body {string} description - Updated description (optional, 10-2000 chars)
 * @body {string} status - Updated status (optional, validates transitions)
 * @body {string} priority - Updated priority (optional)
 * @body {string} assignee - Updated assignee (optional, 2-50 chars)
 * @body {string} reporter - Updated reporter (optional, 2-50 chars)
 * @body {string[]} labels - Updated labels (optional, each 2-30 chars)
 */
router.put('/:id', validateUpdateTicket, TicketController.updateTicket);

/**
 * @route PATCH /api/tickets/:id/status
 * @desc Update ticket status only (with state machine validation)
 * @access Public
 * @param {string} id - Ticket ID (MongoDB ObjectId)
 * @body {string} status - New status (required, validates transitions)
 */
router.patch('/:id/status', validateUpdateTicketStatus, TicketController.updateTicketStatus);

/**
 * @route DELETE /api/tickets/:id
 * @desc Delete a ticket and all associated comments
 * @access Public
 * @param {string} id - Ticket ID (MongoDB ObjectId)
 */
router.delete('/:id', validateTicketId, TicketController.deleteTicket);

module.exports = router;