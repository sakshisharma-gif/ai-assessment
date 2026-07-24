const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware using express-validator
 * Provides validation rules for different API endpoints
 */

/**
 * Shared handler that returns a 400 response when any validation rule fails.
 * Use after a set of validators on routes whose controllers do not
 * inspect validationResult themselves.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for creating a new ticket
 */
const validateCreateTicket = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),
  
  body('assignee')
    .trim()
    .notEmpty()
    .withMessage('Assignee is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Assignee must be between 2 and 50 characters'),
  
  body('reporter')
    .trim()
    .notEmpty()
    .withMessage('Reporter is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Reporter must be between 2 and 50 characters'),
  
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array')
    .custom((labels) => {
      if (labels && labels.length > 0) {
        const isValid = labels.every(label => 
          typeof label === 'string' && 
          label.trim().length >= 2 && 
          label.trim().length <= 30
        );
        if (!isValid) {
          throw new Error('Each label must be between 2 and 30 characters');
        }
      }
      return true;
    })
];

/**
 * Validation rules for updating a ticket
 */
const validateUpdateTicket = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'resolved', 'closed', 'cancelled'])
    .withMessage('Status must be one of: open, in_progress, resolved, closed, cancelled'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),
  
  body('assignee')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Assignee must be between 2 and 50 characters'),
  
  body('reporter')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Reporter must be between 2 and 50 characters'),
  
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array')
    .custom((labels) => {
      if (labels && labels.length > 0) {
        const isValid = labels.every(label => 
          typeof label === 'string' && 
          label.trim().length >= 2 && 
          label.trim().length <= 30
        );
        if (!isValid) {
          throw new Error('Each label must be between 2 and 30 characters');
        }
      }
      return true;
    })
];

/**
 * Validation rules for updating ticket status
 */
const validateUpdateTicketStatus = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['open', 'in_progress', 'resolved', 'closed', 'cancelled'])
    .withMessage('Status must be one of: open, in_progress, resolved, closed, cancelled')
];

/**
 * Validation rules for ticket ID parameter
 */
const validateTicketId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID')
];

/**
 * Validation rules for status parameter
 */
const validateStatusParam = [
  param('status')
    .isIn(['open', 'in_progress', 'resolved', 'closed', 'cancelled'])
    .withMessage('Status must be one of: open, in_progress, resolved, closed, cancelled')
];

/**
 * Validation rules for query parameters
 */
const validateTicketQuery = [
  query('status')
    .optional()
    .isIn(['open', 'in_progress', 'resolved', 'closed', 'cancelled'])
    .withMessage('Status must be one of: open, in_progress, resolved, closed, cancelled'),
  
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdDate', 'updatedDate', 'title', 'status', 'priority'])
    .withMessage('SortBy must be one of: createdDate, updatedDate, title, status, priority'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder must be either asc or desc')
];

/**
 * Validation rules for adding a comment
 */
const validateAddComment = [
  param('ticketId')
    .isMongoId()
    .withMessage('Invalid ticket ID'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  
  body('author')
    .trim()
    .notEmpty()
    .withMessage('Author is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Author must be between 2 and 50 characters')
];

/**
 * Validation rules for updating a comment
 */
const validateUpdateComment = [
  param('id')
    .isMongoId()
    .withMessage('Invalid comment ID'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

/**
 * Validation rules for comment ID parameter
 */
const validateCommentId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid comment ID')
];

/**
 * Validation rules for comment query parameters
 */
const validateCommentQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for dashboard query parameters
 */
const validateDashboardQuery = [
  query('assignee')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Assignee must be between 2 and 50 characters'),
  
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for startDate'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for endDate')
];

/**
 * Validation rules for a dashboard resource identifier (team/user).
 * Rejects obviously malformed or unsafe values (e.g. HTML/script injection).
 */
const validateResourceParam = (paramName) => [
  param(paramName)
    .trim()
    .notEmpty()
    .withMessage(`${paramName} is required`)
    .isLength({ min: 1, max: 100 })
    .withMessage(`${paramName} must be between 1 and 100 characters`)
    .matches(/^[\w .@-]+$/)
    .withMessage(`${paramName} contains invalid characters`)
];

/**
 * Validation rules for assignee parameter
 */
const validateAssigneeParam = [
  param('assignee')
    .trim()
    .notEmpty()
    .withMessage('Assignee is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Assignee must be between 2 and 50 characters')
];

module.exports = {
  validateCreateTicket,
  validateUpdateTicket,
  validateUpdateTicketStatus,
  validateTicketId,
  validateStatusParam,
  validateTicketQuery,
  validateAddComment,
  validateUpdateComment,
  validateCommentId,
  validateCommentQuery,
  validateDashboardQuery,
  validateResourceParam,
  validateAssigneeParam,
  handleValidationErrors
};