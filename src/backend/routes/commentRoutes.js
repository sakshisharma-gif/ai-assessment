const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/commentController');
const {
  validateAddComment,
  validateUpdateComment,
  validateCommentId,
  validateCommentQuery
} = require('../middleware/validation');

/**
 * Comment Routes
 * Defines all REST API endpoints for comment management
 */

/**
 * @route GET /api/comments/recent
 * @desc Get recent comments across all tickets
 * @access Public
 * @query {number} limit - Number of comments to return (default: 10)
 */
router.get('/recent', CommentController.getRecentComments);

/**
 * @route GET /api/comments/:id
 * @desc Get a specific comment by ID
 * @access Public
 * @param {string} id - Comment ID (MongoDB ObjectId)
 */
router.get('/:id', validateCommentId, CommentController.getCommentById);

/**
 * @route PUT /api/comments/:id
 * @desc Update a comment
 * @access Public
 * @param {string} id - Comment ID (MongoDB ObjectId)
 * @body {string} content - Updated comment content (required, 1-1000 chars)
 */
router.put('/:id', validateUpdateComment, CommentController.updateComment);

/**
 * @route DELETE /api/comments/:id
 * @desc Delete a comment
 * @access Public
 * @param {string} id - Comment ID (MongoDB ObjectId)
 */
router.delete('/:id', validateCommentId, CommentController.deleteComment);

module.exports = router;