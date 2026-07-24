/**
 * Simple test to verify basic functionality
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Basic Functionality Test', () => {
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

  test('should connect to test database', async () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  test('should create a simple document', async () => {
    const TestSchema = new mongoose.Schema({
      name: { type: String, required: true }
    });
    
    const TestModel = mongoose.model('Test', TestSchema);
    
    const testDoc = new TestModel({ name: 'Test Document' });
    const saved = await testDoc.save();
    
    expect(saved.name).toBe('Test Document');
    expect(saved._id).toBeDefined();
  });
});