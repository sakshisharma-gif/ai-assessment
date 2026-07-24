/**
 * Integration tests for Ticket Controller
 * Tests all ticket API endpoints with real database operations
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');
const Ticket = require('../../models/Ticket');
const Comment = require('../../models/Comment');

describe('Ticket Controller Integration Tests', () => {
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
    await Comment.deleteMany({});
  });

  describe('POST /api/tickets - Create Ticket', () => {
    const validTicketData = {
      title: 'Test Ticket',
      description: 'This is a test ticket for API testing',
      priority: 'medium',
      assignee: 'John Doe',
      reporter: 'Jane Smith',
      labels: ['test', 'api']
    };

    test('should create a new ticket successfully', async () => {
      const response = await request(app)
        .post('/api/tickets')
        .send(validTicketData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Ticket created successfully');
      expect(response.body.data.ticket).toBeDefined();
      expect(response.body.data.ticket.title).toBe(validTicketData.title);
      expect(response.body.data.ticket.status).toBe('open'); // Default status
      expect(response.body.data.ticket.id).toBeDefined();

      // Verify ticket was saved to database
      const savedTicket = await Ticket.findById(response.body.data.ticket.id);
      expect(savedTicket).toBeTruthy();
      expect(savedTicket.title).toBe(validTicketData.title);
    });

    test('should reject ticket creation with missing required fields', async () => {
      const incompleteData = {
        title: 'Incomplete Ticket'
        // Missing description, assignee, reporter
      };

      const response = await request(app)
        .post('/api/tickets')
        .send(incompleteData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    test('should reject ticket with invalid priority', async () => {
      const invalidData = {
        ...validTicketData,
        priority: 'invalid_priority'
      };

      const response = await request(app)
        .post('/api/tickets')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('should handle title length validation', async () => {
      // Title too short
      const shortTitleData = {
        ...validTicketData,
        title: 'AB' // Less than 3 characters
      };

      await request(app)
        .post('/api/tickets')
        .send(shortTitleData)
        .expect(400);

      // Title too long
      const longTitleData = {
        ...validTicketData,
        title: 'A'.repeat(101) // More than 100 characters
      };

      await request(app)
        .post('/api/tickets')
        .send(longTitleData)
        .expect(400);
    });

    test('should create ticket with default values', async () => {
      const minimalData = {
        title: 'Minimal Ticket',
        description: 'Testing minimal ticket creation',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
        // No priority or labels specified
      };

      const response = await request(app)
        .post('/api/tickets')
        .send(minimalData)
        .expect(201);

      expect(response.body.data.ticket.priority).toBe('medium'); // Default priority
      expect(response.body.data.ticket.status).toBe('open'); // Default status
      expect(response.body.data.ticket.labels).toEqual([]); // Default empty array
    });
  });

  describe('GET /api/tickets - Get All Tickets', () => {
    beforeEach(async () => {
      // Create test tickets
      const testTickets = [
        {
          title: 'Bug: Login not working',
          description: 'Users cannot log in to the system',
          status: 'open',
          priority: 'high',
          assignee: 'John Doe',
          reporter: 'Jane Smith',
          labels: ['bug', 'authentication']
        },
        {
          title: 'Feature: Add dark mode',
          description: 'Users want a dark mode option',
          status: 'in_progress',
          priority: 'medium',
          assignee: 'Alice Johnson',
          reporter: 'Bob Wilson',
          labels: ['feature', 'ui']
        },
        {
          title: 'Bug: Memory leak',
          description: 'Application consuming too much memory',
          status: 'resolved',
          priority: 'critical',
          assignee: 'Charlie Brown',
          reporter: 'Diana Prince',
          labels: ['bug', 'performance']
        }
      ];

      await Ticket.insertMany(testTickets);
    });

    test('should get all tickets with default pagination', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.tickets).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalCount).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(1);
    });

    test('should filter tickets by status', async () => {
      const response = await request(app)
        .get('/api/tickets?status=open')
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.tickets[0].status).toBe('open');
    });

    test('should filter tickets by priority', async () => {
      const response = await request(app)
        .get('/api/tickets?priority=high')
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.tickets[0].priority).toBe('high');
    });

    test('should search tickets by title and description', async () => {
      const response = await request(app)
        .get('/api/tickets?search=dark mode')
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      expect(response.body.data.tickets[0].title).toContain('dark mode');
    });

    test('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/tickets?page=1&limit=2')
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('should sort tickets correctly', async () => {
      const response = await request(app)
        .get('/api/tickets?sortBy=priority&sortOrder=desc')
        .expect(200);

      const tickets = response.body.data.tickets;
      const priorities = tickets.map(t => t.priority);
      
      // Should be sorted by priority descending: critical, high, medium
      expect(priorities[0]).toBe('critical');
    });

    test('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/tickets?status=open&priority=high&search=login')
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
      const ticket = response.body.data.tickets[0];
      expect(ticket.status).toBe('open');
      expect(ticket.priority).toBe('high');
      expect(ticket.title.toLowerCase()).toContain('login');
    });
  });

  describe('GET /api/tickets/:id - Get Ticket by ID', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = new Ticket({
        title: 'Test Ticket for ID lookup',
        description: 'Testing individual ticket retrieval',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();

      // Add a comment to this ticket
      const comment = new Comment({
        content: 'This is a test comment',
        author: 'John Doe',
        ticketId: testTicket._id
      });
      await comment.save();
    });

    test('should get ticket by valid ID', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.ticket).toBeDefined();
      expect(response.body.data.ticket.title).toBe(testTicket.title);
      expect(response.body.data.comments).toBeDefined();
      expect(response.body.data.comments).toHaveLength(1);
    });

    test('should return 404 for non-existent ticket', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/tickets/${nonExistentId}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Ticket not found');
    });

    test('should return 400 for invalid ticket ID format', async () => {
      const response = await request(app)
        .get('/api/tickets/invalid-id')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid ticket ID');
    });
  });

  describe('PUT /api/tickets/:id - Update Ticket', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = new Ticket({
        title: 'Original Title',
        description: 'Original description',
        status: 'open',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();
    });

    test('should update ticket fields successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        priority: 'high',
        assignee: 'Alice Johnson'
      };

      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.ticket.title).toBe('Updated Title');
      expect(response.body.data.ticket.priority).toBe('high');
      expect(response.body.data.ticket.assignee).toBe('Alice Johnson');

      // Verify in database
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.title).toBe('Updated Title');
    });

    test('should validate status transitions', async () => {
      // Try invalid transition: open -> resolved (not allowed)
      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .send({ status: 'resolved' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid status transition');
    });

    test('should allow valid status transitions', async () => {
      // Valid transition: open -> in_progress
      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.data.ticket.status).toBe('in_progress');
    });

    test('should set resolutionDate when status changes to resolved', async () => {
      // First move to in_progress
      await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .send({ status: 'in_progress' })
        .expect(200);

      // Then resolve
      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .send({ status: 'resolved' })
        .expect(200);

      expect(response.body.data.ticket.resolutionDate).toBeDefined();
    });

    test('should return 404 for non-existent ticket update', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/tickets/${nonExistentId}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Ticket not found');
    });

    test('should validate updated field constraints', async () => {
      const response = await request(app)
        .put(`/api/tickets/${testTicket._id}`)
        .send({ title: 'AB' }) // Too short
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('DELETE /api/tickets/:id - Delete Ticket', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = new Ticket({
        title: 'Ticket to Delete',
        description: 'This ticket will be deleted',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();

      // Add comments to test cascade deletion
      const comments = [
        {
          content: 'First comment',
          author: 'John Doe',
          ticketId: testTicket._id
        },
        {
          content: 'Second comment',
          author: 'Jane Smith',
          ticketId: testTicket._id
        }
      ];
      await Comment.insertMany(comments);
    });

    test('should delete ticket and associated comments', async () => {
      const response = await request(app)
        .delete(`/api/tickets/${testTicket._id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deleted successfully');

      // Verify ticket is deleted
      const deletedTicket = await Ticket.findById(testTicket._id);
      expect(deletedTicket).toBeNull();

      // Verify associated comments are deleted
      const remainingComments = await Comment.find({ ticketId: testTicket._id });
      expect(remainingComments).toHaveLength(0);
    });

    test('should return 404 for non-existent ticket deletion', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/tickets/${nonExistentId}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Ticket not found');
    });

    test('should return 400 for invalid ticket ID format', async () => {
      const response = await request(app)
        .delete('/api/tickets/invalid-id')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid ticket ID');
    });
  });

  describe('GET /api/tickets/status/:status - Get Tickets by Status', () => {
    beforeEach(async () => {
      const testTickets = [
        {
          title: 'Open Ticket 1',
          description: 'First open ticket',
          status: 'open',
          priority: 'medium',
          assignee: 'John Doe',
          reporter: 'Jane Smith'
        },
        {
          title: 'Open Ticket 2',
          description: 'Second open ticket',
          status: 'open',
          priority: 'high',
          assignee: 'Alice Johnson',
          reporter: 'Bob Wilson'
        },
        {
          title: 'Closed Ticket',
          description: 'Closed ticket',
          status: 'closed',
          priority: 'low',
          assignee: 'Charlie Brown',
          reporter: 'Diana Prince'
        }
      ];

      await Ticket.insertMany(testTickets);
    });

    test('should get tickets by valid status', async () => {
      const response = await request(app)
        .get('/api/tickets/status/open')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.tickets).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      response.body.data.tickets.forEach(ticket => {
        expect(ticket.status).toBe('open');
      });
    });

    test('should return 400 for invalid status', async () => {
      const response = await request(app)
        .get('/api/tickets/status/invalid_status')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid status');
    });

    test('should limit results when specified', async () => {
      const response = await request(app)
        .get('/api/tickets/status/open?limit=1')
        .expect(200);

      expect(response.body.data.tickets).toHaveLength(1);
    });
  });

  describe('PATCH /api/tickets/:id/status - Update Ticket Status', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = new Ticket({
        title: 'Status Update Test',
        description: 'Testing status-only updates',
        status: 'open',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();
    });

    test('should update status with valid transition', async () => {
      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.ticket.status).toBe('in_progress');

      // Verify in database
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.status).toBe('in_progress');
    });

    test('should reject invalid status transition', async () => {
      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}/status`)
        .send({ status: 'resolved' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid status transition');
    });

    test('should require status in request body', async () => {
      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}/status`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Status is required');
    });
  });

  describe('Real-World Integration Scenarios', () => {
    test('should handle complete ticket workflow', async () => {
      // Create a new bug ticket
      const createResponse = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Critical Production Bug',
          description: 'Payment gateway is not processing orders correctly',
          priority: 'critical',
          assignee: 'Senior Developer',
          reporter: 'QA Team',
          labels: ['bug', 'production', 'payment']
        })
        .expect(201);

      const ticketId = createResponse.body.data.ticket.id;

      // Move to in progress
      await request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      // Add some comments (would be through comment API)
      // Update assignee
      await request(app)
        .put(`/api/tickets/${ticketId}`)
        .send({ assignee: 'DevOps Team' })
        .expect(200);

      // Resolve the ticket
      await request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'resolved' })
        .expect(200);

      // Verify final state
      const finalResponse = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .expect(200);

      const finalTicket = finalResponse.body.data.ticket;
      expect(finalTicket.status).toBe('resolved');
      expect(finalTicket.resolutionDate).toBeDefined();
      expect(finalTicket.assignee).toBe('DevOps Team');
    });

    test('should handle concurrent modifications correctly', async () => {
      // Create initial ticket
      const createResponse = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Concurrency Test Ticket',
          description: 'Testing concurrent modifications',
          priority: 'medium',
          assignee: 'Developer A',
          reporter: 'Tester B'
        })
        .expect(201);

      const ticketId = createResponse.body.data.ticket.id;

      // Simulate concurrent updates
      const update1Promise = request(app)
        .put(`/api/tickets/${ticketId}`)
        .send({ priority: 'high' });

      const update2Promise = request(app)
        .put(`/api/tickets/${ticketId}`)
        .send({ assignee: 'Developer B' });

      const [response1, response2] = await Promise.all([update1Promise, update2Promise]);

      // Both updates should succeed
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Check final state
      const finalResponse = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .expect(200);

      // One of the updates should be reflected (MongoDB handles concurrency)
      const finalTicket = finalResponse.body.data.ticket;
      expect(['high', 'medium']).toContain(finalTicket.priority);
      expect(['Developer A', 'Developer B']).toContain(finalTicket.assignee);
    });

    test('should handle bulk operations through filters', async () => {
      // Create multiple tickets
      const tickets = [
        { title: 'Bug 1', description: 'First bug report details', priority: 'high', assignee: 'Dev A', reporter: 'QA A', labels: ['bug'] },
        { title: 'Bug 2', description: 'Second bug report details', priority: 'high', assignee: 'Dev A', reporter: 'QA B', labels: ['bug'] },
        { title: 'Feature 1', description: 'First feature description', priority: 'medium', assignee: 'Dev B', reporter: 'PM A', labels: ['feature'] }
      ];

      for (const ticketData of tickets) {
        await request(app)
          .post('/api/tickets')
          .send(ticketData)
          .expect(201);
      }

      // Get all high priority tickets
      const highPriorityResponse = await request(app)
        .get('/api/tickets?priority=high')
        .expect(200);

      expect(highPriorityResponse.body.data.tickets).toHaveLength(2);

      // Get all tickets assigned to Dev A
      const devAResponse = await request(app)
        .get('/api/tickets?assignee=Dev A')
        .expect(200);

      expect(devAResponse.body.data.tickets).toHaveLength(2);
    });
  });
});