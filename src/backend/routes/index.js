const express = require('express');
const router = express.Router();

// Import route modules
const ticketRoutes = require('./ticketRoutes');
const commentRoutes = require('./commentRoutes');
const ticketCommentRoutes = require('./ticketCommentRoutes');
const dashboardRoutes = require('./dashboardRoutes');

/**
 * Main API Routes
 * Organizes all application routes under /api prefix
 */

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Ticket Management System API',
    version: process.env.API_VERSION || '1.0.0',
    documentation: {
      endpoints: {
        tickets: '/api/tickets',
        comments: '/api/comments',
        dashboard: '/api/dashboard',
        health: '/health'
      },
      features: [
        'Create, read, update, delete tickets',
        'Add and manage comments on tickets',
        'Status state machine for ticket workflow',
        'Dashboard with KPI metrics and analytics',
        'Search and filter tickets',
        'Pagination support',
        'Data validation and error handling'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
router.use('/tickets', ticketRoutes);
router.use('/comments', commentRoutes);
router.use('/dashboard', dashboardRoutes);

// Nested routes for ticket comments
router.use('/tickets/:ticketId/comments', (req, res, next) => {
  // Pass ticketId to nested router
  req.ticketId = req.params.ticketId;
  next();
}, ticketCommentRoutes);

module.exports = router;