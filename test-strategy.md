# Test Strategy

## Test Scope

This document outlines the testing strategy for the Ticket Management System, covering both backend (Node.js/Express/MongoDB) and frontend (React/Redux) components.

### Testing Goals
- Ensure all CRUD operations work correctly for tickets and comments
- Validate the status state machine enforces proper transitions
- Verify API validation rejects invalid input
- Confirm frontend components render correctly and integrate with Redux store
- Test error handling paths in both frontend and backend

### Test Environment
- **Backend:** Jest + Supertest with MongoDB Memory Server (in-memory database)
- **Frontend:** Vitest + React Testing Library with jsdom

---

## Unit Tests

### Backend Unit Tests

| Test File | Coverage Area | Key Tests |
|-----------|---------------|-----------|
| `models/Ticket.test.js` | Ticket model validation & business logic | Field validation, status transitions, static methods |
| `models/Comment.test.js` | Comment model validation | Content/author validation, ticketId association |

**Ticket Model Unit Tests:**
- Required field validation (title, description, assignee, reporter)
- Field length constraints (title: 3-100, description: 10-2000)
- Enum validation (status, priority)
- Labels array validation (each: 2-30 characters)
- `canTransitionTo()` method for state machine logic
- `resolutionDate` auto-set on resolve/close
- JSON transformation (_id → id)
- Database index verification


**Static Method Tests:**
- `findByStatus()` - Filter tickets by status
- `findByPriority()` - Filter tickets by priority
- `findByAssignee()` - Filter tickets by assignee
- `getDashboardStats()` - Aggregation for dashboard metrics

### Frontend Unit Tests

| Test File | Coverage Area | Key Tests |
|-----------|---------------|-----------|
| `App.test.jsx` | Main App component | Routing, auth state, Redux integration |

**App Component Tests:**
- Renders without crashing
- Shows login page when unauthenticated
- Displays branding and form elements
- Demo credentials section visibility
- Redux store integration
- Redirects to dashboard when authenticated

---

## Component Tests

### Frontend Component Tests

| Component | Test Focus |
|-----------|------------|
| Login Page | Form validation, authentication flow, demo credentials |
| Navigation | Menu items, active states, logout functionality |
| ProtectedRoute | Auth guard, redirect behavior |
| Ticket List | Table rendering, pagination, filtering |
| Ticket Detail | Data display, comment section, status updates |
| Ticket Create | Form submission, validation feedback |
| Dashboard | Stats display, recent activity |

**Test Utilities:**
- Custom Redux test wrapper (`renderWithRedux`)
- Preloaded state injection for testing different auth states
- Mock API responses via axios-mock-adapter

---


## API / Integration Tests

### Backend Integration Tests

| Test File | Endpoint Coverage | Key Scenarios |
|-----------|-------------------|---------------|
| `controllers/ticketController.test.js` | All `/api/tickets` endpoints | CRUD operations, filtering, pagination |
| `controllers/commentController.test.js` | `/api/tickets/:id/comments` | Add/list comments, nested routing |
| `controllers/dashboardController.test.js` | `/api/dashboard/*` | Stats, KPIs, user/team dashboards |
| `integration/stateMachine.test.js` | Status transitions | Valid/invalid transitions via PUT & PATCH |
| `app.test.js` | Health endpoints | `/health`, `/health/database` |

### Ticket Controller Integration Tests

**Create Ticket (POST /api/tickets):**
- Create with all valid fields
- Reject missing required fields
- Reject invalid priority enum
- Validate title/description length constraints
- Apply default values (priority: medium, status: open)

**List Tickets (GET /api/tickets):**
- Default pagination (page 1, limit 10)
- Filter by status, priority, assignee
- Keyword search across multiple fields
- Sorting by various fields
- Combined filters

**Get Ticket (GET /api/tickets/:id):**
- Retrieve ticket with comments
- 404 for non-existent ticket
- 400 for invalid ObjectId format

**Update Ticket (PUT /api/tickets/:id):**
- Update individual fields
- Validate status transitions
- Set resolutionDate on resolve
- 404 for non-existent ticket


**Update Status (PATCH /api/tickets/:id/status):**
- Valid status transitions
- Reject invalid transitions with clear error
- Require status in request body

**Delete Ticket (DELETE /api/tickets/:id):**
- Delete ticket and cascade delete comments
- 404 for non-existent ticket
- 400 for invalid ObjectId

### State Machine Integration Tests (Mandatory)

**Valid Transitions Tested:**
| From | To |
|------|-----|
| open | in_progress |
| open | cancelled |
| in_progress | resolved |
| in_progress | cancelled |
| resolved | closed |

**Invalid Transitions Tested:**
| From | To (Rejected) |
|------|---------------|
| open | resolved, closed |
| in_progress | open, closed |
| resolved | open, in_progress, cancelled |
| closed | any status (terminal) |
| cancelled | any status (terminal) |

**Lifecycle Tests:**
- Complete happy path: open → in_progress → resolved → closed
- Cancel from open, then reject further changes
- Both PUT and PATCH endpoints covered

### Comment Controller Integration Tests

- Add comment to existing ticket (POST)
- List comments for a ticket (GET)
- Validation: empty content, short author, content length
- 404 for non-existent ticket
- 400 for invalid ticket ID format

---


## Edge Case Tests

### Backend Edge Cases

| Category | Test Cases |
|----------|------------|
| **Validation Boundaries** | Title exactly 3 chars, title exactly 100 chars, description at min/max |
| **Empty States** | List tickets when none exist, list comments on ticket with none |
| **Concurrent Updates** | Two simultaneous field updates on same ticket |
| **Terminal States** | Attempt any transition from closed/cancelled |
| **Cascade Deletion** | Delete ticket verifies all comments removed |
| **Search Edge Cases** | Search with no matches, partial matches, case sensitivity |
| **Pagination Edge Cases** | Page beyond total pages, limit=1, limit=100 |

### Frontend Edge Cases

| Category | Test Cases |
|----------|------------|
| **Auth States** | Token expiry handling, logout cleanup |
| **Empty States** | No tickets in list, no comments on ticket |
| **Loading States** | Spinner display during API calls |
| **Error States** | Network failure, validation errors, 404 responses |
| **Form Validation** | Client-side validation before submission |

### Real-World Scenario Tests

- **Complete Ticket Lifecycle:** Create → assign → progress → resolve → close
- **Bulk Operations:** Create multiple tickets, filter, sort, paginate
- **Concurrent Modifications:** Multiple updates to same ticket
- **Critical Ticket Flow:** Priority escalation, urgent labeling

---

## Tests Not Covered (and why)

### Authentication & Authorization
**Not Covered:** JWT validation, role-based access control, session management  
**Reason:** Demo implementation uses mock auth. Production would require full auth tests.

### End-to-End (E2E) Tests
**Not Covered:** Cypress/Playwright browser automation  
**Reason:** Time constraints. E2E would validate full user flows but requires additional tooling setup.


### Performance Tests
**Not Covered:** Load testing, stress testing, response time benchmarks  
**Reason:** Requires tools like k6/Artillery and production-like environment. Out of scope for MVP.

### Security Tests
**Not Covered:** SQL/NoSQL injection, XSS, CSRF, rate limiting  
**Reason:** Basic input validation is tested; penetration testing requires specialized tools.

### Accessibility Tests
**Not Covered:** WCAG compliance, screen reader compatibility  
**Reason:** Requires manual testing with assistive technologies and expert review.

### Mobile/Responsive Tests
**Not Covered:** Viewport testing, touch interactions  
**Reason:** Would require visual regression tools or manual device testing.

### Database Migration Tests
**Not Covered:** Schema changes, data migration scripts  
**Reason:** Not applicable for initial implementation; would be needed for production upgrades.

### Middleware Unit Tests
**Not Covered:** Isolated validation middleware tests  
**Reason:** Validation is indirectly tested through controller integration tests. Could be added for more granular coverage.

---

## Running Tests

### Backend Tests
```bash
cd src/backend
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report
npm run test:watch       # Watch mode for development
```

### Frontend Tests
```bash
cd src/frontend
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report
npm run test:ui          # Interactive UI mode
```

### State Machine Tests Only
```bash
cd src/backend
npm test -- __tests__/integration/stateMachine.test.js
```
