/**
 * Mandatory integration tests: Ticket Status State Machine
 *
 * Proves the enforced state-machine rules end-to-end through the API:
 *
 *   Valid transitions:
 *     open        -> in_progress
 *     in_progress -> resolved
 *     resolved    -> closed
 *     open        -> cancelled
 *     in_progress -> cancelled
 *
 *   Everything else (including any move out of the terminal states
 *   `closed` and `cancelled`) must be rejected by the backend with a
 *   clear "Invalid status transition" error and must NOT mutate the ticket.
 *
 * Both status-changing endpoints are covered:
 *   - PUT   /api/tickets/:id           (general update, includes status)
 *   - PATCH /api/tickets/:id/status    (dedicated status update)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');
const Ticket = require('../../models/Ticket');

describe('Ticket Status State Machine (Integration)', () => {
  let mongoServer;

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
  });

  // Seed a ticket directly in the desired starting status (bypassing the API
  // state machine) so we can attempt a transition from that state.
  const seedTicket = (status) =>
    Ticket.create({
      title: `State machine ${status} ticket`,
      description: `A ticket seeded in the ${status} state for transition testing`,
      status,
      priority: 'medium',
      assignee: 'Assignee Person',
      reporter: 'Reporter Person'
    });

  // The complete set of valid transitions per the requirement.
  const VALID_TRANSITIONS = [
    ['open', 'in_progress'],
    ['in_progress', 'resolved'],
    ['resolved', 'closed'],
    ['open', 'cancelled'],
    ['in_progress', 'cancelled']
  ];

  // A representative set of invalid transitions, including terminal-state exits.
  const INVALID_TRANSITIONS = [
    ['open', 'resolved'],
    ['open', 'closed'],
    ['in_progress', 'open'],
    ['in_progress', 'closed'],
    ['resolved', 'open'],
    ['resolved', 'in_progress'],
    ['resolved', 'cancelled'],
    ['closed', 'open'],
    ['closed', 'in_progress'],
    ['closed', 'resolved'],
    ['cancelled', 'open'],
    ['cancelled', 'in_progress'],
    ['cancelled', 'resolved']
  ];

  describe('Valid transitions succeed', () => {
    test.each(VALID_TRANSITIONS)(
      'PUT /api/tickets/:id allows %s -> %s',
      async (from, to) => {
        const ticket = await seedTicket(from);

        const response = await request(app)
          .put(`/api/tickets/${ticket.id}`)
          .send({ status: to })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.ticket.status).toBe(to);

        const persisted = await Ticket.findById(ticket.id);
        expect(persisted.status).toBe(to);
      }
    );

    test.each(VALID_TRANSITIONS)(
      'PATCH /api/tickets/:id/status allows %s -> %s',
      async (from, to) => {
        const ticket = await seedTicket(from);

        const response = await request(app)
          .patch(`/api/tickets/${ticket.id}/status`)
          .send({ status: to })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.ticket.status).toBe(to);
      }
    );
  });

  describe('Invalid transitions are rejected', () => {
    test.each(INVALID_TRANSITIONS)(
      'PUT /api/tickets/:id rejects %s -> %s with 400',
      async (from, to) => {
        const ticket = await seedTicket(from);

        const response = await request(app)
          .put(`/api/tickets/${ticket.id}`)
          .send({ status: to })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Invalid status transition');

        // The ticket status must remain unchanged after a rejected transition.
        const persisted = await Ticket.findById(ticket.id);
        expect(persisted.status).toBe(from);
      }
    );

    test.each(INVALID_TRANSITIONS)(
      'PATCH /api/tickets/:id/status rejects %s -> %s with 400',
      async (from, to) => {
        const ticket = await seedTicket(from);

        const response = await request(app)
          .patch(`/api/tickets/${ticket.id}/status`)
          .send({ status: to })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Invalid status transition');

        const persisted = await Ticket.findById(ticket.id);
        expect(persisted.status).toBe(from);
      }
    );
  });

  describe('End-to-end happy-path lifecycle', () => {
    it('walks a ticket open -> in_progress -> resolved -> closed', async () => {
      const created = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Lifecycle ticket',
          description: 'Walks through the full valid lifecycle',
          priority: 'high',
          assignee: 'Dev Person',
          reporter: 'QA Person'
        })
        .expect(201);

      const id = created.body.data.ticket.id;
      expect(created.body.data.ticket.status).toBe('open');

      await request(app).patch(`/api/tickets/${id}/status`).send({ status: 'in_progress' }).expect(200);
      const resolved = await request(app).patch(`/api/tickets/${id}/status`).send({ status: 'resolved' }).expect(200);
      expect(resolved.body.data.ticket.resolutionDate).toBeTruthy();

      const closed = await request(app).patch(`/api/tickets/${id}/status`).send({ status: 'closed' }).expect(200);
      expect(closed.body.data.ticket.status).toBe('closed');
    });

    it('allows cancelling an open ticket and then rejects further changes', async () => {
      const created = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Cancellable ticket',
          description: 'This ticket will be cancelled from the open state',
          priority: 'low',
          assignee: 'Dev Person',
          reporter: 'QA Person'
        })
        .expect(201);

      const id = created.body.data.ticket.id;

      const cancelled = await request(app)
        .patch(`/api/tickets/${id}/status`)
        .send({ status: 'cancelled' })
        .expect(200);
      expect(cancelled.body.data.ticket.status).toBe('cancelled');

      // cancelled is terminal - any further transition is rejected
      const rejected = await request(app)
        .patch(`/api/tickets/${id}/status`)
        .send({ status: 'in_progress' })
        .expect(400);
      expect(rejected.body.message).toContain('Invalid status transition');
    });
  });
});
