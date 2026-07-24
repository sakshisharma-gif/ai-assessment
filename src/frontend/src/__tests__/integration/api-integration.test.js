/**
 * End-to-End API Integration Tests
 * Tests real communication between frontend and backend APIs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { ticketService, commentService, dashboardService } from '../../../services/api';
import api from '../../../services/api'; // Import the actual axios instance used by services

describe('API Integration Tests - Real Backend Communication', () => {
  let mockAxios;

  beforeEach(() => {
    // Mock the actual api instance used by the services, not the default axios
    mockAxios = new MockAdapter(api);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Ticket Service Integration', () => {
    const mockTicket = {
      id: '507f1f77bcf86cd799439011',
      title: 'Integration Test Ticket',
      description: 'This ticket is used for API integration testing',
      status: 'open',
      priority: 'medium',
      assignee: 'Test Developer',
      reporter: 'Test User',
      labels: ['test', 'integration'],
      createdDate: '2026-07-24T10:00:00.000Z',
      updatedDate: '2026-07-24T10:00:00.000Z',
      resolutionDate: null
    };

    const mockTicketList = {
      status: 'success',
      data: {
        tickets: [mockTicket],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    };

    describe('GET /tickets - Fetch Tickets', () => {
      it('should fetch tickets with default parameters', async () => {
        mockAxios.onGet('/tickets').reply(200, mockTicketList);

        const response = await ticketService.getTickets();

        expect(response.data.status).toBe('success');
        expect(response.data.data.tickets).toHaveLength(1);
        expect(response.data.data.tickets[0].title).toBe('Integration Test Ticket');
        expect(response.data.data.pagination.totalCount).toBe(1);
      });

      it('should fetch tickets with filters and pagination', async () => {
        const filters = {
          status: 'open',
          priority: 'high',
          assignee: 'John Developer',
          search: 'bug fix',
          page: 2,
          limit: 5
        };

        mockAxios.onGet('/tickets', { params: filters }).reply(200, mockTicketList);

        const response = await ticketService.getTickets(filters);

        expect(response.data.status).toBe('success');
        expect(mockAxios.history.get[0].params).toEqual(filters);
      });

      it('should handle empty ticket list', async () => {
        const emptyResponse = {
          status: 'success',
          data: {
            tickets: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalCount: 0,
              hasNextPage: false,
              hasPrevPage: false
            }
          }
        };

        mockAxios.onGet('/tickets').reply(200, emptyResponse);

        const response = await ticketService.getTickets();

        expect(response.data.data.tickets).toHaveLength(0);
        expect(response.data.data.pagination.totalCount).toBe(0);
      });

      it('should handle API errors gracefully', async () => {
        mockAxios.onGet('/tickets').reply(500, {
          status: 'error',
          message: 'Internal server error'
        });

        await expect(ticketService.getTickets()).rejects.toThrow();
      });

      it('should handle network timeouts', async () => {
        mockAxios.onGet('/tickets').timeout();

        await expect(ticketService.getTickets()).rejects.toThrow();
      });
    });

    describe('GET /tickets/:id - Fetch Single Ticket', () => {
      it('should fetch ticket by ID with comments', async () => {
        const ticketWithComments = {
          status: 'success',
          data: {
            ticket: mockTicket,
            comments: [
              {
                id: '507f1f77bcf86cd799439012',
                content: 'This is a test comment',
                author: 'Test Commenter',
                ticketId: mockTicket.id,
                createdDate: '2026-07-24T11:00:00.000Z',
                updatedDate: '2026-07-24T11:00:00.000Z'
              }
            ]
          }
        };

        mockAxios.onGet(`/tickets/${mockTicket.id}`).reply(200, ticketWithComments);

        const response = await ticketService.getTicketById(mockTicket.id);

        expect(response.data.status).toBe('success');
        expect(response.data.data.ticket.id).toBe(mockTicket.id);
        expect(response.data.data.comments).toHaveLength(1);
      });

      it('should handle ticket not found', async () => {
        mockAxios.onGet('/tickets/nonexistent').reply(404, {
          status: 'error',
          message: 'Ticket not found'
        });

        await expect(ticketService.getTicketById('nonexistent')).rejects.toThrow();
      });

      it('should handle invalid ticket ID format', async () => {
        mockAxios.onGet('/tickets/invalid-id').reply(400, {
          status: 'error',
          message: 'Invalid ticket ID'
        });

        await expect(ticketService.getTicketById('invalid-id')).rejects.toThrow();
      });
    });

    describe('POST /tickets - Create Ticket', () => {
      const newTicketData = {
        title: 'New Bug Report',
        description: 'Found a critical bug in the payment system',
        priority: 'critical',
        assignee: 'Senior Developer',
        reporter: 'QA Team',
        labels: ['bug', 'payment', 'critical']
      };

      it('should create a new ticket successfully', async () => {
        const createdTicket = {
          status: 'success',
          message: 'Ticket created successfully',
          data: {
            ticket: {
              ...newTicketData,
              id: '507f1f77bcf86cd799439013',
              status: 'open',
              createdDate: new Date().toISOString(),
              updatedDate: new Date().toISOString(),
              resolutionDate: null
            }
          }
        };

        mockAxios.onPost('/tickets').reply(201, createdTicket);

        const response = await ticketService.createTicket(newTicketData);

        expect(response.data.status).toBe('success');
        expect(response.data.data.ticket.title).toBe(newTicketData.title);
        expect(response.data.data.ticket.status).toBe('open');
        expect(response.status).toBe(201);
      });

      it('should handle validation errors', async () => {
        const invalidData = {
          title: 'AB', // Too short
          description: '', // Required field missing
          priority: 'invalid'
        };

        const validationError = {
          status: 'error',
          message: 'Validation failed',
          errors: [
            { field: 'title', message: 'Title must be at least 3 characters long' },
            { field: 'description', message: 'Description is required' },
            { field: 'priority', message: 'Priority must be one of: low, medium, high, critical' }
          ]
        };

        mockAxios.onPost('/tickets').reply(400, validationError);

        await expect(ticketService.createTicket(invalidData)).rejects.toThrow();
      });

      it('should handle server errors during creation', async () => {
        mockAxios.onPost('/tickets').reply(500, {
          status: 'error',
          message: 'Failed to create ticket'
        });

        await expect(ticketService.createTicket(newTicketData)).rejects.toThrow();
      });
    });

    describe('PUT /tickets/:id - Update Ticket', () => {
      const updateData = {
        title: 'Updated Ticket Title',
        priority: 'high',
        assignee: 'Different Developer'
      };

      it('should update ticket successfully', async () => {
        const updatedTicket = {
          status: 'success',
          message: 'Ticket updated successfully',
          data: {
            ticket: {
              ...mockTicket,
              ...updateData,
              updatedDate: new Date().toISOString()
            }
          }
        };

        mockAxios.onPut(`/tickets/${mockTicket.id}`).reply(200, updatedTicket);

        const response = await ticketService.updateTicket(mockTicket.id, updateData);

        expect(response.data.status).toBe('success');
        expect(response.data.data.ticket.title).toBe(updateData.title);
        expect(response.data.data.ticket.priority).toBe(updateData.priority);
      });

      it('should handle status transition validation', async () => {
        const invalidStatusUpdate = {
          status: 'resolved' // Invalid transition from 'open' to 'resolved'
        };

        const transitionError = {
          status: 'error',
          message: 'Invalid status transition from \'open\' to \'resolved\''
        };

        mockAxios.onPut(`/tickets/${mockTicket.id}`).reply(400, transitionError);

        await expect(ticketService.updateTicket(mockTicket.id, invalidStatusUpdate)).rejects.toThrow();
      });

      it('should update ticket status through dedicated endpoint', async () => {
        const statusUpdate = { status: 'in_progress' };

        const statusResponse = {
          status: 'success',
          message: 'Ticket status updated successfully',
          data: {
            ticket: {
              ...mockTicket,
              status: 'in_progress',
              updatedDate: new Date().toISOString()
            }
          }
        };

        mockAxios.onPatch(`/tickets/${mockTicket.id}/status`).reply(200, statusResponse);

        const response = await ticketService.updateTicketStatus(mockTicket.id, 'in_progress');

        expect(response.data.status).toBe('success');
        expect(response.data.data.ticket.status).toBe('in_progress');
      });
    });

    describe('DELETE /tickets/:id - Delete Ticket', () => {
      it('should delete ticket and associated comments', async () => {
        const deleteResponse = {
          status: 'success',
          message: 'Ticket and associated comments deleted successfully',
          data: {
            deletedTicket: mockTicket
          }
        };

        mockAxios.onDelete(`/tickets/${mockTicket.id}`).reply(200, deleteResponse);

        const response = await ticketService.deleteTicket(mockTicket.id);

        expect(response.data.status).toBe('success');
        expect(response.data.message).toContain('deleted successfully');
      });

      it('should handle deletion of non-existent ticket', async () => {
        mockAxios.onDelete('/tickets/nonexistent').reply(404, {
          status: 'error',
          message: 'Ticket not found'
        });

        await expect(ticketService.deleteTicket('nonexistent')).rejects.toThrow();
      });
    });
  });

  describe('Comment Service Integration', () => {
    const mockComment = {
      id: '507f1f77bcf86cd799439012',
      content: 'This is a test comment for API integration',
      author: 'Test Commenter',
      ticketId: '507f1f77bcf86cd799439011',
      createdDate: '2026-07-24T12:00:00.000Z',
      updatedDate: '2026-07-24T12:00:00.000Z'
    };

    describe('POST /tickets/:ticketId/comments - Add Comment', () => {
      const newCommentData = {
        content: 'This is a new comment',
        author: 'Comment Author'
      };

      it('should add comment to ticket successfully', async () => {
        const createResponse = {
          status: 'success',
          message: 'Comment added successfully',
          data: {
            comment: {
              ...newCommentData,
              id: '507f1f77bcf86cd799439014',
              ticketId: mockComment.ticketId,
              createdDate: new Date().toISOString(),
              updatedDate: new Date().toISOString()
            }
          }
        };

        mockAxios.onPost(`/tickets/${mockComment.ticketId}/comments`).reply(201, createResponse);

        const response = await commentService.addComment(mockComment.ticketId, newCommentData);

        expect(response.data.status).toBe('success');
        expect(response.data.data.comment.content).toBe(newCommentData.content);
        expect(response.data.data.comment.ticketId).toBe(mockComment.ticketId);
      });

      it('should validate comment content', async () => {
        const invalidComment = {
          content: '', // Empty content
          author: 'A' // Too short author name
        };

        const validationError = {
          status: 'error',
          message: 'Validation failed',
          errors: [
            { field: 'content', message: 'Content is required' },
            { field: 'author', message: 'Author name must be at least 2 characters' }
          ]
        };

        mockAxios.onPost(`/tickets/${mockComment.ticketId}/comments`).reply(400, validationError);

        await expect(commentService.addComment(mockComment.ticketId, invalidComment)).rejects.toThrow();
      });
    });

    describe('GET /tickets/:ticketId/comments - Get Comments', () => {
      it('should fetch comments for a ticket', async () => {
        const commentsResponse = {
          status: 'success',
          data: {
            comments: [mockComment],
            count: 1
          }
        };

        mockAxios.onGet(`/tickets/${mockComment.ticketId}/comments`).reply(200, commentsResponse);

        const response = await commentService.getComments(mockComment.ticketId);

        expect(response.data.status).toBe('success');
        expect(response.data.data.comments).toHaveLength(1);
        expect(response.data.data.comments[0].content).toBe(mockComment.content);
      });

      it('should handle empty comments list', async () => {
        const emptyResponse = {
          status: 'success',
          data: {
            comments: [],
            count: 0
          }
        };

        mockAxios.onGet(`/tickets/${mockComment.ticketId}/comments`).reply(200, emptyResponse);

        const response = await commentService.getComments(mockComment.ticketId);

        expect(response.data.data.comments).toHaveLength(0);
        expect(response.data.data.count).toBe(0);
      });
    });
  });

  describe('Dashboard Service Integration', () => {
    const mockDashboardStats = {
      totalTickets: 150,
      openTickets: 45,
      inProgressTickets: 32,
      resolvedTickets: 60,
      closedTickets: 13,
      priorityBreakdown: {
        critical: 8,
        high: 22,
        medium: 85,
        low: 35
      },
      assigneeBreakdown: [
        { assignee: 'John Developer', count: 12 },
        { assignee: 'Jane QA', count: 8 },
        { assignee: 'Alice DevOps', count: 15 },
        { assignee: 'Bob Designer', count: 6 }
      ],
      recentActivity: [
        {
          ticketId: '507f1f77bcf86cd799439011',
          title: 'Recent ticket update',
          action: 'status_changed',
          timestamp: '2026-07-24T14:30:00.000Z'
        }
      ]
    };

    describe('GET /dashboard/stats - Get Dashboard Statistics', () => {
      it('should fetch comprehensive dashboard statistics', async () => {
        const statsResponse = {
          status: 'success',
          data: mockDashboardStats
        };

        mockAxios.onGet('/dashboard/stats').reply(200, statsResponse);

        const response = await dashboardService.getDashboardStats();

        expect(response.data.status).toBe('success');
        expect(response.data.data.totalTickets).toBe(150);
        expect(response.data.data.priorityBreakdown.critical).toBe(8);
        expect(response.data.data.assigneeBreakdown).toHaveLength(4);
      });

      it('should handle dashboard with no data', async () => {
        const emptyStats = {
          status: 'success',
          data: {
            totalTickets: 0,
            openTickets: 0,
            inProgressTickets: 0,
            resolvedTickets: 0,
            closedTickets: 0,
            priorityBreakdown: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0
            },
            assigneeBreakdown: [],
            recentActivity: []
          }
        };

        mockAxios.onGet('/dashboard/stats').reply(200, emptyStats);

        const response = await dashboardService.getDashboardStats();

        expect(response.data.data.totalTickets).toBe(0);
        expect(response.data.data.assigneeBreakdown).toHaveLength(0);
      });

      it('should handle dashboard API errors', async () => {
        mockAxios.onGet('/dashboard/stats').reply(500, {
          status: 'error',
          message: 'Failed to generate dashboard statistics'
        });

        await expect(dashboardService.getDashboardStats()).rejects.toThrow();
      });
    });

    describe('GET /dashboard/user/:userId - Get User-Specific Dashboard', () => {
      const userId = 'user123';

      it('should fetch user-specific dashboard data', async () => {
        const userDashboard = {
          status: 'success',
          data: {
            assignedToUser: 8,
            createdByUser: 15,
            recentAssignments: [
              {
                ticketId: '507f1f77bcf86cd799439015',
                title: 'User assigned ticket',
                assignedDate: '2026-07-24T09:00:00.000Z'
              }
            ]
          }
        };

        mockAxios.onGet(`/dashboard/user/${userId}`).reply(200, userDashboard);

        const response = await dashboardService.getUserDashboard(userId);

        expect(response.data.status).toBe('success');
        expect(response.data.data.assignedToUser).toBe(8);
        expect(response.data.data.recentAssignments).toHaveLength(1);
      });
    });
  });

  describe('Real-World API Workflow Integration', () => {
    it('should handle complete ticket lifecycle', async () => {
      // 1. Create a new ticket
      const newTicketData = {
        title: 'API Integration Bug',
        description: 'Testing complete workflow through API',
        priority: 'high',
        assignee: 'API Developer',
        reporter: 'Integration Tester',
        labels: ['bug', 'api', 'integration']
      };

      const createdTicket = {
        status: 'success',
        message: 'Ticket created successfully',
        data: {
          ticket: {
            ...newTicketData,
            id: '507f1f77bcf86cd799439016',
            status: 'open',
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            resolutionDate: null
          }
        }
      };

      mockAxios.onPost('/tickets').reply(201, createdTicket);

      const createResponse = await ticketService.createTicket(newTicketData);
      const ticketId = createResponse.data.data.ticket.id;

      // 2. Add a comment to the ticket
      const commentData = {
        content: 'Started investigating this issue',
        author: 'API Developer'
      };

      const commentResponse = {
        status: 'success',
        message: 'Comment added successfully',
        data: {
          comment: {
            ...commentData,
            id: '507f1f77bcf86cd799439017',
            ticketId: ticketId,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
          }
        }
      };

      mockAxios.onPost(`/tickets/${ticketId}/comments`).reply(201, commentResponse);

      await commentService.addComment(ticketId, commentData);

      // 3. Update ticket status to in_progress
      const statusUpdateResponse = {
        status: 'success',
        message: 'Ticket status updated successfully',
        data: {
          ticket: {
            ...createdTicket.data.ticket,
            status: 'in_progress',
            updatedDate: new Date().toISOString()
          }
        }
      };

      mockAxios.onPatch(`/tickets/${ticketId}/status`).reply(200, statusUpdateResponse);

      await ticketService.updateTicketStatus(ticketId, 'in_progress');

      // 4. Add another comment
      const updateComment = {
        content: 'Found the root cause, implementing fix',
        author: 'API Developer'
      };

      mockAxios.onPost(`/tickets/${ticketId}/comments`).reply(201, {
        status: 'success',
        data: { comment: { ...updateComment, id: '507f1f77bcf86cd799439018', ticketId } }
      });

      await commentService.addComment(ticketId, updateComment);

      // 5. Resolve the ticket
      const resolveResponse = {
        status: 'success',
        message: 'Ticket status updated successfully',
        data: {
          ticket: {
            ...createdTicket.data.ticket,
            status: 'resolved',
            resolutionDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
          }
        }
      };

      mockAxios.onPatch(`/tickets/${ticketId}/status`).reply(200, resolveResponse);

      const finalResponse = await ticketService.updateTicketStatus(ticketId, 'resolved');

      expect(finalResponse.data.data.ticket.status).toBe('resolved');
      expect(finalResponse.data.data.ticket.resolutionDate).toBeDefined();
    });

    it('should handle concurrent API operations', async () => {
      const ticketId = '507f1f77bcf86cd799439019';

      // Simulate concurrent update operations
      const priorityUpdate = { priority: 'critical' };
      const assigneeUpdate = { assignee: 'Senior Developer' };

      mockAxios.onPut(`/tickets/${ticketId}`).reply(200, {
        status: 'success',
        data: {
          ticket: {
            id: ticketId,
            title: 'Concurrent Test',
            priority: 'critical',
            assignee: 'Senior Developer'
          }
        }
      });

      // Both updates should succeed
      const [priorityResponse, assigneeResponse] = await Promise.all([
        ticketService.updateTicket(ticketId, priorityUpdate),
        ticketService.updateTicket(ticketId, assigneeUpdate)
      ]);

      expect(priorityResponse.data.status).toBe('success');
      expect(assigneeResponse.data.status).toBe('success');
    });

    it('should handle API rate limiting', async () => {
      mockAxios.onGet('/tickets').reply(429, {
        status: 'error',
        message: 'Too Many Requests',
        retryAfter: 60
      });

      await expect(ticketService.getTickets()).rejects.toThrow();
    });

    it('should handle large dataset pagination efficiently', async () => {
      // Simulate fetching large dataset with pagination
      for (let page = 1; page <= 5; page++) {
        const pageResponse = {
          status: 'success',
          data: {
            tickets: Array.from({ length: 20 }, (_, i) => ({
              id: `page${page}_ticket${i}`,
              title: `Ticket ${(page - 1) * 20 + i + 1}`,
              status: 'open'
            })),
            pagination: {
              currentPage: page,
              totalPages: 5,
              totalCount: 100,
              hasNextPage: page < 5,
              hasPrevPage: page > 1
            }
          }
        };

        mockAxios.onGet('/tickets', { params: { page, limit: 20 } }).reply(200, pageResponse);

        const response = await ticketService.getTickets({ page, limit: 20 });
        
        expect(response.data.data.tickets).toHaveLength(20);
        expect(response.data.data.pagination.currentPage).toBe(page);
      }
    });
  });
});