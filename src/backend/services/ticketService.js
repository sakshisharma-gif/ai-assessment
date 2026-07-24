const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');

/**
 * Ticket Service Layer
 * Handles business logic for ticket operations
 */
class TicketService {
  
  /**
   * Create a new ticket with business logic validation
   */
  static async createTicket(ticketData) {
    try {
      // Business logic: Auto-assign reporter as assignee if not specified
      if (!ticketData.assignee && ticketData.reporter) {
        ticketData.assignee = ticketData.reporter;
      }

      // Business logic: Clean and validate labels
      if (ticketData.labels && Array.isArray(ticketData.labels)) {
        ticketData.labels = ticketData.labels
          .map(label => label.trim().toLowerCase())
          .filter(label => label.length > 0)
          .filter((label, index, self) => self.indexOf(label) === index); // Remove duplicates
      }

      const ticket = new Ticket(ticketData);
      return await ticket.save();
    } catch (error) {
      throw new Error(`Failed to create ticket: ${error.message}`);
    }
  }

  /**
   * Get tickets with advanced filtering and business logic
   */
  static async getTickets(filterOptions = {}) {
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
        sortOrder = 'desc',
        dateFrom,
        dateTo
      } = filterOptions;

      // Build filter object
      const filter = {};
      
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (assignee) filter.assignee = { $regex: assignee, $options: 'i' };
      if (reporter) filter.reporter = { $regex: reporter, $options: 'i' };
      
      // Date range filtering
      if (dateFrom || dateTo) {
        filter.createdDate = {};
        if (dateFrom) filter.createdDate.$gte = new Date(dateFrom);
        if (dateTo) filter.createdDate.$lte = new Date(dateTo);
      }
      
      // Search functionality
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { assignee: { $regex: search, $options: 'i' } },
          { reporter: { $regex: search, $options: 'i' } },
          { labels: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const tickets = await Ticket.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum);

      const totalCount = await Ticket.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limitNum);

      return {
        tickets,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filter
      };
    } catch (error) {
      throw new Error(`Failed to get tickets: ${error.message}`);
    }
  }

  /**
   * Update ticket with business logic and validation
   */
  static async updateTicket(ticketId, updateData) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Business logic: Validate status transitions
      if (updateData.status && updateData.status !== ticket.status) {
        if (!ticket.canTransitionTo(updateData.status)) {
          throw new Error(`Invalid status transition from '${ticket.status}' to '${updateData.status}'`);
        }
      }

      // Business logic: Clean labels if provided
      if (updateData.labels && Array.isArray(updateData.labels)) {
        updateData.labels = updateData.labels
          .map(label => label.trim().toLowerCase())
          .filter(label => label.length > 0)
          .filter((label, index, self) => self.indexOf(label) === index);
      }

      // Business logic: Log status change reason
      if (updateData.status && updateData.status !== ticket.status) {
        console.log(`Ticket ${ticketId}: Status changed from ${ticket.status} to ${updateData.status}`);
      }

      const updatedTicket = await Ticket.findByIdAndUpdate(
        ticketId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedTicket;
    } catch (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  }

  /**
   * Delete ticket with cascade deletion
   */
  static async deleteTicket(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Business logic: Check if ticket can be deleted
      if (ticket.status === 'in_progress') {
        throw new Error('Cannot delete tickets that are in progress. Please change status first.');
      }

      // Delete associated comments first
      const deletedComments = await Comment.deleteMany({ ticketId });
      
      // Delete the ticket
      const deletedTicket = await Ticket.findByIdAndDelete(ticketId);

      return {
        ticket: deletedTicket,
        deletedCommentsCount: deletedComments.deletedCount
      };
    } catch (error) {
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  }

  /**
   * Get ticket with full details including comments
   */
  static async getTicketDetails(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const comments = await Comment.findByTicketId(ticketId);
      const commentCount = comments.length;
      
      // Business logic: Add computed fields
      const ticketWithDetails = {
        ...ticket.toJSON(),
        commentCount,
        isOverdue: this.isTicketOverdue(ticket),
        timeOpen: this.getTimeOpen(ticket),
        lastActivity: comments.length > 0 
          ? Math.max(ticket.updatedDate, comments[comments.length - 1].timestamp)
          : ticket.updatedDate
      };

      return {
        ticket: ticketWithDetails,
        comments
      };
    } catch (error) {
      throw new Error(`Failed to get ticket details: ${error.message}`);
    }
  }

  /**
   * Get tickets summary for dashboard
   */
  static async getTicketsSummary() {
    try {
      const summary = await Ticket.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            priorityCounts: [
              {
                $group: {
                  _id: '$priority',
                  count: { $sum: 1 }
                }
              }
            ],
            totalCount: [
              {
                $count: 'total'
              }
            ],
            avgResolutionTime: [
              {
                $match: {
                  resolutionDate: { $ne: null }
                }
              },
              {
                $project: {
                  resolutionTimeMs: {
                    $subtract: ['$resolutionDate', '$createdDate']
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  avgTime: { $avg: '$resolutionTimeMs' }
                }
              }
            ]
          }
        }
      ]);

      return summary[0];
    } catch (error) {
      throw new Error(`Failed to get tickets summary: ${error.message}`);
    }
  }

  /**
   * Business logic helper: Check if ticket is overdue
   */
  static isTicketOverdue(ticket) {
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return false;
    }

    const now = new Date();
    const createdDate = new Date(ticket.createdDate);
    const daysPassed = (now - createdDate) / (1000 * 60 * 60 * 24);

    // Business rule: High and critical priority tickets are overdue after 3 days
    // Medium priority after 7 days, low priority after 14 days
    const overdueThresholds = {
      critical: 1,
      high: 3,
      medium: 7,
      low: 14
    };

    return daysPassed > (overdueThresholds[ticket.priority] || 7);
  }

  /**
   * Business logic helper: Get time ticket has been open
   */
  static getTimeOpen(ticket) {
    const now = new Date();
    const createdDate = new Date(ticket.createdDate);
    const msOpen = now - createdDate;
    
    const days = Math.floor(msOpen / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msOpen % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return {
      totalHours: Math.floor(msOpen / (1000 * 60 * 60)),
      days,
      hours,
      humanReadable: `${days} days, ${hours} hours`
    };
  }
}

module.exports = TicketService;