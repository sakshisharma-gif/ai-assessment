/**
 * Custom Jest Matchers for API Testing
 * Provides specialized matchers for testing API responses and data structures
 */

// Extend Jest matchers
expect.extend({
  /**
   * Check if response has proper API error format
   */
  toHaveApiErrorFormat(received) {
    const pass = (
      received &&
      typeof received === 'object' &&
      received.status === 'error' &&
      typeof received.message === 'string' &&
      received.timestamp &&
      !isNaN(Date.parse(received.timestamp))
    );

    if (pass) {
      return {
        message: () => `Expected response not to have API error format`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected response to have API error format with status: 'error', message: string, and timestamp`,
        pass: false
      };
    }
  },

  /**
   * Check if response has proper API success format
   */
  toHaveApiSuccessFormat(received) {
    const pass = (
      received &&
      typeof received === 'object' &&
      received.status === 'success' &&
      received.data !== undefined &&
      received.timestamp &&
      !isNaN(Date.parse(received.timestamp))
    );

    if (pass) {
      return {
        message: () => `Expected response not to have API success format`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected response to have API success format with status: 'success', data object, and timestamp`,
        pass: false
      };
    }
  },

  /**
   * Check if pagination object has required properties
   */
  toHaveValidPagination(received) {
    const pass = (
      received &&
      typeof received === 'object' &&
      typeof received.currentPage === 'number' &&
      typeof received.totalPages === 'number' &&
      typeof received.totalCount === 'number' &&
      typeof received.hasNextPage === 'boolean' &&
      typeof received.hasPrevPage === 'boolean' &&
      received.currentPage >= 1 &&
      received.totalPages >= 0 &&
      received.totalCount >= 0
    );

    if (pass) {
      return {
        message: () => `Expected pagination object not to be valid`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected pagination object to have valid currentPage, totalPages, totalCount, hasNextPage, and hasPrevPage properties`,
        pass: false
      };
    }
  },

  /**
   * Check if ticket object has all required properties
   */
  toBeValidTicket(received) {
    const requiredFields = ['id', 'title', 'description', 'status', 'priority', 'assignee', 'reporter', 'createdDate', 'updatedDate'];
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    const hasAllFields = requiredFields.every(field => received[field] !== undefined);
    const hasValidStatus = validStatuses.includes(received.status);
    const hasValidPriority = validPriorities.includes(received.priority);
    const hasValidDates = !isNaN(Date.parse(received.createdDate)) && !isNaN(Date.parse(received.updatedDate));

    const pass = hasAllFields && hasValidStatus && hasValidPriority && hasValidDates;

    if (pass) {
      return {
        message: () => `Expected object not to be a valid ticket`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected object to be a valid ticket with all required fields and valid status/priority values`,
        pass: false
      };
    }
  },

  /**
   * Check if comment object has all required properties
   */
  toBeValidComment(received) {
    const requiredFields = ['id', 'content', 'author', 'ticketId', 'createdDate', 'updatedDate'];
    
    const hasAllFields = requiredFields.every(field => received[field] !== undefined);
    const hasValidDates = !isNaN(Date.parse(received.createdDate)) && !isNaN(Date.parse(received.updatedDate));
    const hasValidContent = typeof received.content === 'string' && received.content.length > 0;
    const hasValidAuthor = typeof received.author === 'string' && received.author.length >= 2;

    const pass = hasAllFields && hasValidDates && hasValidContent && hasValidAuthor;

    if (pass) {
      return {
        message: () => `Expected object not to be a valid comment`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected object to be a valid comment with all required fields and valid content/author`,
        pass: false
      };
    }
  },

  /**
   * Check if dashboard stats have required structure
   */
  toHaveValidDashboardStats(received) {
    const requiredStats = [
      'totalTickets', 'openTickets', 'inProgressTickets', 'resolvedTickets', 'closedTickets'
    ];
    
    const hasAllStats = requiredStats.every(stat => 
      received[stat] !== undefined && typeof received[stat] === 'number' && received[stat] >= 0
    );

    const hasPriorityBreakdown = (
      received.priorityBreakdown &&
      typeof received.priorityBreakdown === 'object' &&
      ['critical', 'high', 'medium', 'low'].every(priority =>
        typeof received.priorityBreakdown[priority] === 'number'
      )
    );

    const hasAssigneeBreakdown = (
      Array.isArray(received.assigneeBreakdown) &&
      received.assigneeBreakdown.every(item =>
        item.assignee && typeof item.count === 'number'
      )
    );

    const pass = hasAllStats && hasPriorityBreakdown && hasAssigneeBreakdown;

    if (pass) {
      return {
        message: () => `Expected object not to have valid dashboard stats`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected object to have valid dashboard stats with all required metrics and breakdowns`,
        pass: false
      };
    }
  },

  /**
   * Check if MongoDB ObjectId is valid format
   */
  toBeValidObjectId(received) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const pass = typeof received === 'string' && objectIdRegex.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid ObjectId`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid MongoDB ObjectId (24 character hex string)`,
        pass: false
      };
    }
  },

  /**
   * Check if array contains unique items by property
   */
  toHaveUniqueItemsBy(received, property) {
    if (!Array.isArray(received)) {
      return {
        message: () => `Expected ${received} to be an array`,
        pass: false
      };
    }

    const values = received.map(item => item[property]);
    const uniqueValues = [...new Set(values)];
    const pass = values.length === uniqueValues.length;

    if (pass) {
      return {
        message: () => `Expected array not to have unique items by ${property}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected array to have unique items by property ${property}`,
        pass: false
      };
    }
  },

  /**
   * Check if date string is within a time range
   */
  toBeRecentDate(received, minutesAgo = 5) {
    const receivedDate = new Date(received);
    const now = new Date();
    const threshold = new Date(now.getTime() - (minutesAgo * 60 * 1000));

    const pass = receivedDate >= threshold && receivedDate <= now;

    if (pass) {
      return {
        message: () => `Expected ${received} not to be within the last ${minutesAgo} minutes`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be within the last ${minutesAgo} minutes`,
        pass: false
      };
    }
  },

  /**
   * Check if response time is acceptable
   */
  toHaveAcceptableResponseTime(received, maxMs = 1000) {
    const pass = typeof received === 'number' && received <= maxMs;

    if (pass) {
      return {
        message: () => `Expected response time ${received}ms not to be acceptable (should be > ${maxMs}ms)`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected response time ${received}ms to be acceptable (should be <= ${maxMs}ms)`,
        pass: false
      };
    }
  }
});

// Helper function to measure response time
global.measureResponseTime = (startTime) => {
  return Date.now() - startTime;
};

// Helper function to create test data
global.createTestTicket = (overrides = {}) => {
  return {
    title: 'Test Ticket',
    description: 'This is a test ticket for automated testing purposes',
    status: 'open',
    priority: 'medium',
    assignee: 'Test Developer',
    reporter: 'Test User',
    labels: ['test', 'automation'],
    ...overrides
  };
};

global.createTestComment = (ticketId, overrides = {}) => {
  return {
    content: 'This is a test comment for automated testing',
    author: 'Test Commenter',
    ticketId: ticketId,
    ...overrides
  };
};

// Console logging for test debugging
global.logTestInfo = (message, data = null) => {
  if (process.env.TEST_DEBUG === 'true') {
    console.log(`[TEST INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Error logging for test debugging
global.logTestError = (message, error = null) => {
  console.error(`[TEST ERROR] ${message}`, error ? error.message || error : '');
};