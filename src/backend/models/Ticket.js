const mongoose = require('mongoose');

/**
 * Ticket Schema for the Ticket Management System
 * Defines the structure and validation for tickets stored in MongoDB
 */
const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  status: {
    type: String,
    required: true,
    enum: {
      values: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
      message: 'Status must be one of: open, in_progress, resolved, closed, cancelled'
    },
    default: 'open'
  },
  
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Priority must be one of: low, medium, high, critical'
    },
    default: 'medium'
  },
  
  assignee: {
    type: String,
    required: [true, 'Assignee is required'],
    trim: true,
    minlength: [2, 'Assignee name must be at least 2 characters long'],
    maxlength: [50, 'Assignee name cannot exceed 50 characters']
  },
  
  reporter: {
    type: String,
    required: [true, 'Reporter is required'],
    trim: true,
    minlength: [2, 'Reporter name must be at least 2 characters long'],
    maxlength: [50, 'Reporter name cannot exceed 50 characters']
  },
  
  labels: {
    type: [String],
    default: [],
    validate: {
      validator: function(labels) {
        // Validate each label
        return labels.every(label => 
          typeof label === 'string' && 
          label.trim().length >= 2 && 
          label.trim().length <= 30
        );
      },
      message: 'Each label must be between 2 and 30 characters'
    }
  },
  
  resolutionDate: {
    type: Date,
    default: null
  }
}, {
  // Enable automatic createdAt and updatedAt timestamps
  timestamps: {
    createdAt: 'createdDate',
    updatedAt: 'updatedDate'
  },
  
  // Transform JSON output
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Pre-save middleware to handle status changes
 * Automatically sets resolutionDate when status changes to 'resolved' or 'closed'
 */
ticketSchema.pre('save', function() {
  // If status is being changed to resolved or closed, set resolutionDate
  if (this.isModified('status')) {
    if (this.status === 'resolved' || this.status === 'closed') {
      if (!this.resolutionDate) {
        this.resolutionDate = new Date();
      }
    } else {
      // Any non-terminal/open state (open, in_progress, cancelled) has no resolution date
      this.resolutionDate = null;
    }
  }
});

/**
 * Ticket status state machine.
 * Defines the only allowed transitions between statuses:
 *   open        -> in_progress, cancelled
 *   in_progress -> resolved, cancelled
 *   resolved    -> closed
 *   closed      -> (terminal)
 *   cancelled   -> (terminal)
 */
const STATUS_TRANSITIONS = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['closed'],
  closed: [],
  cancelled: []
};

/**
 * Instance method to validate status transitions.
 * Returns true only when moving to a status allowed by the state machine
 * from the ticket's current status. Transitioning to the same status is a no-op
 * and therefore allowed.
 */
ticketSchema.methods.canTransitionTo = function(newStatus) {
  if (newStatus === this.status) {
    return true;
  }
  const allowed = STATUS_TRANSITIONS[this.status];
  return Array.isArray(allowed) && allowed.includes(newStatus);
};

// Expose the transition map for reuse/testing
ticketSchema.statics.STATUS_TRANSITIONS = STATUS_TRANSITIONS;

/**
 * Static method to get tickets by status
 */
ticketSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

/**
 * Static method to get tickets by priority
 */
ticketSchema.statics.findByPriority = function(priority) {
  return this.find({ priority });
};

/**
 * Static method to get tickets assigned to a user
 */
ticketSchema.statics.findByAssignee = function(assignee) {
  return this.find({ assignee });
};

/**
 * Static method to get dashboard statistics
 */
ticketSchema.statics.getDashboardStats = function() {
  return this.aggregate([
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
};

/**
 * Index for better query performance
 */
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ assignee: 1 });
ticketSchema.index({ createdDate: -1 });
ticketSchema.index({ updatedDate: -1 });

// Create and export the model
const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;