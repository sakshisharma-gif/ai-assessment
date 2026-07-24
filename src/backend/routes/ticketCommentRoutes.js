const express = require('express');
// mergeParams lets this nested router access :ticketId from the parent mount path
const router = express.Router({ mergeParams: true });
const CommentController = require('../controllers/commentController');
const {
  validateAddComment,
  validateCommentQuery
} = require('../middleware/validation');

/**
 * Ticket Comment Routes
 * Nested routes for comments under tickets (/api/tickets/:ticketId/comments)
 */

/**
 * @route POST /api/tickets/:ticketId/comments
 * @desc Add a new comment to a ticket
 * @access Public
 * @param {string} ticketId - Ticket ID (MongoDB ObjectId)
 * @body {string} content - Comment content (required, 1-1000 chars)
 * @body {string} author - Comment author (required, 2-50 chars)
 */
router.post('/', validateAddComment, CommentController.addComment);

/**
 * @route GET /api/tickets/:ticketId/comments
 * @desc Get all comments for a specific ticket
 * @access Public
 * @param {string} ticketId - Ticket ID (MongoDB ObjectId)
 * @query {number} page - Page number for pagination (default: 1)
 * @query {number} limit - Number of comments per page (default: 50, max: 100)
 */
router.get('/', validateCommentQuery, CommentController.getCommentsByTicketId);

/**
 * @route GET /api/tickets/:ticketId/comments/stats
 * @desc Get comment statistics for a ticket
 * @access Public
 * @param {string} ticketId - Ticket ID (MongoDB ObjectId)
 */
router.get('/stats', CommentController.getCommentStats);

module.exports = router;