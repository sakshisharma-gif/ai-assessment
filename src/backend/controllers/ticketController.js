const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const { validationResult } = require('express-validator');

/**
 * Ticket Controller
 * Handles all ticket-related operations including CRUD operations and status management
 */
class TicketController {
  
  /**
   * Create a new ticket
   * POST /api/tickets
   */
  static async createTicket(req, res) {
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

      const ticketData = {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority || 'medium',
        assignee: req.body.assignee,
        reporter: req.body.reporter,
        labels: req.body.labels || [],
        status: 'open' // Always start with 'open' status
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();

      res.status(201).json({
        status: 'success',
        message: 'Ticket created successfully',
        data: {
          ticket: savedTicket
        }
      });

    } catch (error) {
      console.error('Error creating ticket:', error);
      
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

      res.status(500).json({
        status: 'error',
        message: 'Failed to create ticket',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get all tickets with optional filtering and pagination
   * GET /api/tickets
   */
  static async getAllTickets(req, res) {
    try {
      const {
        status,
        priority,
        assignee,
        reporter,
        search,
        page = 1,
        limit = 10,
        sortBy = 'createdDate',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (assignee) filter.assignee = { $regex: assignee, $options: 'i' };
      if (reporter) filter.reporter = { $regex: reporter, $options: 'i' };
      
      // Add search functionality
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { assignee: { $regex: search, $options: 'i' } },
          { reporter: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const sortDir = sortOrder === 'desc' ? -1 : 1;

      let tickets;
      if (sortBy === 'priority') {
        // Sort by semantic priority weight (critical > high > medium > low)
        // rather than alphabetical order.
        tickets = await Ticket.aggregate([
          { $match: filter },
          {
            $addFields: {
              _priorityRank: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$priority', 'critical'] }, then: 4 },
                    { case: { $eq: ['$priority', 'high'] }, then: 3 },
                    { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                    { case: { $eq: ['$priority', 'low'] }, then: 1 }
                  ],
                  default: 0
                }
              }
            }
          },
          { $sort: { _priorityRank: sortDir, createdDate: -1 } },
          { $skip: skip },
          { $limit: limitNum }
        ]);

        // aggregate() bypasses the schema toJSON transform, so normalize the
        // output to match the standard ticket shape ({ id } instead of { _id }).
        tickets = tickets.map(({ _id, __v, _priorityRank, ...rest }) => ({
          id: _id,
          ...rest
        }));
      } else {
        const sortOptions = {};
        sortOptions[sortBy] = sortDir;

        tickets = await Ticket.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum);
      }

      // Get total count for pagination
      const totalCount = await Ticket.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        status: 'success',
        data: {
          tickets,
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
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tickets',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get a single ticket by ID
   * GET /api/tickets/:id
   */
  static async getTicketById(req, res) {
    try {
      const { id } = req.params;
      
      const ticket = await Ticket.findById(id);
      
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }

      // Get associated comments
      const comments = await Comment.findByTicketId(id);

      res.json({
        status: 'success',
        data: {
          ticket,
          comments
        }
      });

    } catch (error) {
      console.error('Error fetching ticket:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch ticket',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update a ticket
   * PUT /api/tickets/:id
   */
  static async updateTicket(req, res) {
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
      const updateData = req.body;
      
      // Find the ticket first to validate status transitions
      const ticket = await Ticket.findById(id);
      
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }

      // Validate status transition if status is being changed
      if (updateData.status && updateData.status !== ticket.status) {
        if (!ticket.canTransitionTo(updateData.status)) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid status transition from '${ticket.status}' to '${updateData.status}'`
          });
        }
      }

      // Update the ticket
      const updatedTicket = await Ticket.findByIdAndUpdate(
        id,
        updateData,
        { 
          new: true, // Return updated document
          runValidators: true // Run schema validations
        }
      );

      res.json({
        status: 'success',
        message: 'Ticket updated successfully',
        data: {
          ticket: updatedTicket
        }
      });

    } catch (error) {
      console.error('Error updating ticket:', error);
      
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
        message: 'Failed to update ticket',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete a ticket
   * DELETE /api/tickets/:id
   */
  static async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      
      const ticket = await Ticket.findByIdAndDelete(id);
      
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }

      // Also delete all associated comments
      await Comment.deleteMany({ ticketId: id });

      res.json({
        status: 'success',
        message: 'Ticket and associated comments deleted successfully',
        data: {
          deletedTicket: ticket
        }
      });

    } catch (error) {
      console.error('Error deleting ticket:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to delete ticket',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get tickets by status
   * GET /api/tickets/status/:status
   */
  static async getTicketsByStatus(req, res) {
    try {
      const { status } = req.params;
      const { limit = 50 } = req.query;

      // Validate status
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
        });
      }

      const tickets = await Ticket.findByStatus(status)
        .sort({ updatedDate: -1 })
        .limit(parseInt(limit));

      res.json({
        status: 'success',
        data: {
          tickets,
          count: tickets.length
        }
      });

    } catch (error) {
      console.error('Error fetching tickets by status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tickets by status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get tickets assigned to a specific user
   * GET /api/tickets/assignee/:assignee
   */
  static async getTicketsByAssignee(req, res) {
    try {
      const { assignee } = req.params;
      const { status, limit = 50 } = req.query;

      let query = { assignee: { $regex: assignee, $options: 'i' } };
      if (status) {
        query.status = status;
      }

      const tickets = await Ticket.find(query)
        .sort({ updatedDate: -1 })
        .limit(parseInt(limit));

      res.json({
        status: 'success',
        data: {
          assignee,
          tickets,
          count: tickets.length
        }
      });

    } catch (error) {
      console.error('Error fetching tickets by assignee:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tickets by assignee',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update ticket status specifically
   * PATCH /api/tickets/:id/status
   */
  static async updateTicketStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          status: 'error',
          message: 'Status is required'
        });
      }

      const ticket = await Ticket.findById(id);
      
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }

      // Validate status transition
      if (!ticket.canTransitionTo(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status transition from '${ticket.status}' to '${status}'`
        });
      }

      ticket.status = status;
      const updatedTicket = await ticket.save();

      res.json({
        status: 'success',
        message: 'Ticket status updated successfully',
        data: {
          ticket: updatedTicket
        }
      });

    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update ticket status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = TicketController;