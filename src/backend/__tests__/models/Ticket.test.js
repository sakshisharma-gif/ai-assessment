/**
 * Unit tests for Ticket Model
 * Tests model validation, business logic, and database operations with real MongoDB
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Ticket = require('../../models/Ticket');

describe('Ticket Model', () => {
  let mongoServer;

  // Setup in-memory MongoDB for testing
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all test data before each test
    await Ticket.deleteMany({});
  });

  describe('Model Validation', () => {
    const validTicketData = {
      title: 'Test Ticket',
      description: 'This is a test ticket for validation',
      priority: 'medium',
      assignee: 'John Doe',
      reporter: 'Jane Smith'
    };

    test('should create a valid ticket with required fields', async () => {
      const ticket = new Ticket(validTicketData);
      const savedTicket = await ticket.save();

      expect(savedTicket._id).toBeDefined();
      expect(savedTicket.title).toBe(validTicketData.title);
      expect(savedTicket.description).toBe(validTicketData.description);
      expect(savedTicket.status).toBe('open'); // Default status
      expect(savedTicket.priority).toBe(validTicketData.priority);
      expect(savedTicket.assignee).toBe(validTicketData.assignee);
      expect(savedTicket.reporter).toBe(validTicketData.reporter);
      expect(savedTicket.createdDate).toBeDefined();
      expect(savedTicket.updatedDate).toBeDefined();
      expect(savedTicket.resolutionDate).toBeNull();
    });

    test('should fail validation when required fields are missing', async () => {
      const ticket = new Ticket({});
      
      await expect(ticket.save()).rejects.toThrow();
    });

    test('should fail validation with invalid status', async () => {
      const ticketData = {
        ...validTicketData,
        status: 'invalid_status'
      };
      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow();
    });

    test('should fail validation with invalid priority', async () => {
      const ticketData = {
        ...validTicketData,
        priority: 'invalid_priority'
      };
      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow();
    });

    test('should validate title length constraints', async () => {
      // Title too short
      const shortTitleTicket = new Ticket({
        ...validTicketData,
        title: 'AB' // Less than 3 characters
      });
      await expect(shortTitleTicket.save()).rejects.toThrow();

      // Title too long
      const longTitleTicket = new Ticket({
        ...validTicketData,
        title: 'A'.repeat(101) // More than 100 characters
      });
      await expect(longTitleTicket.save()).rejects.toThrow();
    });

    test('should validate description length constraints', async () => {
      // Description too short
      const shortDescTicket = new Ticket({
        ...validTicketData,
        description: 'Short' // Less than 10 characters
      });
      await expect(shortDescTicket.save()).rejects.toThrow();

      // Description too long
      const longDescTicket = new Ticket({
        ...validTicketData,
        description: 'A'.repeat(2001) // More than 2000 characters
      });
      await expect(longDescTicket.save()).rejects.toThrow();
    });

    test('should validate labels array', async () => {
      // Valid labels
      const validLabelsTicket = new Ticket({
        ...validTicketData,
        labels: ['bug', 'urgent', 'frontend']
      });
      const savedTicket = await validLabelsTicket.save();
      expect(savedTicket.labels).toEqual(['bug', 'urgent', 'frontend']);

      // Invalid label (too short)
      const invalidLabelTicket = new Ticket({
        ...validTicketData,
        labels: ['a'] // Less than 2 characters
      });
      await expect(invalidLabelTicket.save()).rejects.toThrow();
    });
  });

  describe('Status Transition Logic', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = new Ticket({
        title: 'Status Test Ticket',
        description: 'Testing status transitions',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();
    });

    test('should allow valid status transitions from open', async () => {
      expect(testTicket.status).toBe('open');

      // open -> in_progress and open -> cancelled are the only valid moves
      expect(testTicket.canTransitionTo('in_progress')).toBe(true);
      expect(testTicket.canTransitionTo('cancelled')).toBe(true);
    });

    test('should allow valid status transitions from in_progress', async () => {
      testTicket.status = 'in_progress';
      await testTicket.save();

      // in_progress -> resolved and in_progress -> cancelled are the only valid moves
      expect(testTicket.canTransitionTo('resolved')).toBe(true);
      expect(testTicket.canTransitionTo('cancelled')).toBe(true);
    });

    test('should allow valid status transition from resolved to closed', async () => {
      testTicket.status = 'resolved';
      await testTicket.save();

      expect(testTicket.canTransitionTo('closed')).toBe(true);
    });

    test('should treat closed as a terminal state', async () => {
      testTicket.status = 'closed';
      await testTicket.save();

      expect(testTicket.canTransitionTo('open')).toBe(false);
      expect(testTicket.canTransitionTo('in_progress')).toBe(false);
      expect(testTicket.canTransitionTo('resolved')).toBe(false);
      expect(testTicket.canTransitionTo('cancelled')).toBe(false);
    });

    test('should treat cancelled as a terminal state', async () => {
      testTicket.status = 'cancelled';
      await testTicket.save();

      expect(testTicket.canTransitionTo('open')).toBe(false);
      expect(testTicket.canTransitionTo('in_progress')).toBe(false);
      expect(testTicket.canTransitionTo('resolved')).toBe(false);
      expect(testTicket.canTransitionTo('closed')).toBe(false);
    });

    test('should reject invalid status transitions', async () => {
      // open -> resolved and open -> closed are not allowed
      expect(testTicket.canTransitionTo('resolved')).toBe(false);
      expect(testTicket.canTransitionTo('closed')).toBe(false);

      testTicket.status = 'in_progress';
      await testTicket.save();
      // in_progress -> open and in_progress -> closed are not allowed
      expect(testTicket.canTransitionTo('open')).toBe(false);
      expect(testTicket.canTransitionTo('closed')).toBe(false);

      testTicket.status = 'resolved';
      await testTicket.save();
      // resolved -> open / in_progress / cancelled are not allowed
      expect(testTicket.canTransitionTo('open')).toBe(false);
      expect(testTicket.canTransitionTo('in_progress')).toBe(false);
      expect(testTicket.canTransitionTo('cancelled')).toBe(false);
    });

    test('should set resolutionDate when status changes to resolved', async () => {
      expect(testTicket.resolutionDate).toBeNull();
      
      testTicket.status = 'resolved';
      await testTicket.save();
      
      expect(testTicket.resolutionDate).toBeDefined();
      expect(testTicket.resolutionDate).toBeInstanceOf(Date);
    });

    test('should set resolutionDate when status changes to closed', async () => {
      expect(testTicket.resolutionDate).toBeNull();
      
      testTicket.status = 'closed';
      await testTicket.save();
      
      expect(testTicket.resolutionDate).toBeDefined();
      expect(testTicket.resolutionDate).toBeInstanceOf(Date);
    });

    test('should clear resolutionDate when reopening ticket', async () => {
      // First close the ticket
      testTicket.status = 'closed';
      await testTicket.save();
      expect(testTicket.resolutionDate).toBeDefined();
      
      // Then reopen it
      testTicket.status = 'open';
      await testTicket.save();
      expect(testTicket.resolutionDate).toBeNull();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test tickets with different statuses and priorities
      const testTickets = [
        {
          title: 'Open High Priority',
          description: 'High priority open ticket',
          status: 'open',
          priority: 'high',
          assignee: 'John Doe',
          reporter: 'Jane Smith'
        },
        {
          title: 'In Progress Medium Priority',
          description: 'Medium priority in progress ticket',
          status: 'in_progress',
          priority: 'medium',
          assignee: 'Alice Johnson',
          reporter: 'Bob Wilson'
        },
        {
          title: 'Resolved Low Priority',
          description: 'Low priority resolved ticket',
          status: 'resolved',
          priority: 'low',
          assignee: 'John Doe',
          reporter: 'Carol Brown'
        }
      ];
      
      await Ticket.insertMany(testTickets);
    });

    test('findByStatus should return tickets with specified status', async () => {
      const openTickets = await Ticket.findByStatus('open');
      expect(openTickets).toHaveLength(1);
      expect(openTickets[0].status).toBe('open');
      
      const inProgressTickets = await Ticket.findByStatus('in_progress');
      expect(inProgressTickets).toHaveLength(1);
      expect(inProgressTickets[0].status).toBe('in_progress');
    });

    test('findByPriority should return tickets with specified priority', async () => {
      const highPriorityTickets = await Ticket.findByPriority('high');
      expect(highPriorityTickets).toHaveLength(1);
      expect(highPriorityTickets[0].priority).toBe('high');
      
      const mediumPriorityTickets = await Ticket.findByPriority('medium');
      expect(mediumPriorityTickets).toHaveLength(1);
    });

    test('findByAssignee should return tickets assigned to specified user', async () => {
      const johnTickets = await Ticket.findByAssignee('John Doe');
      expect(johnTickets).toHaveLength(2);
      
      const aliceTickets = await Ticket.findByAssignee('Alice Johnson');
      expect(aliceTickets).toHaveLength(1);
      expect(aliceTickets[0].assignee).toBe('Alice Johnson');
    });

    test('getDashboardStats should return correct statistics', async () => {
      const stats = await Ticket.getDashboardStats();
      expect(stats).toHaveLength(1);
      
      const dashboardData = stats[0];
      expect(dashboardData.totalTickets).toBe(3);
      expect(dashboardData.openTickets).toBe(1);
      expect(dashboardData.inProgressTickets).toBe(1);
      expect(dashboardData.resolvedTickets).toBe(1);
      expect(dashboardData.closedTickets).toBe(0);
    });
  });

  describe('JSON Transformation', () => {
    test('should transform _id to id in JSON output', async () => {
      const ticket = new Ticket({
        title: 'JSON Test Ticket',
        description: 'Testing JSON transformation',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      
      const savedTicket = await ticket.save();
      const jsonOutput = savedTicket.toJSON();
      
      expect(jsonOutput.id).toBeDefined();
      expect(jsonOutput._id).toBeUndefined();
      expect(jsonOutput.__v).toBeUndefined();
      expect(jsonOutput.title).toBe('JSON Test Ticket');
    });
  });

  describe('Database Indexes', () => {
    test('should have proper indexes for performance', async () => {
      const indexes = await Ticket.collection.getIndexes();
      
      // Check that indexes exist for commonly queried fields
      const indexFields = Object.keys(indexes).join(',');
      expect(indexFields).toContain('status_1');
      expect(indexFields).toContain('priority_1');
      expect(indexFields).toContain('assignee_1');
    });
  });

  describe('Real World Scenarios', () => {
    test('should handle a complete ticket lifecycle', async () => {
      // Create new ticket
      const ticket = new Ticket({
        title: 'Fix login bug',
        description: 'Users cannot login with special characters in password',
        priority: 'high',
        assignee: 'John Developer',
        reporter: 'Jane Tester',
        labels: ['bug', 'authentication', 'urgent']
      });
      
      const savedTicket = await ticket.save();
      expect(savedTicket.status).toBe('open');
      expect(savedTicket.resolutionDate).toBeNull();
      
      // Move to in progress
      savedTicket.status = 'in_progress';
      await savedTicket.save();
      expect(savedTicket.status).toBe('in_progress');
      expect(savedTicket.resolutionDate).toBeNull();
      
      // Resolve the ticket
      savedTicket.status = 'resolved';
      await savedTicket.save();
      expect(savedTicket.status).toBe('resolved');
      expect(savedTicket.resolutionDate).toBeDefined();
      
      // Close the ticket
      const resolutionDate = savedTicket.resolutionDate;
      savedTicket.status = 'closed';
      await savedTicket.save();
      expect(savedTicket.status).toBe('closed');
      expect(savedTicket.resolutionDate).toEqual(resolutionDate); // Should keep same resolution date
    });

    test('should handle concurrent ticket updates correctly', async () => {
      const ticket = new Ticket({
        title: 'Concurrent Test Ticket',
        description: 'Testing concurrent updates',
        priority: 'medium',
        assignee: 'Developer A',
        reporter: 'Tester B'
      });
      
      await ticket.save();
      
      // Simulate two concurrent updates
      const ticket1 = await Ticket.findById(ticket._id);
      const ticket2 = await Ticket.findById(ticket._id);
      
      // Update different fields
      ticket1.priority = 'high';
      ticket2.assignee = 'Developer B';
      
      await ticket1.save();
      await ticket2.save();
      
      // Verify final state
      const finalTicket = await Ticket.findById(ticket._id);
      expect(finalTicket.assignee).toBe('Developer B'); // Last save wins
    });

    test('should validate business rules for critical tickets', async () => {
      const criticalTicket = new Ticket({
        title: 'Production server down',
        description: 'Main production server is not responding, affecting all users',
        priority: 'critical',
        assignee: 'On-Call Engineer',
        reporter: 'Monitoring System',
        labels: ['critical', 'production', 'server']
      });
      
      const savedTicket = await criticalTicket.save();
      expect(savedTicket.priority).toBe('critical');
      expect(savedTicket.labels).toContain('critical');
      
      // Critical tickets should be trackable through queries
      const criticalTickets = await Ticket.findByPriority('critical');
      expect(criticalTickets).toHaveLength(1);
      expect(criticalTickets[0].title).toContain('Production server down');
    });
  });
});