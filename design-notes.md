# Design Notes

## Architecture Overview (frontend, backend, database)

A three-tier full-stack application:

```
┌─────────────────────┐      HTTP/JSON       ┌──────────────────────┐      Mongoose      ┌──────────────┐
│      Frontend        │  ───────────────▶   │       Backend         │  ──────────────▶  │   Database    │
│  React + Vite +      │   /api/*            │  Node.js + Express     │                   │   MongoDB     │
│  Redux Toolkit       │  ◀───────────────   │  routes→controllers→   │  ◀──────────────  │  (persistent) │
│  (SPA on :3001)      │   { status, data }  │  models                │                   │               │
└─────────────────────┘                     │  (API on :3000)        │                   └──────────────┘
                                             └──────────────────────┘
```

- **Frontend** is a single-page React app that talks to the backend exclusively through a JSON REST API via a single axios service layer.
- **Backend** is a stateless Express API organized in layers (routes → validation middleware → controllers → Mongoose models). It is the **source of truth for business rules**, especially the status state machine.
- **Database** is MongoDB accessed through Mongoose; it provides durable persistence so data survives restarts. Tests swap in MongoDB Memory Server for isolation and speed.
- **Response contract:** every endpoint returns a uniform envelope — `{ status: 'success' | 'error', message?, data? }` — so the frontend handles success and failure consistently.

---

## Frontend Design

- **Stack:** React + Vite, Redux Toolkit for state, React Router for navigation.
- **Structure:**
  - `pages/` — `Login`, `Dashboard`, `TicketList`, `TicketDetail`, `TicketCreate`
  - `components/` — reusable pieces (`TicketForm`, `Navigation`, `ProtectedRoute`)
  - `store/slices/` — `authSlice`, `ticketsSlice`, `dashboardSlice` (async thunks calling the API)
  - `store/selectors.js` — memoized selectors (filtered tickets, counts, KPIs)
  - `services/api.js` — a single configured axios instance + `ticketService`, `commentService`, `dashboardService`, `authService`
- **Data flow:** components dispatch thunks → thunks call the service layer → reducers update state → selectors feed components. UI never calls axios directly.
- **API instance:** base URL from env, request interceptor attaches the auth token, response interceptor centralizes error shaping and 401 handling.
- **State-machine in the UI:** the ticket status dropdown only offers the current status plus its valid next states (a client-side mirror of the backend rules) so users can't even choose an illegal transition; the backend still enforces it.
- **UX states:** every page renders explicit loading, empty, and error states; forms show inline field-level validation that mirrors backend rules.

---

## Backend Design

- **Stack:** Node.js + Express; `app.js` builds the app, `server.js` handles startup/shutdown (separation aids testability).
- **Layers:**
  - `routes/` — declare endpoints and attach validation middleware (`ticketRoutes`, `ticketCommentRoutes` with `mergeParams`, `commentRoutes`, `dashboardRoutes`)
  - `middleware/validation.js` — `express-validator` rule sets + a shared `handleValidationErrors`
  - `controllers/` — request handling and business logic (`ticketController`, `commentController`, `dashboardController`)
  - `models/` — Mongoose schemas + domain methods
  - `config/database.js` — connection management with retries
- **Cross-cutting:** `helmet` (security headers), `cors` (restricted to known origins via `FRONTEND_URL`), `morgan` (logging), JSON body parsing, health-check endpoints (`/health`, `/health/database`).
- **State machine ownership:** transition rules live in one place (`Ticket.STATUS_TRANSITIONS` + `ticket.canTransitionTo`) and are enforced in both `PUT /api/tickets/:id` and `PATCH /api/tickets/:id/status`.
- **Consistency:** all endpoints return the shared `{ status, message, data }` envelope; errors map to appropriate codes (400 validation, 404 not found, 500 unexpected).

---

## Database Design

- **Engine:** MongoDB with Mongoose ODM; persistent in the running app, in-memory (MongoDB Memory Server) for tests.
- **Collections:**
  - **Ticket** — `title`, `description`, `status` (enum: open/in_progress/resolved/closed/cancelled), `priority` (enum: low/medium/high/critical), `assignee`, `reporter`, `labels[]`, `resolutionDate`, plus timestamps mapped to `createdDate` / `updatedDate`.
  - **Comment** — `ticketId` (ref → Ticket), `content`, `author`, `timestamp` (+ created/updated timestamps).
- **Relationships:** comments reference their ticket by `ticketId`; deleting a ticket cascades to its comments (no orphans).
- **Domain logic in the model:**
  - `pre('save')` sets `resolutionDate` when a ticket becomes resolved/closed and clears it otherwise.
  - `canTransitionTo()` enforces the state machine.
  - `toJSON` transform exposes `id` (from `_id`) and hides `__v`.
- **Indexes:** on `status`, `priority`, `assignee`, `createdDate`, `updatedDate`, and a compound `ticketId + createdDate` on comments — to keep list/filter/search queries responsive.

---

## Validation Strategy

- **Backend is authoritative.** Two layers:
  1. **Request validation** via `express-validator` rule sets (`validateCreateTicket`, `validateUpdateTicket`, `validateAddComment`, `validateDashboardQuery`, resource-param checks) plus a shared `handleValidationErrors` that returns `400` with a field-level message.
  2. **Schema validation** in Mongoose (required fields, enums, min/max lengths) as a second line of defense.
- **Rules enforced:** title 3–100, description 10–2000, priority/status enums, assignee/reporter 2–50, comment content 1–1000 & author 2–50, valid ObjectId params, and state-machine transition validity.
- **Frontend validation** mirrors these rules for immediate feedback, but is never the only gate — the client is treated as untrusted.

---

## Error Handling Strategy

- **Uniform error shape:** `{ status: 'error', message, errors? }` for every failure.
- **Status codes:** `400` (validation / invalid transition / malformed id), `404` (not found), `500` (unexpected), with a clear human-readable `message`.
- **State-machine errors** return an explicit "Invalid status transition" message and leave the ticket unchanged.
- **Frontend surfacing:**
  - Network/unreachable → clear connectivity message.
  - `404` → friendly not-found view with a back link.
  - Validation/transition errors → inline, near the relevant control (never silently swallowed).
  - Loading and empty states shown for all async operations and lists.
- **Safety:** stack traces are never leaked to clients; secrets are never logged.

---

## Testing Strategy Link

Full testing approach, structure, and run instructions:

- Root guide: [`tests/README.md`](./tests/README.md)
- Backend guide (incl. **state-machine steps**): [`src/backend/__tests__/README.md`](./src/backend/__tests__/README.md)
- Latest run report: [`test-results.md`](./test-results.md)

Highlights: unit tests (models, incl. `canTransitionTo`), integration tests for full CRUD + comments, and the **mandatory state-machine integration tier** (`src/backend/__tests__/integration/stateMachine.test.js`) proving every valid transition succeeds and every invalid one is rejected on both status endpoints. Frontend tests cover Redux slices, selectors, the ticket form, and the dashboard.
