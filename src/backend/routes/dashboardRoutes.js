const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const {
  validateDashboardQuery,
  validateResourceParam,
  handleValidationErrors
} = require('../middleware/validation');

/**
 * Dashboard Routes
 * Defines all REST API endpoints for dashboard analytics and KPI metrics
 */

/**
 * @route GET /api/dashboard/stats
 * @desc Get comprehensive dashboard statistics including KPI metrics, trends, and recent activity
 * @access Public
 * @query {string} assignee - Optional assignee name to get user-specific data
 */
router.get('/stats', validateDashboardQuery, handleValidationErrors, DashboardController.getDashboardStats);

/**
 * @route GET /api/dashboard/kpi
 * @desc Get KPI metrics only (lightweight endpoint)
 * @access Public
 */
router.get('/kpi', DashboardController.getKPIMetrics);

/**
 * @route GET /api/dashboard/my-tickets
 * @desc Get tickets assigned to current user with statistics
 * @access Public
 * @query {string} assignee - Assignee name (required)
 * @query {string} status - Optional status filter
 * @query {number} limit - Number of tickets to return (default: 20)
 */
router.get('/my-tickets', validateDashboardQuery, DashboardController.getMyTickets);

/**
 * @route GET /api/dashboard/recent-activity
 * @desc Get recent activity including updated tickets and new comments
 * @access Public
 * @query {number} limit - Number of items to return (default: 10)
 */
router.get('/recent-activity', validateDashboardQuery, DashboardController.getRecentActivity);

/**
 * @route GET /api/dashboard/trends
 * @desc Get ticket trends and analytics over time
 * @access Public
 * @query {number} days - Number of days to analyze (default: 30, max: 365)
 */
router.get('/trends', validateDashboardQuery, DashboardController.getTrends);

/**
 * @route GET /api/dashboard/team/:teamId
 * @desc Get team-specific dashboard with member breakdown and completion metrics
 * @access Public
 */
router.get('/team/:teamId', validateResourceParam('teamId'), handleValidationErrors, DashboardController.getTeamDashboard);

/**
 * @route GET /api/dashboard/user/:userId
 * @desc Get user-specific dashboard with assigned tickets and productivity metrics
 * @access Public
 */
router.get('/user/:userId', validateResourceParam('userId'), handleValidationErrors, DashboardController.getUserDashboard);

module.exports = router;