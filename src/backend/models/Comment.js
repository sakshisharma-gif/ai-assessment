const mongoose = require('mongoose');

/**
 * Comment Schema for the Ticket Management System
 * Defines the structure and validation for comments associated with tickets
 */
const commentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket ID is required'],
    index: true // Index for better query performance
  },
  
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    minlength: [1, 'Comment must be at least 1 character long'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    minlength: [2, 'Author name must be at least 2 characters long'],
    maxlength: [50, 'Author name cannot exceed 50 characters']
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  // Enable automatic timestamps
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
 * Static method to find comments by ticket ID
 */
commentSchema.statics.findByTicketId = function(ticketId) {
  return this.find({ ticketId }).sort({ createdDate: 1 }); // Sort by createdDate ascending (oldest first)
};

/**
 * Static method to find comments by author
 */
commentSchema.statics.findByAuthor = function(author) {
  return this.find({ author: { $regex: author, $options: 'i' } }).sort({ createdDate: -1 });
};

/**
 * Static method to get comment statistics
 */
commentSchema.statics.getCommentStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        uniqueAuthors: { $addToSet: '$author' }
      }
    },
    {
      $project: {
        _id: 0,
        totalComments: 1,
        uniqueAuthors: { $size: '$uniqueAuthors' }
      }
    }
  ]);
};

/**
 * Static method to find recent comments
 */
commentSchema.statics.findRecent = function(limit = 10) {
  return this.find().sort({ createdDate: -1 }).limit(limit);
};

/**
 * Static method to find recent comments across all tickets
 */
commentSchema.statics.findRecentComments = function(limit = 10) {
  return this.find()
    .populate('ticketId', 'title')
    .sort({ createdDate: -1 })
    .limit(limit);
};

/**
 * Static method to get comment count for a ticket
 */
commentSchema.statics.getCommentCount = function(ticketId) {
  return this.countDocuments({ ticketId });
};

/**
 * Instance method to format comment for display
 */
commentSchema.methods.getDisplayFormat = function() {
  return {
    id: this._id,
    content: this.content,
    author: this.author,
    timestamp: this.timestamp,
    timeAgo: this.getTimeAgo()
  };
};

/**
 * Instance method to get human-readable time difference
 */
commentSchema.methods.getTimeAgo = function() {
  const now = new Date();
  const diff = now - this.timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

/**
 * Indexes for better query performance
 */
commentSchema.index({ ticketId: 1, createdDate: -1 }); // Compound index for ticket comments sorted by time
commentSchema.index({ createdDate: -1 }); // Index for recent comments queries

// Create and export the model
const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;