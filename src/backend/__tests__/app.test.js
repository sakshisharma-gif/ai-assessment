/**
 * Integration tests for Express application
 * Tests basic app functionality, health endpoints, and error handling
 */

const request = require('supertest');
const { app } = require('../app');

describe('Express Application', () => {
  describe('Health Check Endpoints', () => {
    test('GET /health - should return application status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('database');

      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);

      // Validate database status structure
      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.database).toHaveProperty('collections');
      expect(typeof response.body.database.connected).toBe('boolean');
      expect(typeof response.body.database.collections).toBe('number');
    });

    test('GET /health/database - should return database status', async () => {
      const response = await request(app)
        .get('/health/database');

      // Accept both 200 (connected) and 503 (not connected) for test environment
      expect([200, 503]).toContain(response.status);

      // Validate response structure
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');

      // Validate database status structure
      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.database).toHaveProperty('readyState');
      expect(response.body.database).toHaveProperty('collections');

      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    test('GET /nonexistent-route - should return 404 error', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      // Validate error response structure
      expect(response.body).toHaveApiErrorFormat();
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Route /nonexistent-route not found');
    });

    test('POST /nonexistent-route - should return 404 error', async () => {
      const response = await request(app)
        .post('/nonexistent-route')
        .send({ test: 'data' })
        .expect(404);

      // Validate error response structure
      expect(response.body).toHaveApiErrorFormat();
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Route /nonexistent-route not found');
    });
  });

  describe('CORS Headers', () => {
    const allowedOrigin = 'http://localhost:3001';

    test('OPTIONS preflight from an allowed origin - should include CORS headers', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      // Check CORS headers reflect the allowed origin
      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('GET request from an allowed origin - should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', allowedOrigin)
        .expect(200);

      // Check CORS headers reflect the allowed origin
      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('GET request from a disallowed origin - should not reflect that origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://evil.example.com');

      // The disallowed origin must never be echoed back
      expect(response.headers['access-control-allow-origin']).not.toBe('http://evil.example.com');
    });
  });

  describe('Security Headers', () => {
    test('Response should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check security headers added by Helmet
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('JSON Parsing', () => {
    test('Should parse JSON request bodies correctly', async () => {
      const testData = { test: 'data', number: 123 };
      
      // Since we don't have a POST endpoint yet, we'll test the 404 response
      // but ensure the JSON is parsed (no 400 Bad Request for invalid JSON)
      const response = await request(app)
        .post('/test-json-parsing')
        .send(testData)
        .expect(404); // Should get 404, not 400 (bad request for invalid JSON)

      expect(response.body).toHaveApiErrorFormat();
    });

    test('Should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/test-json-parsing')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400); // Should return 400 for invalid JSON
    });
  });

  describe('Content-Type Headers', () => {
    test('Health endpoint should return JSON content-type', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('Error responses should return JSON content-type', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Request Logging', () => {
    test('Requests should be processed without logging errors', async () => {
      // This test ensures the morgan middleware doesn't cause errors
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
    });
  });
});

describe('Application Configuration', () => {
  test('App should be defined and be a function', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  test('App should have proper middleware configuration', () => {
    // Test that the app has basic middleware setup
    // Check that app is a valid Express application
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    
    // Check that app has the handle method (Express app signature)
    expect(typeof app.handle).toBe('function');
    expect(typeof app.listen).toBe('function');
  });
});

describe('Environment Configuration', () => {
  test('Should handle test environment correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('Should have required environment variables for testing', () => {
    // These should be available even in test environment
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.BCRYPT_SALT_ROUNDS).toBeDefined();
  });
});