# Testing Guide for Ticket Management System Backend

This guide provides comprehensive information about testing practices, setup, and running tests for the Ticket Management System Backend API.

## Table of Contents

- [Overview](#overview)
- [Test Framework & Tools](#test-framework--tools)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
  - [State Machine Integration Tests ★](#4-state-machine-integration-tests-integrationstatemachinetestjs--mandatory-tier)
- [Writing Tests](#writing-tests)
- [Test Data & Fixtures](#test-data--fixtures)
- [Mocking & Testing Utilities](#mocking--testing-utilities)
- [Coverage Reports](#coverage-reports)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Our testing strategy follows a comprehensive approach with:

- **Unit Tests**: Testing individual components in isolation
- **Integration Tests**: Testing API endpoints with real database operations
- **Model Tests**: Testing data models, validation, and business logic
- **Real-world Scenarios**: Testing complete workflows and edge cases

### Test Philosophy

- **Test Isolation**: Each test runs independently with clean database state
- **Real Database**: Using MongoDB Memory Server for realistic testing
- **Complete Coverage**: Testing happy paths, error cases, and edge conditions
- **Maintainable**: Clear, readable tests that serve as documentation

## Test Framework & Tools

### Core Testing Stack

```json
{
  "jest": "^30.4.2",                    // Test framework
  "supertest": "^7.2.2",              // HTTP assertion library
  "mongodb-memory-server": "^11.2.0",  // In-memory MongoDB for testing
  "@types/jest": "^30.0.0"             // TypeScript definitions for Jest
}
```

### Key Features

- **Jest**: Primary test framework with built-in mocking, assertions, and coverage
- **Supertest**: HTTP testing for API endpoints
- **MongoDB Memory Server**: Isolated, fast database testing
- **Custom Matchers**: Extended Jest matchers for API responses and MongoDB ObjectIds

## Test Structure

```
__tests__/
├── README.md                       # This testing guide
├── app.test.js                     # Application-level integration tests (health, CORS, security)
├── simple.test.js                  # Smoke test / DB connectivity sanity check
├── controllers/                    # Controller integration tests (real DB via Memory Server)
│   ├── ticketController.test.js    # Ticket CRUD, filtering, sorting, status updates
│   ├── commentController.test.js   # Nested ticket comments (add/list, validation, mergeParams)
│   └── dashboardController.test.js # KPI stats, trends, team/user dashboards
├── integration/                    # Cross-cutting, rules-focused integration tests
│   └── stateMachine.test.js        # ★ Ticket status STATE MACHINE (mandatory tier)
├── middleware/                     # Middleware testing (ready for future tests)
├── models/                         # Model unit tests
│   ├── Comment.test.js
│   └── Ticket.test.js              # Includes canTransitionTo() state-machine unit tests
├── routes/                         # Route-specific tests (ready for future tests)
├── services/                       # Service layer tests (ready for future tests)
└── setup/
    └── customMatchers.js           # Custom Jest matchers + shared test setup
```

### Test File Naming Conventions

- `*.test.js` - Primary test files
- `*.spec.js` - Alternative specification-style tests
- Test files mirror the source code structure
- Each test file focuses on a single module or component

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD (no watch, with coverage)
npm run test:ci

# Run specific test file
npx jest app.test.js

# Run tests matching pattern
npx jest --testNamePattern="should create"

# Run tests for specific directory
npx jest controllers/

# Run the mandatory State Machine integration tests
npx jest __tests__/integration/stateMachine.test.js
```

### Debug Mode

```bash
# Enable verbose test output
DEBUG_TESTS=true npm test

# Run with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Environment Variables

Tests automatically use the following environment:

```bash
NODE_ENV=test
JWT_SECRET=test_jwt_secret_key
BCRYPT_SALT_ROUNDS=10
```

## Test Types

### 1. Application Tests (`app.test.js`)

Tests the Express application configuration, middleware, and global functionality:

```javascript
describe('Express Application', () => {
  describe('Health Check Endpoints', () => {
    test('GET /health - should return application status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
    });
  });
});
```

**Covers:**
- Health check endpoints
- Error handling middleware
- CORS configuration
- Security headers
- JSON parsing
- Request logging

### 2. Controller Tests (`controllers/`)

Integration tests for API endpoints with real database operations:

```javascript
describe('POST /api/tickets - Create Ticket', () => {
  test('should create a new ticket successfully', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .send(validTicketData)
      .expect(201);

    expect(response.body.status).toBe('success');
    expect(response.body.data.ticket).toBeDefined();
  });
});
```

**Covers:**
- CRUD operations
- Input validation
- Authentication & authorization
- Error responses
- Pagination and filtering
- Status code validation

### 3. Model Tests (`models/`)

Unit tests for data models, validation, and business logic:

```javascript
describe('Ticket Model', () => {
  describe('Model Validation', () => {
    test('should create a valid ticket with required fields', async () => {
      const ticket = new Ticket(validTicketData);
      const savedTicket = await ticket.save();
      
      expect(savedTicket._id).toBeDefined();
    });
  });
});
```

**Covers:**
- Schema validation
- Business logic methods (including `canTransitionTo()` state-machine unit checks)
- Static methods
- Database relationships
- JSON transformations
- Custom validators

### 4. State Machine Integration Tests (`integration/stateMachine.test.js`) ★ Mandatory Tier

This is the signature "engineering judgment" test tier. It proves the ticket
**status state machine** rules end-to-end through the real API (Express +
MongoDB Memory Server), covering both status-changing endpoints:

- `PUT /api/tickets/:id` (general update that includes `status`)
- `PATCH /api/tickets/:id/status` (dedicated status update)

**The enforced state machine:**

| From          | Allowed → To               |
| ------------- | -------------------------- |
| `open`        | `in_progress`, `cancelled` |
| `in_progress` | `resolved`, `cancelled`    |
| `resolved`    | `closed`                   |
| `closed`      | _(terminal — none)_        |
| `cancelled`   | _(terminal — none)_        |

**What the suite asserts (38 tests):**

- **Valid transitions succeed** — every allowed transition returns `200` and
  persists the new status, verified on both endpoints.
- **Invalid transitions are rejected** — disallowed moves (e.g. `open → resolved`,
  `in_progress → closed`, `resolved → open`) and any exit from the terminal
  `closed`/`cancelled` states return `400` with an `"Invalid status transition"`
  message, and the ticket status is left **unchanged**.
- **Happy-path lifecycle** — `open → in_progress → resolved → closed`, confirming
  `resolutionDate` is set on resolve.
- **Cancellation flow** — an `open` ticket can be cancelled, after which any
  further transition is rejected.

> The related unit-level checks for the state machine live in
> `models/Ticket.test.js` (the `Status Transition Logic` describe block), which
> tests `ticket.canTransitionTo(newStatus)` directly.

**Run just the state-machine integration tests:**

```bash
# From src/backend

# Run the state-machine integration suite by path
npx jest __tests__/integration/stateMachine.test.js

# ...or run everything under the integration/ folder
npx jest integration/

# Verbose output (lists each transition case as it runs)
npx jest __tests__/integration/stateMachine.test.js --verbose

# Run only the "Invalid transitions are rejected" group
npx jest __tests__/integration/stateMachine.test.js -t "Invalid transitions are rejected"

# Run only the valid-transition cases
npx jest __tests__/integration/stateMachine.test.js -t "Valid transitions succeed"
```

## Writing Tests

### Test Structure Pattern

Follow the **Arrange-Act-Assert** pattern:

```javascript
test('should update ticket status successfully', async () => {
  // Arrange
  const testTicket = new Ticket(validTicketData);
  await testTicket.save();
  
  // Act
  const response = await request(app)
    .put(`/api/tickets/${testTicket._id}`)
    .send({ status: 'in_progress' });
  
  // Assert
  expect(response.status).toBe(200);
  expect(response.body.data.ticket.status).toBe('in_progress');
});
```

### Descriptive Test Names

Use clear, descriptive test names that explain the scenario:

```javascript
// Good ✅
test('should reject ticket creation with missing required fields', async () => {});
test('should return 404 for non-existent ticket', async () => {});
test('should validate status transitions correctly', async () => {});

// Poor ❌
test('create ticket', async () => {});
test('error case', async () => {});
test('update test', async () => {});
```

### Test Organization

Group related tests using `describe` blocks:

```javascript
describe('Ticket Controller Integration Tests', () => {
  describe('POST /api/tickets - Create Ticket', () => {
    // All create ticket tests
  });
  
  describe('GET /api/tickets - Get All Tickets', () => {
    // All get tickets tests
  });
});
```

## Test Data & Fixtures

### Creating Test Data

Use consistent test data patterns:

```javascript
// Good - Reusable test data
const validTicketData = {
  title: 'Test Ticket',
  description: 'This is a test ticket for API testing',
  priority: 'medium',
  assignee: 'John Doe',
  reporter: 'Jane Smith',
  labels: ['test', 'api']
};

// Create variations for different scenarios
const invalidTicketData = {
  ...validTicketData,
  priority: 'invalid_priority'
};
```

### Database Setup

Each test gets a clean database state:

```javascript
beforeEach(async () => {
  // Automatic cleanup before each test
  await Ticket.deleteMany({});
  await Comment.deleteMany({});
});
```

### MongoDB Memory Server

Tests use an in-memory MongoDB instance:

```javascript
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

## Mocking & Testing Utilities

### Custom Jest Matchers

We provide custom matchers for common assertions:

```javascript
// Check if response has standard API error format
expect(response.body).toHaveApiErrorFormat();

// Check if response has standard API success format
expect(response.body).toHaveApiSuccessFormat();

// Check if value is a valid MongoDB ObjectId
expect(ticketId).toBeValidObjectId();
```

### Test Utilities

Global test utilities are available via `global.testUtils`:

```javascript
// Setup and teardown database
await testUtils.setupTestDatabase();
await testUtils.teardownTestDatabase();

// Clear database between tests
await testUtils.clearDatabase();

// Validate ObjectIds
const isValid = testUtils.isValidObjectId(someId);
```

### Supertest Integration

Use supertest for HTTP assertions:

```javascript
const response = await request(app)
  .post('/api/tickets')
  .send(testData)
  .expect(201)                    // Assert status code
  .expect('Content-Type', /json/); // Assert content type

expect(response.body).toBeDefined();
```

## Coverage Reports

### Viewing Coverage

Coverage reports are generated in multiple formats:

```bash
# Run tests with coverage
npm run test:coverage

# Open HTML coverage report
open coverage/index.html

# Coverage files
coverage/
├── index.html              # Interactive HTML report
├── lcov.info              # LCOV format for CI tools
├── coverage-final.json    # JSON format
└── lcov-report/           # Detailed HTML reports
```

### Coverage Thresholds

We maintain coverage thresholds for critical files:

```javascript
coverageThreshold: {
  './app.js': {
    branches: 45,
    functions: 80,
    lines: 70,
    statements: 70
  }
}
```

### Coverage Goals

- **Statements**: 70%+ for core application files
- **Functions**: 80%+ for controllers and models
- **Branches**: 45%+ for conditional logic
- **Lines**: 70%+ overall coverage

## Best Practices

### 1. Test Isolation

- Each test should run independently
- Don't rely on test execution order
- Clean up after each test

```javascript
beforeEach(async () => {
  await clearDatabase();
});

afterEach(async () => {
  jest.clearAllMocks();
});
```

### 2. Test Both Success and Failure Cases

```javascript
describe('Ticket Validation', () => {
  test('should create ticket with valid data', async () => {
    // Test success path
  });
  
  test('should reject ticket with invalid priority', async () => {
    // Test validation failure
  });
  
  test('should handle database connection errors', async () => {
    // Test error conditions
  });
});
```

### 3. Use Realistic Test Data

```javascript
// Good - Realistic business scenario
const bugReport = {
  title: 'Login page not loading on mobile Safari',
  description: 'Users report blank screen when accessing login page on iPhone Safari browser',
  priority: 'high',
  assignee: 'Frontend Team',
  reporter: 'Customer Support',
  labels: ['bug', 'mobile', 'authentication']
};

// Poor - Generic test data
const testData = {
  title: 'Test',
  description: 'Test description',
  priority: 'medium'
};
```

### 4. Test Edge Cases

```javascript
describe('Edge Cases', () => {
  test('should handle concurrent ticket updates', async () => {
    // Test race conditions
  });
  
  test('should validate maximum field lengths', async () => {
    // Test boundary conditions
  });
  
  test('should handle malformed request data', async () => {
    // Test input sanitization
  });
});
```

### 5. Keep Tests Fast

- Use MongoDB Memory Server for speed
- Minimize external dependencies
- Avoid unnecessary setTimeout calls
- Prefer unit tests over integration tests when possible

## Troubleshooting

### Common Issues

#### 1. Tests Hang or Timeout

**Problem**: Tests don't complete or timeout after 30 seconds.

**Solutions**:
```bash
# Check for open database connections
DEBUG_TESTS=true npm test

# Ensure proper cleanup
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

#### 2. Database Connection Errors

**Problem**: MongoDB connection fails during tests.

**Solutions**:
- Ensure MongoDB Memory Server is properly set up
- Check that ports are available
- Verify test isolation (each test suite should have its own database instance)

#### 3. Intermittent Test Failures

**Problem**: Tests pass sometimes but fail other times.

**Solutions**:
- Check for test dependencies between test cases
- Ensure proper cleanup between tests
- Look for race conditions in async operations
- Add appropriate wait conditions for database operations

#### 4. Coverage Issues

**Problem**: Coverage reports show unexpected results.

**Solutions**:
```bash
# Clear Jest cache
npx jest --clearCache

# Run coverage with verbose output
npm run test:coverage -- --verbose

# Check coverage for specific files
npx jest --coverage --collectCoverageOnlyFrom=app.js
```

### Debugging Tests

#### Enable Debug Output

```bash
# Show all console output during tests
DEBUG_TESTS=true npm test

# Run specific test with debugging
DEBUG_TESTS=true npx jest --testNamePattern="should create ticket"
```

#### Using Node.js Debugger

```bash
# Start tests with debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open Chrome DevTools at chrome://inspect
```

#### Verbose Logging

Add temporary logging in tests:

```javascript
test('debug test issue', async () => {
  console.log('Test data:', testData);
  const response = await request(app).post('/api/tickets').send(testData);
  console.log('Response:', response.body);
  
  expect(response.status).toBe(201);
});
```

### Performance Tips

1. **Run Tests in Parallel**: Jest runs tests in parallel by default
2. **Use --runInBand for Debugging**: Runs tests serially for easier debugging
3. **Focus on Specific Tests**: Use `--testNamePattern` to run subset of tests
4. **Watch Mode for Development**: Use `npm run test:watch` during development

## Contributing

When adding new features or fixing bugs:

1. **Write Tests First**: Follow TDD approach when possible
2. **Test Both Paths**: Cover success and failure scenarios
3. **Update Documentation**: Update this guide if adding new testing patterns
4. **Maintain Coverage**: Ensure new code meets coverage thresholds
5. **Real-world Scenarios**: Include realistic business scenarios in tests

### Test Review Checklist

- [ ] Tests are isolated and independent
- [ ] Both success and failure cases are covered
- [ ] Test names are descriptive and clear
- [ ] Realistic test data is used
- [ ] Edge cases are considered
- [ ] Proper cleanup is implemented
- [ ] Tests run consistently
- [ ] Coverage thresholds are maintained

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Quick Start

For developers new to this testing setup:

```bash
# 1. Install dependencies
npm install

# 2. Run all tests
npm test

# 3. Run tests with coverage
npm run test:coverage

# 4. Run tests in watch mode while developing
npm run test:watch

# 5. Run specific test file
npx jest models/Ticket.test.js

# 6. Run the mandatory State Machine integration tests
npx jest __tests__/integration/stateMachine.test.js
```

This testing guide ensures consistent, reliable, and maintainable tests across the Ticket Management System Backend. For questions or improvements, please update this documentation and share with the team.