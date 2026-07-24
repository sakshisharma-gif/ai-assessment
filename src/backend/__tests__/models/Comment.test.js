/**
 * Unit tests for Comment Model
 * Tests comment validation, relationships, and database operations
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Comment = require('../../models/Comment');
const Ticket = require('../../models/Ticket');

describe('Comment Model', () => {
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
    await Comment.deleteMany({});
    await Ticket.deleteMany({});
  });

  describe('Model Validation', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = new Ticket({
        title: 'Test Ticket for Comments',
        description: 'Testing comment functionality',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();
    });

    test('should create a valid comment', async () => {
      const commentData = {
        content: 'This is a test comment',
        author: 'John Developer',
        ticketId: testTicket._id
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment._id).toBeDefined();
      expect(savedComment.content).toBe(commentData.content);
      expect(savedComment.author).toBe(commentData.author);
      expect(savedComment.ticketId.toString()).toBe(testTicket._id.toString());
      expect(savedComment.createdDate).toBeDefined();
      expect(savedComment.updatedDate).toBeDefined();
    });

    test('should fail validation when required fields are missing', async () => {
      const comment = new Comment({});
      await expect(comment.save()).rejects.toThrow();
    });

    test('should fail validation when ticketId is invalid', async () => {
      const comment = new Comment({
        content: 'Test comment',
        author: 'John Doe',
        ticketId: 'invalid-id'
      });
      
      await expect(comment.save()).rejects.toThrow();
    });

    test('should validate content length constraints', async () => {
      // Content too short
      const shortComment = new Comment({
        content: '',
        author: 'John Doe',
        ticketId: testTicket._id
      });
      await expect(shortComment.save()).rejects.toThrow();

      // Content too long
      const longComment = new Comment({
        content: 'A'.repeat(5001),
        author: 'John Doe',
        ticketId: testTicket._id
      });
      await expect(longComment.save()).rejects.toThrow();
    });

    test('should validate author name constraints', async () => {
      // Author name too short
      const shortAuthorComment = new Comment({
        content: 'Test comment',
        author: 'A',
        ticketId: testTicket._id
      });
      await expect(shortAuthorComment.save()).rejects.toThrow();

      // Author name too long
      const longAuthorComment = new Comment({
        content: 'Test comment',
        author: 'A'.repeat(51),
        ticketId: testTicket._id
      });
      await expect(longAuthorComment.save()).rejects.toThrow();
    });

    test('should trim whitespace from content and author', async () => {
      const comment = new Comment({
        content: '  This comment has extra spaces  ',
        author: '  John Doe  ',
        ticketId: testTicket._id
      });

      const savedComment = await comment.save();
      expect(savedComment.content).toBe('This comment has extra spaces');
      expect(savedComment.author).toBe('John Doe');
    });
  });

  describe('Static Methods', () => {
    let testTicket1, testTicket2;

    beforeEach(async () => {
      // Create test tickets
      testTicket1 = new Ticket({
        title: 'First Test Ticket',
        description: 'First ticket for comment testing',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket1.save();

      testTicket2 = new Ticket({
        title: 'Second Test Ticket',
        description: 'Second ticket for comment testing',
        priority: 'high',
        assignee: 'Alice Johnson',
        reporter: 'Bob Wilson'
      });
      await testTicket2.save();

      // Create test comments
      const testComments = [
        {
          content: 'First comment on ticket 1',
          author: 'John Developer',
          ticketId: testTicket1._id
        },
        {
          content: 'Second comment on ticket 1',
          author: 'Jane Tester',
          ticketId: testTicket1._id
        },
        {
          content: 'Comment on ticket 2',
          author: 'Alice Developer',
          ticketId: testTicket2._id
        }
      ];

      await Comment.insertMany(testComments);
    });

    test('findByTicketId should return comments for specific ticket', async () => {
      const ticket1Comments = await Comment.findByTicketId(testTicket1._id);
      expect(ticket1Comments).toHaveLength(2);
      
      ticket1Comments.forEach(comment => {
        expect(comment.ticketId.toString()).toBe(testTicket1._id.toString());
      });

      const ticket2Comments = await Comment.findByTicketId(testTicket2._id);
      expect(ticket2Comments).toHaveLength(1);
      expect(ticket2Comments[0].ticketId.toString()).toBe(testTicket2._id.toString());
    });

    test('findByAuthor should return comments by specific author', async () => {
      const johnComments = await Comment.findByAuthor('John Developer');
      expect(johnComments).toHaveLength(1);
      expect(johnComments[0].author).toBe('John Developer');

      const janeComments = await Comment.findByAuthor('Jane Tester');
      expect(janeComments).toHaveLength(1);
      expect(janeComments[0].author).toBe('Jane Tester');
    });

    test('getCommentStats should return correct statistics', async () => {
      const stats = await Comment.getCommentStats();
      expect(stats).toHaveLength(1);

      const commentStats = stats[0];
      expect(commentStats.totalComments).toBe(3);
      expect(commentStats.uniqueAuthors).toBe(3);
    });

    test('findRecent should return recently created comments', async () => {
      const recentComments = await Comment.findRecent(2);
      expect(recentComments).toHaveLength(2);

      // Should be sorted by creation date descending
      expect(recentComments[0].createdDate.getTime())
        .toBeGreaterThanOrEqual(recentComments[1].createdDate.getTime());
    });
  });

  describe('JSON Transformation', () => {
    test('should transform _id to id in JSON output', async () => {
      const testTicket = new Ticket({
        title: 'JSON Test Ticket',
        description: 'Testing JSON transformation',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();

      const comment = new Comment({
        content: 'JSON transformation test comment',
        author: 'Test Author',
        ticketId: testTicket._id
      });

      const savedComment = await comment.save();
      const jsonOutput = savedComment.toJSON();

      expect(jsonOutput.id).toBeDefined();
      expect(jsonOutput._id).toBeUndefined();
      expect(jsonOutput.__v).toBeUndefined();
      expect(jsonOutput.content).toBe('JSON transformation test comment');
    });
  });

  describe('Database Relationships', () => {
    test('should maintain referential integrity with tickets', async () => {
      const testTicket = new Ticket({
        title: 'Relationship Test Ticket',
        description: 'Testing ticket-comment relationship',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();

      const comment = new Comment({
        content: 'Comment linked to ticket',
        author: 'Test Author',
        ticketId: testTicket._id
      });
      await comment.save();

      // Verify the relationship
      const foundComment = await Comment.findById(comment._id);
      expect(foundComment.ticketId.toString()).toBe(testTicket._id.toString());

      // Verify we can find comments by ticket
      const ticketComments = await Comment.find({ ticketId: testTicket._id });
      expect(ticketComments).toHaveLength(1);
      expect(ticketComments[0].content).toBe('Comment linked to ticket');
    });
  });

  describe('Real World Scenarios', () => {
    test('should handle comment thread on a ticket', async () => {
      // Create a ticket for a real-world bug report
      const bugTicket = new Ticket({
        title: 'Login page not loading on mobile',
        description: 'Users report that the login page shows a blank screen on mobile devices',
        priority: 'high',
        assignee: 'Frontend Developer',
        reporter: 'Customer Support'
      });
      await bugTicket.save();

      // Create a conversation thread
      const comments = [
        {
          content: 'I can reproduce this issue on iPhone Safari',
          author: 'QA Engineer',
          ticketId: bugTicket._id
        },
        {
          content: 'Looking into the CSS media queries for mobile responsiveness',
          author: 'Frontend Developer',
          ticketId: bugTicket._id
        },
        {
          content: 'Found the issue - missing viewport meta tag. Working on fix.',
          author: 'Frontend Developer',
          ticketId: bugTicket._id
        },
        {
          content: 'Fix deployed to staging. Can you verify?',
          author: 'Frontend Developer',
          ticketId: bugTicket._id
        },
        {
          content: 'Verified on staging - login page loads correctly on mobile now',
          author: 'QA Engineer',
          ticketId: bugTicket._id
        }
      ];

      // Insert comments with realistic timing
      for (const commentData of comments) {
        const comment = new Comment(commentData);
        await comment.save();
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify the conversation
      const conversation = await Comment.findByTicketId(bugTicket._id);
      expect(conversation).toHaveLength(5);

      // Verify chronological order
      for (let i = 1; i < conversation.length; i++) {
        expect(conversation[i].createdDate.getTime())
          .toBeGreaterThanOrEqual(conversation[i-1].createdDate.getTime());
      }

      // Verify specific participants
      const qaComments = conversation.filter(c => c.author === 'QA Engineer');
      const devComments = conversation.filter(c => c.author === 'Frontend Developer');
      expect(qaComments).toHaveLength(2);
      expect(devComments).toHaveLength(3);
    });

    test('should handle comment updates and modifications', async () => {
      const testTicket = new Ticket({
        title: 'Test Ticket for Comment Updates',
        description: 'Testing comment modification scenarios',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();

      const comment = new Comment({
        content: 'Initial comment content',
        author: 'Comment Author',
        ticketId: testTicket._id
      });
      await comment.save();

      const originalTimestamp = comment.updatedDate;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the comment
      comment.content = 'Updated comment content with more details';
      await comment.save();

      // Verify the update
      expect(comment.content).toBe('Updated comment content with more details');
      expect(comment.updatedDate.getTime()).toBeGreaterThan(originalTimestamp.getTime());

      // Verify in database
      const updatedComment = await Comment.findById(comment._id);
      expect(updatedComment.content).toBe('Updated comment content with more details');
    });

    test('should handle bulk comment operations', async () => {
      const testTicket = new Ticket({
        title: 'Bulk Comment Test Ticket',
        description: 'Testing bulk comment operations',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();

      // Create multiple comments from different authors
      const authors = ['Developer A', 'Developer B', 'QA Engineer', 'Product Manager'];
      const comments = authors.map((author, index) => ({
        content: `Comment ${index + 1} from ${author}`,
        author: author,
        ticketId: testTicket._id
      }));

      await Comment.insertMany(comments);

      // Test bulk query operations
      const allTicketComments = await Comment.findByTicketId(testTicket._id);
      expect(allTicketComments).toHaveLength(4);

      const developerComments = await Comment.find({
        ticketId: testTicket._id,
        author: { $regex: 'Developer', $options: 'i' }
      });
      expect(developerComments).toHaveLength(2);

      // Test bulk statistics
      const stats = await Comment.aggregate([
        { $match: { ticketId: testTicket._id } },
        {
          $group: {
            _id: '$author',
            commentCount: { $sum: 1 },
            firstComment: { $min: '$createdDate' },
            lastComment: { $max: '$createdDate' }
          }
        }
      ]);

      expect(stats).toHaveLength(4);
      stats.forEach(stat => {
        expect(stat.commentCount).toBe(1);
        expect(authors).toContain(stat._id);
      });
    });

    test('should handle comment search and filtering', async () => {
      const testTicket = new Ticket({
        title: 'Search Test Ticket',
        description: 'Testing comment search functionality',
        priority: 'medium',
        assignee: 'John Doe',
        reporter: 'Jane Smith'
      });
      await testTicket.save();

      const comments = [
        {
          content: 'This is a bug report comment with specific keywords',
          author: 'Bug Reporter',
          ticketId: testTicket._id
        },
        {
          content: 'Feature request discussion and implementation notes',
          author: 'Feature Developer',
          ticketId: testTicket._id
        },
        {
          content: 'Testing and QA validation results for this bug',
          author: 'QA Engineer',
          ticketId: testTicket._id
        }
      ];

      await Comment.insertMany(comments);

      // Search by content keyword
      const bugComments = await Comment.find({
        ticketId: testTicket._id,
        content: { $regex: 'bug', $options: 'i' }
      });
      expect(bugComments).toHaveLength(2);

      // Search by author pattern
      const engineerComments = await Comment.find({
        ticketId: testTicket._id,
        author: { $regex: 'Engineer', $options: 'i' }
      });
      expect(engineerComments).toHaveLength(1);
      expect(engineerComments[0].author).toBe('QA Engineer');

      // Full text search simulation
      const featureComments = await Comment.find({
        ticketId: testTicket._id,
        $or: [
          { content: { $regex: 'feature', $options: 'i' } },
          { content: { $regex: 'implementation', $options: 'i' } }
        ]
      });
      expect(featureComments).toHaveLength(1);
    });
  });
});