const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');

/**
 * Dashboard Controller
 * Handles dashboard-related operations including KPI metrics and analytics
 */
class DashboardController {
  
  /**
   * Get comprehensive dashboard statistics
   * GET /api/dashboard/stats
   */
  static async getDashboardStats(req, res) {
    try {
      const { startDate, endDate, priority, status } = req.query;

      // Build date filter if provided
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdDate = {};
        if (startDate) dateFilter.createdDate.$gte = new Date(startDate);
        if (endDate) dateFilter.createdDate.$lte = new Date(endDate);
      }

      // Additional filters
      const additionalFilters = {};
      if (priority) additionalFilters.priority = priority;
      if (status) additionalFilters.status = status;

      const combinedFilter = { ...dateFilter, ...additionalFilters };

      // Get basic ticket statistics
      const basicStats = await Ticket.aggregate([
        { $match: combinedFilter },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            openTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
            },
            inProgressTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
            },
            resolvedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            closedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
            }
          }
        }
      ]);

      const stats = basicStats[0] || {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0
      };

      // Get tickets by priority
      const priorityStats = await Ticket.aggregate([
        { $match: combinedFilter },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      // Transform priority stats into object
      const priorityBreakdown = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      priorityStats.forEach(item => {
        if (priorityBreakdown.hasOwnProperty(item._id)) {
          priorityBreakdown[item._id] = item.count;
        }
      });

      // Get assignee breakdown
      const assigneeStats = await Ticket.aggregate([
        { $match: combinedFilter },
        {
          $group: {
            _id: '$assignee',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        }
      ]);

      const assigneeBreakdown = assigneeStats.map(item => ({
        assignee: item._id,
        count: item.count
      }));

      // Get recent activity (recently updated tickets)
      const recentActivity = await Ticket.find(combinedFilter)
        .sort({ updatedDate: -1 })
        .limit(5)
        .select('_id title status priority assignee updatedDate')
        .lean();

      // Calculate status percentages
      const statusPercentages = {
        open: stats.totalTickets > 0 ? Math.round((stats.openTickets / stats.totalTickets) * 100) : 0,
        inProgress: stats.totalTickets > 0 ? Math.round((stats.inProgressTickets / stats.totalTickets) * 100) : 0,
        resolved: stats.totalTickets > 0 ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0,
        closed: stats.totalTickets > 0 ? Math.round((stats.closedTickets / stats.totalTickets) * 100) : 0
      };

      res.json({
        status: 'success',
        data: {
          ...stats,
          priorityBreakdown,
          assigneeBreakdown,
          recentActivity,
          statusPercentages
        },
        timestamp: new Date().toISOString(),
        meta: {
          queryTime: Date.now(),
          filters: combinedFilter
        }
      });

    } catch (error) {
      console.error('Error generating dashboard stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate dashboard statistics',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get team-specific dashboard
   * GET /api/dashboard/team/:teamId
   */
  static async getTeamDashboard(req, res) {
    try {
      const { teamId } = req.params;

      // Filter tickets by team (assuming team is identified by assignee pattern)
      const teamFilter = {
        assignee: { $regex: teamId, $options: 'i' }
      };

      const teamTickets = await Ticket.find(teamFilter);
      const totalTickets = teamTickets.length;
      const activeTickets = teamTickets.filter(t => ['open', 'in_progress'].includes(t.status)).length;
      const completedTickets = teamTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;

      // Get team member breakdown
      const teamMembers = await Ticket.aggregate([
        { $match: teamFilter },
        {
          $group: {
            _id: '$assignee',
            assignedTickets: { $sum: 1 },
            completedTickets: {
              $sum: {
                $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0]
              }
            }
          }
        }
      ]);

      // Calculate team metrics
      const completionRate = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;
      
      const resolvedTeamTickets = teamTickets.filter(t => t.resolutionDate);
      let avgTimeToCompletion = 0;
      if (resolvedTeamTickets.length > 0) {
        const totalTime = resolvedTeamTickets.reduce((sum, ticket) => {
          return sum + (ticket.resolutionDate.getTime() - ticket.createdDate.getTime());
        }, 0);
        avgTimeToCompletion = Math.round(totalTime / resolvedTeamTickets.length / (1000 * 60 * 60)); // in hours
      }

      res.json({
        status: 'success',
        data: {
          teamName: teamId,
          totalTickets,
          activeTickets,
          completedTickets,
          completionRate,
          avgTimeToCompletion,
          teamMembers: teamMembers.map(member => ({
            name: member._id,
            assignedTickets: member.assignedTickets,
            completedTickets: member.completedTickets,
            completionRate: member.assignedTickets > 0 ? Math.round((member.completedTickets / member.assignedTickets) * 100) : 0
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error generating team dashboard:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate team dashboard',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user-specific dashboard
   * GET /api/dashboard/user/:userId
   */
  static async getUserDashboard(req, res) {
    try {
      const { userId } = req.params;

      // Get tickets assigned to user
      const assignedTickets = await Ticket.countDocuments({
        assignee: { $regex: userId, $options: 'i' }
      });

      // Get tickets created by user
      const createdTickets = await Ticket.countDocuments({
        reporter: { $regex: userId, $options: 'i' }
      });

      // Get completed tickets by user
      const completedTickets = await Ticket.countDocuments({
        assignee: { $regex: userId, $options: 'i' },
        status: { $in: ['resolved', 'closed'] }
      });

      // Get recent assignments
      const recentAssignments = await Ticket.find({
        assignee: { $regex: userId, $options: 'i' }
      })
      .sort({ updatedDate: -1 })
      .limit(5)
      .select('_id title status priority updatedDate')
      .lean();

      // Calculate productivity metrics
      const productivityScore = assignedTickets > 0 ? Math.round((completedTickets / assignedTickets) * 100) : 0;

      const userResolvedTickets = await Ticket.find({
        assignee: { $regex: userId, $options: 'i' },
        resolutionDate: { $exists: true, $ne: null }
      }).select('createdDate resolutionDate');

      let avgCompletionTime = 0;
      if (userResolvedTickets.length > 0) {
        const totalTime = userResolvedTickets.reduce((sum, ticket) => {
          if (ticket.resolutionDate && ticket.createdDate) {
            return sum + (ticket.resolutionDate.getTime() - ticket.createdDate.getTime());
          }
          return sum;
        }, 0);
        avgCompletionTime = Math.round(totalTime / userResolvedTickets.length / (1000 * 60 * 60)); // in hours
      }

      res.json({
        status: 'success',
        data: {
          userId,
          assignedTickets,
          createdTickets,
          completedTickets,
          productivityScore,
          avgCompletionTime,
          recentActivity: recentAssignments.map(ticket => ({
            ticketId: ticket._id,
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
            assignedDate: ticket.updatedDate
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error generating user dashboard:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate user dashboard',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get KPI metrics only
   * GET /api/dashboard/kpi
   */
  static async getKPIMetrics(req, res) {
    try {
      // Get basic ticket statistics
      const basicStats = await Ticket.getDashboardStats();
      const stats = basicStats[0] || {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0
      };

      // Get tickets by priority
      const priorityStats = await Ticket.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      const ticketsByPriority = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      priorityStats.forEach(item => {
        if (ticketsByPriority.hasOwnProperty(item._id)) {
          ticketsByPriority[item._id] = item.count;
        }
      });

      res.json({
        status: 'success',
        data: {
          totalTickets: stats.totalTickets,
          openTickets: stats.openTickets,
          inProgressTickets: stats.inProgressTickets,
          resolvedTickets: stats.resolvedTickets,
          closedTickets: stats.closedTickets,
          ticketsByPriority
        }
      });

    } catch (error) {
      console.error('Error fetching KPI metrics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch KPI metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get tickets assigned to current user
   * GET /api/dashboard/my-tickets
   */
  static async getMyTickets(req, res) {
    try {
      const { assignee, status, limit = 20 } = req.query;

      if (!assignee) {
        return res.status(400).json({
          status: 'error',
          message: 'Assignee parameter is required'
        });
      }

      let query = { assignee: { $regex: assignee, $options: 'i' } };
      if (status) {
        query.status = status;
      }

      const tickets = await Ticket.find(query)
        .sort({ updatedDate: -1 })
        .limit(parseInt(limit));

      // Get ticket count by status for this user
      const statusCounts = await Ticket.aggregate([
        {
          $match: { assignee: { $regex: assignee, $options: 'i' } }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const userTicketStats = {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0
      };

      statusCounts.forEach(item => {
        if (userTicketStats.hasOwnProperty(item._id)) {
          userTicketStats[item._id] = item.count;
        }
      });

      res.json({
        status: 'success',
        data: {
          assignee,
          tickets,
          statistics: userTicketStats,
          totalTickets: tickets.length
        }
      });

    } catch (error) {
      console.error('Error fetching user tickets:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch user tickets',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get recent activity
   * GET /api/dashboard/recent-activity
   */
  static async getRecentActivity(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Get recently updated tickets
      const recentTickets = await Ticket.find()
        .sort({ updatedDate: -1 })
        .limit(parseInt(limit))
        .select('title status priority assignee updatedDate');

      // Get recent comments
      const recentComments = await Comment.findRecentComments(parseInt(limit));

      res.json({
        status: 'success',
        data: {
          recentTickets,
          recentComments: recentComments.map(comment => ({
            id: comment._id,
            content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
            author: comment.author,
            timestamp: comment.timestamp,
            ticketTitle: comment.ticketId?.title || 'Unknown'
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch recent activity',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get ticket trends and analytics
   * GET /api/dashboard/trends
   */
  static async getTrends(req, res) {
    try {
      const { days = 30 } = req.query;
      const daysCount = parseInt(days);
      const startDate = new Date(Date.now() - daysCount * 24 * 60 * 60 * 1000);

      // Daily ticket creation trend
      const dailyCreationTrend = await Ticket.aggregate([
        {
          $match: {
            createdDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdDate'
                }
              }
            },
            created: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      // Daily ticket resolution trend
      const dailyResolutionTrend = await Ticket.aggregate([
        {
          $match: {
            resolutionDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$resolutionDate'
                }
              }
            },
            resolved: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      // Priority distribution over time
      const priorityTrend = await Ticket.aggregate([
        {
          $match: {
            createdDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              priority: '$priority',
              week: {
                $week: '$createdDate'
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.week': 1 }
        }
      ]);

      // Calculate average resolution time
      const resolvedTickets = await Ticket.find({
        status: { $in: ['resolved', 'closed'] },
        resolutionDate: { $exists: true, $ne: null },
        createdDate: { $exists: true, $ne: null }
      }).select('createdDate resolutionDate');

      let avgResolutionTime = 0;
      if (resolvedTickets.length > 0) {
        const totalTime = resolvedTickets.reduce((sum, ticket) => {
          if (ticket.resolutionDate && ticket.createdDate) {
            return sum + (ticket.resolutionDate.getTime() - ticket.createdDate.getTime());
          }
          return sum;
        }, 0);
        avgResolutionTime = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60)); // in hours
      }

      // Normalize aggregation output into clean { date, count } data points
      const creationTrend = dailyCreationTrend.map(item => ({
        date: item._id.date,
        count: item.created
      }));

      const resolutionTrend = dailyResolutionTrend.map(item => ({
        date: item._id.date,
        count: item.resolved
      }));

      res.json({
        status: 'success',
        data: {
          period: `${daysCount} days`,
          creationTrend,
          resolutionTrend,
          avgResolutionTime,
          priorityTrend
        }
      });

    } catch (error) {
      console.error('Error fetching trends:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch trends',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = DashboardController;