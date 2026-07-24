/**
 * Integration tests for Dashboard Controller
 * Tests real dashboard analytics and KPI calculation endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../app');
const Ticket = require('../../models/Ticket');
const Comment = require('../../models/Comment');

describe('Dashboard Controller Integration Tests', () => {
  let mongoServer;

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
    await Ticket.deleteMany({});
    await Comment.deleteMany({});
  });

  describe('GET /api/dashboard/stats - Dashboard Statistics', () => {
    beforeEach(async () => {
      // Create comprehensive test data for realistic dashboard testing
      const testTickets = [
        // Critical priority tickets
        {
          title: 'Production server down',
          description: 'Critical production issue affecting all users',
          status: 'open',
          priority: 'critical',
          assignee: 'DevOps Team',
          reporter: 'Monitoring System',
          labels: ['production', 'critical', 'infrastructure']
        },
        {
          title: 'Database corruption detected',
          description: 'Data integrity issues found in payment tables',
          status: 'in_progress',
          priority: 'critical',
          assignee: 'Database Admin',
          reporter: 'Data Team',
          labels: ['database', 'critical', 'data-loss']
        },
        
        // High priority tickets
        {
          title: 'Payment gateway failures',
          description: 'Multiple payment processing failures reported',
          status: 'open',
          priority: 'high',
          assignee: 'Payment Team',
          reporter: 'Customer Support',
          labels: ['payment', 'bug', 'customer-impact']
        },
        {
          title: 'Security vulnerability in auth system',
          description: 'Potential XSS vulnerability discovered',
          status: 'resolved',
          priority: 'high',
          assignee: 'Security Team',
          reporter: 'Security Researcher',
          labels: ['security', 'vulnerability', 'auth']
        },
        {
          title: 'Login system performance degradation',
          description: 'User login times increased by 300%',
          status: 'closed',
          priority: 'high',
          assignee: 'Backend Team',
          reporter: 'Performance Monitor',
          labels: ['performance', 'auth', 'backend']
        },

        // Medium priority tickets
        {
          title: 'Add dark mode to user interface',
          description: 'Users requesting dark theme option',
          status: 'open',
          priority: 'medium',
          assignee: 'Frontend Team',
          reporter: 'Product Manager',
          labels: ['feature', 'ui', 'enhancement']
        },
        {
          title: 'Improve search functionality',
          description: 'Current search is too slow and inaccurate',
          status: 'in_progress',
          priority: 'medium',
          assignee: 'Search Team',
          reporter: 'UX Research',
          labels: ['feature', 'search', 'performance']
        },
        {
          title: 'Update user profile page design',
          description: 'Modernize the user profile interface',
          status: 'resolved',
          priority: 'medium',
          assignee: 'Design Team',
          reporter: 'Design Lead',
          labels: ['design', 'ui', 'profile']
        },

        // Low priority tickets
        {
          title: 'Update help documentation',
          description: 'Documentation is outdated and needs refresh',
          status: 'open',
          priority: 'low',
          assignee: 'Documentation Team',
          reporter: 'Support Team',
          labels: ['documentation', 'help', 'content']
        },
        {
          title: 'Add tooltips to form fields',
          description: 'Improve user experience with helpful tooltips',
          status: 'closed',
          priority: 'low',
          assignee: 'UX Team',
          reporter: 'User Feedback',
          labels: ['ux', 'tooltip', 'forms']
        }
      ];

      await Ticket.insertMany(testTickets);

      // Add some comments to tickets for activity tracking
      const tickets = await Ticket.find();
      const comments = [
        {
          content: 'Investigating the root cause of server downtime',
          author: 'DevOps Engineer',
          ticketId: tickets[0]._id
        },
        {
          content: 'Database backup completed, starting recovery process',
          author: 'Database Admin',
          ticketId: tickets[1]._id
        },
        {
          content: 'Payment provider contacted, awaiting response',
          author: 'Payment Specialist',
          ticketId: tickets[2]._id
        },
        {
          content: 'Security patch applied and tested',
          author: 'Security Engineer',
          ticketId: tickets[3]._id
        }
      ];

      await Comment.insertMany(comments);
    });

    it('should return comprehensive dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('totalTickets', 10);
      expect(response.body.data).toHaveProperty('openTickets', 4);
      expect(response.body.data).toHaveProperty('inProgressTickets', 2);
      expect(response.body.data).toHaveProperty('resolvedTickets', 2);
      expect(response.body.data).toHaveProperty('closedTickets', 2);

      // Verify priority breakdown
      expect(response.body.data.priorityBreakdown).toEqual({
        critical: 2,
        high: 3,
        medium: 3,
        low: 2
      });

      // Verify assignee breakdown
      expect(response.body.data.assigneeBreakdown).toBeInstanceOf(Array);
      expect(response.body.data.assigneeBreakdown.length).toBeGreaterThan(0);

      // Verify recent activity
      expect(response.body.data.recentActivity).toBeInstanceOf(Array);
    });

    it('should calculate correct percentage distributions', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      const data = response.body.data;
      
      // Verify totals add up
      const statusTotal = data.openTickets + data.inProgressTickets + data.resolvedTickets + data.closedTickets;
      expect(statusTotal).toBe(data.totalTickets);

      const priorityTotal = Object.values(data.priorityBreakdown).reduce((sum, count) => sum + count, 0);
      expect(priorityTotal).toBe(data.totalTickets);

      // Verify percentages if included
      if (data.statusPercentages) {
        const percentageTotal = Object.values(data.statusPercentages).reduce((sum, pct) => sum + pct, 0);
        expect(percentageTotal).toBeCloseTo(100, 1);
      }
    });

    it('should handle empty database gracefully', async () => {
      // Clear all data
      await Ticket.deleteMany({});
      await Comment.deleteMany({});

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.data.totalTickets).toBe(0);
      expect(response.body.data.openTickets).toBe(0);
      expect(response.body.data.priorityBreakdown.critical).toBe(0);
      expect(response.body.data.assigneeBreakdown).toHaveLength(0);
      expect(response.body.data.recentActivity).toHaveLength(0);
    });

    it('should include performance metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      // Should include timing information
      expect(response.body).toHaveProperty('timestamp');
      
      // May include query performance metrics
      if (response.body.meta) {
        expect(response.body.meta).toHaveProperty('queryTime');
        expect(typeof response.body.meta.queryTime).toBe('number');
      }
    });

    it('should handle date range filtering', async () => {
      const startDate = new Date('2026-07-20T00:00:00Z').toISOString();
      const endDate = new Date('2026-07-25T23:59:59Z').toISOString();

      const response = await request(app)
        .get('/api/dashboard/stats')
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.status).toBe('success');
      // All test tickets should fall within this range
      expect(response.body.data.totalTickets).toBe(10);
    });
  });

  describe('GET /api/dashboard/trends - Dashboard Trends', () => {
    beforeEach(async () => {
      // Create tickets with different creation dates for trend analysis
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      const trendTickets = [
        // 7 days ago
        {
          title: 'Week old ticket 1',
          description: 'Older ticket for trend analysis',
          status: 'closed',
          priority: 'medium',
          assignee: 'Developer A',
          reporter: 'Reporter A',
          createdAt: new Date(now.getTime() - 7 * dayMs),
          updatedAt: new Date(now.getTime() - 6 * dayMs)
        },
        // 5 days ago
        {
          title: 'Five day old ticket',
          description: 'Mid-week ticket',
          status: 'resolved',
          priority: 'high',
          assignee: 'Developer B',
          reporter: 'Reporter B',
          createdAt: new Date(now.getTime() - 5 * dayMs),
          updatedAt: new Date(now.getTime() - 4 * dayMs)
        },
        // 3 days ago
        {
          title: 'Recent ticket 1',
          description: 'Recent ticket creation',
          status: 'in_progress',
          priority: 'critical',
          assignee: 'Developer A',
          reporter: 'Reporter C',
          createdAt: new Date(now.getTime() - 3 * dayMs),
          updatedAt: new Date(now.getTime() - 2 * dayMs)
        },
        // Today
        {
          title: 'Today ticket',
          description: 'Brand new ticket',
          status: 'open',
          priority: 'medium',
          assignee: 'Developer C',
          reporter: 'Reporter A',
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          updatedAt: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
        }
      ];

      await Ticket.insertMany(trendTickets);

      // Mongoose's timestamps plugin protects createdDate from update $set, so use
      // the native driver to backdate createdDate and set resolutionDate, producing
      // a measurable resolution time (~5 hours) for the avg calculation.
      await Ticket.collection.updateMany(
        { status: { $in: ['resolved', 'closed'] } },
        {
          $set: {
            createdDate: new Date(now.getTime() - 5 * 60 * 60 * 1000),
            resolutionDate: new Date(now.getTime())
          }
        }
      );
    });

    it('should return ticket creation trends over time', async () => {
      const response = await request(app)
        .get('/api/dashboard/trends')
        .query({ period: '7d' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('creationTrend');
      expect(response.body.data.creationTrend).toBeInstanceOf(Array);
      
      // Should have data points for the last 7 days
      expect(response.body.data.creationTrend.length).toBeGreaterThan(0);
      
      // Each data point should have date and count
      response.body.data.creationTrend.forEach(point => {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('count');
        expect(typeof point.count).toBe('number');
      });
    });

    it('should return resolution trends', async () => {
      const response = await request(app)
        .get('/api/dashboard/trends')
        .query({ period: '30d' })
        .expect(200);

      expect(response.body.data).toHaveProperty('resolutionTrend');
      expect(response.body.data.resolutionTrend).toBeInstanceOf(Array);
    });

    it('should calculate average resolution time', async () => {
      const response = await request(app)
        .get('/api/dashboard/trends')
        .expect(200);

      expect(response.body.data).toHaveProperty('avgResolutionTime');
      expect(typeof response.body.data.avgResolutionTime).toBe('number');
      expect(response.body.data.avgResolutionTime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/dashboard/team/:teamId - Team Dashboard', () => {
    beforeEach(async () => {
      const teamTickets = [
        {
          title: 'Frontend Team Task 1',
          description: 'UI improvement task',
          status: 'open',
          priority: 'medium',
          assignee: 'Frontend Developer A',
          reporter: 'UI Designer',
          labels: ['frontend', 'ui']
        },
        {
          title: 'Frontend Team Task 2',
          description: 'React component optimization',
          status: 'in_progress',
          priority: 'high',
          assignee: 'Frontend Developer B',
          reporter: 'Performance Team',
          labels: ['frontend', 'performance']
        },
        {
          title: 'Backend Team Task 1',
          description: 'API endpoint creation',
          status: 'resolved',
          priority: 'medium',
          assignee: 'Backend Developer A',
          reporter: 'Product Manager',
          labels: ['backend', 'api']
        }
      ];

      await Ticket.insertMany(teamTickets);
    });

    it('should return team-specific statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/team/frontend')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('teamName', 'frontend');
      expect(response.body.data).toHaveProperty('totalTickets');
      expect(response.body.data).toHaveProperty('activeTickets');
      expect(response.body.data).toHaveProperty('completedTickets');
      expect(response.body.data).toHaveProperty('teamMembers');
    });

    it('should filter tickets by team assignees', async () => {
      const response = await request(app)
        .get('/api/dashboard/team/frontend')
        .expect(200);

      // Should only include frontend team tickets
      expect(response.body.data.totalTickets).toBe(2);
      
      // Check team member breakdown
      expect(response.body.data.teamMembers).toBeInstanceOf(Array);
      expect(response.body.data.teamMembers.length).toBe(2);
    });

    it('should calculate team performance metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/team/backend')
        .expect(200);

      expect(response.body.data).toHaveProperty('completionRate');
      expect(response.body.data).toHaveProperty('avgTimeToCompletion');
      expect(typeof response.body.data.completionRate).toBe('number');
    });
  });

  describe('GET /api/dashboard/user/:userId - User Dashboard', () => {
    const testUserId = 'user123';

    beforeEach(async () => {
      const userTickets = [
        {
          title: 'User assigned ticket 1',
          description: 'Personal task assignment',
          status: 'open',
          priority: 'high',
          assignee: `User ${testUserId}`,
          reporter: 'Manager',
          labels: ['personal', 'urgent']
        },
        {
          title: 'User created ticket 1',
          description: 'User reported issue',
          status: 'in_progress',
          priority: 'medium',
          assignee: 'Developer',
          reporter: `User ${testUserId}`,
          labels: ['user-reported', 'bug']
        },
        {
          title: 'User completed ticket',
          description: 'Successfully resolved task',
          status: 'closed',
          priority: 'medium',
          assignee: `User ${testUserId}`,
          reporter: 'System',
          labels: ['completed', 'success']
        }
      ];

      await Ticket.insertMany(userTickets);
    });

    it('should return user-specific dashboard data', async () => {
      const response = await request(app)
        .get(`/api/dashboard/user/${testUserId}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('userId', testUserId);
      expect(response.body.data).toHaveProperty('assignedTickets');
      expect(response.body.data).toHaveProperty('createdTickets');
      expect(response.body.data).toHaveProperty('completedTickets');
    });

    it('should separate assigned vs created tickets', async () => {
      const response = await request(app)
        .get(`/api/dashboard/user/${testUserId}`)
        .expect(200);

      expect(response.body.data.assignedTickets).toBe(2); // 2 tickets assigned to user
      expect(response.body.data.createdTickets).toBe(1);  // 1 ticket created by user
    });

    it('should calculate user productivity metrics', async () => {
      const response = await request(app)
        .get(`/api/dashboard/user/${testUserId}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('productivityScore');
      expect(response.body.data).toHaveProperty('avgCompletionTime');
      expect(response.body.data).toHaveProperty('recentActivity');
    });
  });

  describe('Real-World Dashboard Scenarios', () => {
    it('should handle large dataset performance', async () => {
      // Create a large number of tickets to test performance
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        title: `Performance Test Ticket ${i + 1}`,
        description: `Testing dashboard performance with ticket ${i + 1}`,
        status: ['open', 'in_progress', 'resolved', 'closed'][i % 4],
        priority: ['low', 'medium', 'high', 'critical'][i % 4],
        assignee: `Developer ${(i % 10) + 1}`,
        reporter: `Reporter ${(i % 5) + 1}`,
        labels: [`label${i % 3}`, `category${i % 4}`]
      }));

      await Ticket.insertMany(largeDataset);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);
      const endTime = Date.now();

      // Should complete within reasonable time (< 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      
      expect(response.body.data.totalTickets).toBe(1000);
      expect(response.body.data.assigneeBreakdown.length).toBe(10);
    });

    it('should handle concurrent dashboard requests', async () => {
      // Create test data
      const concurrentTestData = Array.from({ length: 100 }, (_, i) => ({
        title: `Concurrent Test ${i}`,
        description: 'Testing concurrent access',
        status: 'open',
        priority: 'medium',
        assignee: `User ${i % 5}`,
        reporter: 'Test Suite'
      }));

      await Ticket.insertMany(concurrentTestData);

      // Make multiple concurrent requests
      const requests = Array.from({ length: 10 }, () => 
        request(app).get('/api/dashboard/stats')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.totalTickets).toBe(100);
      });
    });

    it('should provide real-time dashboard updates', async () => {
      // Initial state
      const initialResponse = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      const initialCount = initialResponse.body.data.totalTickets;

      // Add new tickets
      const newTickets = [
        {
          title: 'Real-time Update Test 1',
          description: 'Testing real-time dashboard updates',
          status: 'open',
          priority: 'high',
          assignee: 'Real-time Tester',
          reporter: 'System'
        },
        {
          title: 'Real-time Update Test 2',
          description: 'Another test for real-time updates',
          status: 'in_progress',
          priority: 'critical',
          assignee: 'Real-time Tester',
          reporter: 'System'
        }
      ];

      await Ticket.insertMany(newTickets);

      // Get updated stats
      const updatedResponse = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(updatedResponse.body.data.totalTickets).toBe(initialCount + 2);
      expect(updatedResponse.body.data.openTickets).toBeGreaterThan(0);
      expect(updatedResponse.body.data.inProgressTickets).toBeGreaterThan(0);
    });

    it('should handle complex filtering scenarios', async () => {
      // Create diverse test data
      const complexData = [
        {
          title: 'Mobile App Crash on iOS 15',
          description: 'Critical crash affecting iOS 15 users',
          status: 'open',
          priority: 'critical',
          assignee: 'Mobile Team Lead',
          reporter: 'Customer Support',
          labels: ['mobile', 'ios', 'crash', 'critical'],
          createdDate: new Date('2026-07-20T10:00:00Z'),
          updatedDate: new Date('2026-07-24T14:00:00Z')
        },
        {
          title: 'Payment Processing Delay',
          description: 'Payments taking longer than expected',
          status: 'in_progress',
          priority: 'high',
          assignee: 'Payment Team',
          reporter: 'Business Team',
          labels: ['payment', 'performance', 'business-impact'],
          createdDate: new Date('2026-07-22T09:00:00Z'),
          updatedDate: new Date('2026-07-24T13:30:00Z')
        },
        {
          title: 'UI Enhancement Request',
          description: 'Improve button styling across the application',
          status: 'resolved',
          priority: 'low',
          assignee: 'UI Designer',
          reporter: 'Product Manager',
          labels: ['ui', 'enhancement', 'styling'],
          createdDate: new Date('2026-07-18T15:00:00Z'),
          updatedDate: new Date('2026-07-23T11:00:00Z')
        }
      ];

      await Ticket.insertMany(complexData);

      // The stats endpoint applies priority/status as filters across all metrics,
      // so a critical + open query narrows totalTickets to the single matching ticket.
      const criticalResponse = await request(app)
        .get('/api/dashboard/stats')
        .query({ priority: 'critical', status: 'open' })
        .expect(200);

      expect(criticalResponse.body.data.totalTickets).toBe(1);
      expect(criticalResponse.body.data.openTickets).toBe(1);

      // Test date range filtering (all three tickets were created within range)
      const recentResponse = await request(app)
        .get('/api/dashboard/stats')
        .query({
          startDate: '2026-07-01T00:00:00Z',
          endDate: '2026-12-31T23:59:59Z'
        })
        .expect(200);

      expect(recentResponse.body.data.totalTickets).toBe(3);
    });
  });

  describe('Dashboard API Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);

      // Reconnect for other tests
      await mongoose.connect(mongoServer.getUri());
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .query({ startDate: 'invalid-date' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid date format');
    });

    it('should handle malformed team/user IDs', async () => {
      // Use an encoded, slash-free malformed id so it maps to the :teamId param
      // (a literal '/' would create a separate path segment and 404 instead).
      const response = await request(app)
        .get('/api/dashboard/team/%3Cscript%3Ealert(1)%3C%2Fscript%3E')
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });
});