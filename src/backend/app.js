const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connect, getConnectionStatus } = require('./config/database');
require('dotenv').config();

/**
 * Express application setup following clean architecture principles
 * This file contains the Express app configuration without starting the server
 * Server startup is handled separately in server.js for better testability
 */
const app = express();

// Security middleware - Set various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration - Allow cross-origin requests from frontend
// Supports a comma-separated list of origins via FRONTEND_URL, with sensible dev defaults
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3001,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.LOG_FORMAT || 'combined'));
}

// Body parsing middleware
app.use(express.json({
  limit: '10mb',
  strict: true
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  
  res.status(200).json({
    status: 'OK',
    message: 'Ticket Management System API is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    database: {
      connected: dbStatus.isConnected,
      name: dbStatus.name,
      collections: dbStatus.collections?.length || 0
    }
  });
});

// Database connection endpoint for debugging
app.get('/health/database', (req, res) => {
  const dbStatus = getConnectionStatus();
  
  res.status(dbStatus.isConnected ? 200 : 503).json({
    database: {
      connected: dbStatus.isConnected,
      readyState: dbStatus.readyState,
      host: dbStatus.host,
      port: dbStatus.port,
      name: dbStatus.name,
      collections: dbStatus.collections
    },
    timestamp: new Date().toISOString()
  });
});

// Import and use API routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Internal Server Error';
  }

  res.status(status).json({
    status: 'error',
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

/**
 * Initialize database connection
 * This function should be called before starting the server
 */
async function initializeDatabase() {
  try {
    await connect();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    // In development, we can continue without database for basic API testing
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Development mode: Continuing without database connection');
      return;
    }
    
    // In production, database is required
    throw error;
  }
}

module.exports = { app, initializeDatabase };