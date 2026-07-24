/**
 * Integration tests for Comment Controller
 * Tests the nested ticket-comment API endpoints with real database operations.
 * Covers the Add Comment functionality and the mergeParams nested-route fix.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');
const Ticket = require('../../models/Ticket');
const Comment = require('../../models/Comment');

describe('Comment Controller Integration Tests', () => {
  let mongoServer;
  let ticketId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Ticket.deleteMany({});
    await Comment.deleteMany({});

    // Create a ticket to attach comments to
    const ticket = await Ticket.create({
      title: 'Ticket for comments',
      description: 'A ticket used to test the comment endpoints',
      priority: 'medium',
      assignee: 'Assignee Person',
      reporter: 'Reporter Person'
    });
    ticketId = ticket.id;
  });

  describe('POST /api/tickets/:ticketId/comments - Add Comment', () => {
    it('should add a comment to an existing ticket', async () => {
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .send({ content: 'This is a meaningful comment', author: 'Demo User' })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment).toMatchObject({
        content: 'This is a meaningful comment',
        author: 'Demo User',
        ticketId: ticketId.toString()
      });
      expect(response.body.data.comment).toHaveProperty('id');
      expect(response.body.data.comment).toHaveProperty('timestamp');
    });

    it('should persist the comment so it is returned with the ticket', async () => {
      await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .send({ content: 'Persisted comment', author: 'Author One' })
        .expect(201);

      const ticketResponse = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .expect(200);

      expect(ticketResponse.body.data.comments).toHaveLength(1);
      expect(ticketResponse.body.data.comments[0].content).toBe('Persisted comment');
    });

    it('should reject a comment with empty content', async () => {
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .send({ content: '', author: 'Author One' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should reject a comment with a too-short author name', async () => {
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .send({ content: 'Valid content here', author: 'A' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should reject a comment exceeding the max content length', async () => {
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .send({ content: 'a'.repeat(1001), author: 'Author One' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should return 404 when adding a comment to a non-existent ticket', async () => {
      const missingId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/tickets/${missingId}/comments`)
        .send({ content: 'Comment on missing ticket', author: 'Author One' })
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for an invalid ticket ID format', async () => {
      const response = await request(app)
        .post('/api/tickets/not-a-valid-id/comments')
        .send({ content: 'Some comment', author: 'Author One' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/tickets/:ticketId/comments - List Comments', () => {
    beforeEach(async () => {
      await Comment.create([
        { ticketId, content: 'First comment', author: 'Author One' },
        { ticketId, content: 'Second comment', author: 'Author Two' }
      ]);
    });

    it('should return all comments for a ticket', async () => {
      const response = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.pagination).toHaveProperty('totalCount', 2);
    });

    it('should return an empty list for a ticket with no comments', async () => {
      const otherTicket = await Ticket.create({
        title: 'Ticket without comments',
        description: 'This ticket has no comments attached',
        priority: 'low',
        assignee: 'Someone Else',
        reporter: 'Another Person'
      });

      const response = await request(app)
        .get(`/api/tickets/${otherTicket.id}/comments`)
        .expect(200);

      expect(response.body.data.comments).toHaveLength(0);
    });
  });
});
