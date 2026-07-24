const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const { validationResult } = require('express-validator');

/**
 * Comment Controller
 * Handles all comment-related operations including creating and retrieving comments for tickets
 */
class CommentController {
  
  /**
   * Add a new comment to a ticket
   * POST /api/tickets/:ticketId/comments
   */
  static async addComment(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { ticketId } = req.params;
      const { content, author } = req.body;

      // Verify that the ticket exists
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }

      // Create the comment
      const commentData = {
        ticketId,
        content: content.trim(),
        author: author.trim()
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      res.status(201).json({
        status: 'success',
        message: 'Comment added successfully',
        data: {
          comment: savedComment
        }
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to add comment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get all comments for a specific ticket
   * GET /api/tickets/:ticketId/comments
   */
  static async getCommentsByTicketId(req, res) {
    try {
      const { ticketId } = req.params;
      const { limit = 50, page = 1 } = req.query;

      // Verify that the ticket exists
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Get comments with pagination
      const comments = await Comment.find({ ticketId })
        .sort({ createdDate: 1 }) // Oldest first
        .skip(skip)
        .limit(limitNum);

      // Get total count
      const totalCount = await Comment.getCommentCount(ticketId);
      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        status: 'success',
        data: {
          ticketId,
          comments,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalCount,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching comments:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch comments',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get a specific comment by ID
   * GET /api/comments/:id
   */
  static async getCommentById(req, res) {
    try {
      const { id } = req.params;
      
      const comment = await Comment.findById(id).populate('ticketId', 'title');
      
      if (!comment) {
        return res.status(404).json({
          status: 'error',
          message: 'Comment not found'
        });
      }

      res.json({
        status: 'success',
        data: {
          comment
        }
      });

    } catch (error) {
      console.error('Error fetching comment:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid comment ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch comment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update a comment
   * PUT /api/comments/:id
   */
  static async updateComment(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { content } = req.body;
      
      const comment = await Comment.findById(id);
      
      if (!comment) {
        return res.status(404).json({
          status: 'error',
          message: 'Comment not found'
        });
      }

      // Update the comment content
      comment.content = content.trim();
      const updatedComment = await comment.save();

      res.json({
        status: 'success',
        message: 'Comment updated successfully',
        data: {
          comment: updatedComment
        }
      });

    } catch (error) {
      console.error('Error updating comment:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid comment ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to update comment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete a comment
   * DELETE /api/comments/:id
   */
  static async deleteComment(req, res) {
    try {
      const { id } = req.params;
      
      const comment = await Comment.findByIdAndDelete(id);
      
      if (!comment) {
        return res.status(404).json({
          status: 'error',
          message: 'Comment not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Comment deleted successfully',
        data: {
          deletedComment: comment
        }
      });

    } catch (error) {
      console.error('Error deleting comment:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid comment ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to delete comment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get recent comments across all tickets
   * GET /api/comments/recent
   */
  static async getRecentComments(req, res) {
    try {
      const { limit = 10 } = req.query;

      const comments = await Comment.findRecentComments(parseInt(limit));

      res.json({
        status: 'success',
        data: {
          comments,
          count: comments.length
        }
      });

    } catch (error) {
      console.error('Error fetching recent comments:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch recent comments',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get comment statistics for a ticket
   * GET /api/tickets/:ticketId/comments/stats
   */
  static async getCommentStats(req, res) {
    try {
      const { ticketId } = req.params;

      // Verify that the ticket exists
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }

      const totalComments = await Comment.getCommentCount(ticketId);
      
      // Get recent comments (last 5)
      const recentComments = await Comment.find({ ticketId })
        .sort({ createdDate: -1 })
        .limit(5)
        .select('author createdDate content');

      // Get unique authors
      const authors = await Comment.distinct('author', { ticketId });

      res.json({
        status: 'success',
        data: {
          ticketId,
          statistics: {
            totalComments,
            uniqueAuthors: authors.length,
            authors,
            recentComments
          }
        }
      });

    } catch (error) {
      console.error('Error fetching comment statistics:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch comment statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = CommentController;