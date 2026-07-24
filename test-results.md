# Test Results

**Last updated:** 2026-07-25 02:46
**Scope:** Ticket CRUD flow + Status State Machine (integration tiers)
**Runner:** Jest + Supertest + MongoDB Memory Server (run from `src/backend`)

---

## Combined Summary

| Suite | File | Suites | Tests | Status |
| ----- | ---- | ------ | ----- | ------ |
| Ticket CRUD (API) | `__tests__/controllers/ticketController.test.js` | 1 | 33 | ✅ PASS |
| Status State Machine | `__tests__/integration/stateMachine.test.js` | 1 | 38 | ✅ PASS |
| **Total** | | **2** | **71** | ✅ **PASS** |

**Failures: 0 · Duration: ~2.7s**

### Coverage (these two suites)

| File | % Stmts | % Branch | % Funcs | % Lines |
| ---- | ------- | -------- | ------- | ------- |
| `controllers/ticketController.js` | 73.01 | 60.52 | 72.72 | 73.94 |
| `models/Ticket.js` | 88.88 | 93.33 | 66.66 | 88.88 |

> Run the full suite (`npm test`) for the complete, repository-wide coverage picture.

---

## 1. Ticket CRUD Flow — `ticketController.test.js`

Integration tests covering every CRUD endpoint against a real database.

**Result: ✅ 33/33 passed**

### How to run
```bash
cd src/backend
npx jest __tests__/controllers/ticketController.test.js --verbose
```

### Coverage by operation

| CRUD op | Endpoint | Tests | Status |
| ------- | -------- | ----- | ------ |
| Create | `POST /api/tickets` | 5 | ✅ |
| Read (list) | `GET /api/tickets` | 7 | ✅ |
| Read (one) | `GET /api/tickets/:id` | 3 | ✅ |
| Update | `PUT /api/tickets/:id` | 6 | ✅ |
| Delete | `DELETE /api/tickets/:id` | 3 | ✅ |
| Read by status | `GET /api/tickets/status/:status` | 3 | ✅ |
| Status update | `PATCH /api/tickets/:id/status` | 3 | ✅ |
| Workflow scenarios | (create → update → resolve, concurrency, bulk) | 3 | ✅ |

### Notable cases verified
- **Create**: success, missing required fields (400), invalid priority (400), title-length validation, default values applied.
- **List**: default pagination, filter by status/priority, text search, pagination, semantic priority sorting, combined filters.
- **Read one**: valid id, `404` for missing, `400` for malformed id.
- **Update**: field updates, valid/invalid status transitions, `resolutionDate` set on resolve, `404` for missing, field-constraint validation.
- **Delete**: ticket removed **and associated comments cascade-deleted**, `404` for missing, `400` for malformed id.
- **Workflows**: complete lifecycle, concurrent modifications, bulk operations via filters.

---

## 2. Status State Machine — `stateMachine.test.js` ★ Mandatory Tier

End-to-end proof of the ticket status state-machine rules via the real API,
covering both `PUT /api/tickets/:id` and `PATCH /api/tickets/:id/status`.

**Result: ✅ 38/38 passed**

### How to run
```bash
cd src/backend
npx jest __tests__/integration/stateMachine.test.js --verbose

# subsets
npx jest __tests__/integration/stateMachine.test.js -t "Valid transitions succeed"
npx jest __tests__/integration/stateMachine.test.js -t "Invalid transitions are rejected"
```

### State machine under test

| From          | Allowed → To               |
| ------------- | -------------------------- |
| `open`        | `in_progress`, `cancelled` |
| `in_progress` | `resolved`, `cancelled`    |
| `resolved`    | `closed`                   |
| `closed`      | _(terminal — none)_        |
| `cancelled`   | _(terminal — none)_        |

### Results by group

**✅ Valid transitions succeed (10/10)** — each returns `200` and persists the new status, verified on both endpoints.

| Transition | PUT | PATCH |
| ---------- | --- | ----- |
| open → in_progress | ✅ | ✅ |
| in_progress → resolved | ✅ | ✅ |
| resolved → closed | ✅ | ✅ |
| open → cancelled | ✅ | ✅ |
| in_progress → cancelled | ✅ | ✅ |

**✅ Invalid transitions are rejected (26/26)** — each returns `400` with `"Invalid status transition"` and leaves the status **unchanged**, verified on both endpoints.

| Transition | PUT | PATCH |
| ---------- | --- | ----- |
| open → resolved | ✅ | ✅ |
| open → closed | ✅ | ✅ |
| in_progress → open | ✅ | ✅ |
| in_progress → closed | ✅ | ✅ |
| resolved → open | ✅ | ✅ |
| resolved → in_progress | ✅ | ✅ |
| resolved → cancelled | ✅ | ✅ |
| closed → open | ✅ | ✅ |
| closed → in_progress | ✅ | ✅ |
| closed → resolved | ✅ | ✅ |
| cancelled → open | ✅ | ✅ |
| cancelled → in_progress | ✅ | ✅ |
| cancelled → resolved | ✅ | ✅ |

**✅ End-to-end lifecycle (2/2)**
- ✅ Walks `open → in_progress → resolved → closed` (resolutionDate set on resolve)
- ✅ Cancels an `open` ticket, then rejects any further transition (terminal state)

---

## Related coverage (not in the two suites above)

- **Model/unit** — `__tests__/models/Ticket.test.js`: schema validation, business
  logic, and `canTransitionTo()` state-machine unit checks.
- **Comments** — `__tests__/controllers/commentController.test.js`: add/list
  comments, validation, nested-route (`mergeParams`) behavior.
- **Dashboard** — `__tests__/controllers/dashboardController.test.js`: KPI stats,
  trends, team/user dashboards.
- **App** — `__tests__/app.test.js`: health checks, CORS, security headers.

Run everything together with `npm test` from `src/backend`.
