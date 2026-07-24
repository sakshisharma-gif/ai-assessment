# Requirement Analysis

## Selected Project Option

**Support Ticket Management System** — a full-stack internal web application where users can create support tickets, browse and search them, view details, update fields, add comments, and move tickets through a defined lifecycle enforced by a status state machine.

- **Frontend:** React + Vite + Redux Toolkit
- **Backend:** Node.js + Express
- **Database:** MongoDB (persistent) with Mongoose; MongoDB Memory Server for tests

---

## My Understanding (in my own words)

The goal is a small but complete ticketing tool that an internal team could actually use. A user creates a ticket describing an issue, that ticket gets tracked as work progresses, and people collaborate on it through comments. The important part is not just CRUD — it's that a ticket has a **lifecycle** that can't be skipped or reversed arbitrarily. A ticket starts `open`, moves to `in_progress` when someone picks it up, becomes `resolved` once the work is done, and is finally `closed`. At any active point it can be `cancelled`. Illegal jumps (e.g. `open → closed`, or reopening a `closed` ticket) must be refused by the backend so the data always reflects a valid history.

Beyond the lifecycle, the system needs the everyday essentials: list and search tickets, filter by status, see a detail view, edit the key fields, and reassign work. Everything must persist to a real database so nothing is lost on restart, the backend must reject invalid input rather than trusting the client, and the UI must show clear, honest error and empty states instead of silently failing.

---

## Functional Requirements

1. **Create a ticket** — via the UI, capturing title, description, priority, assignee, reporter, and optional labels.
2. **List tickets** — a browsable, paginated list of all tickets from the database.
3. **View ticket details** — a detail view showing all fields plus the ticket's comments.
4. **Update ticket fields** — edit title, description, priority, and assignee (reassignment).
5. **Change status through the enforced state machine** — only valid transitions are allowed:
   - `open → in_progress`, `open → cancelled`
   - `in_progress → resolved`, `in_progress → cancelled`
   - `resolved → closed`
   - `closed` and `cancelled` are terminal
6. **Add comments to a ticket** — with author and timestamp; comments are listed chronologically.
7. **Keyword search and filter by status** — search across ticket text and narrow the list by status (and priority/assignee).
8. **Persist all data** — data lives in MongoDB and survives a backend restart.
9. **Backend validation** — required fields and value constraints are enforced server-side; invalid input is rejected with a clear error.
10. **Meaningful error states in the UI** — validation errors, invalid transitions, not-found, loading, and empty states are all surfaced clearly.

---

## Non-Functional Requirements

- **Data integrity:** the state machine is enforced at the backend (source of truth), not only in the UI, so no client can push a ticket into an invalid state.
- **Reliability / persistence:** data is durable across restarts; no in-memory-only state in production.
- **Usability:** clear feedback for every action — loading indicators, inline validation, and empty states; users can only pick valid next statuses in the UI.
- **Security / secrets hygiene:** no secrets committed to the repo; environment values come from `.env` (git-ignored) with committed `.env.example` placeholders. CORS restricted to known origins.
- **Maintainability:** clear separation of concerns (routes → controllers → models), reusable validation middleware, and a documented test strategy.
- **Testability:** business rules (especially the state machine) are covered by isolated, repeatable integration tests using an in-memory database.
- **Performance:** list endpoints support pagination and indexed queries to stay responsive as ticket volume grows.
- **Consistency:** a single, uniform API response envelope (`{ status, message, data }`) and a shared enum vocabulary between frontend and backend.

---

## Assumptions

- **Single-team, trusted internal users** — authentication is a lightweight/demo gate; fine-grained roles and permissions are out of scope.
- **Assignee/reporter are free-text names**, not linked user accounts (no user-management or directory integration required).
- **Comments are create/read only** — editing and deleting comments is not required for the core scope.
- **Priority values** are a fixed set: `low`, `medium`, `high`, `critical`.
- **Status vocabulary** is fixed: `open`, `in_progress`, `resolved`, `closed`, `cancelled`.
- **Resolution date** is set automatically when a ticket becomes `resolved`/`closed`, and cleared for non-terminal states.
- **English-only UI**, single time zone display; localization is out of scope.
- **A single MongoDB database** is sufficient; no multi-tenant separation required.
- **Deleting a ticket** cascades to its comments.

---

## Clarifications (questions for a product owner)

1. **Reopening:** should `closed` (or `cancelled`) tickets ever be reopenable, or are they strictly terminal? (Current build treats both as terminal.)
2. **Cancel from resolved:** should a `resolved` ticket be cancellable, or only `open`/`in_progress` tickets? (Current build allows cancel only from `open`/`in_progress`.)
3. **Editing terminal tickets:** should fields (title, description, assignee) be editable after a ticket is `closed`/`cancelled`, or frozen?
4. **Comments on terminal tickets:** are comments allowed on `closed`/`cancelled` tickets?
5. **Assignee model:** should assignee be a real user account (with a picker and validation) rather than free text?
6. **Search scope:** should keyword search cover only title/description, or also comments, labels, assignee, and reporter?
7. **Permissions:** does the product need roles (e.g. only assignee/admin can change status or delete)?
8. **Delete semantics:** hard delete vs. soft delete/archive for auditability?
9. **Notifications:** are email/in-app notifications expected on assignment or status change?
10. **SLA / due dates:** are there time-based expectations (due dates, SLA timers) on tickets?
11. **Audit trail:** is a full history of status changes and edits required for compliance?

---

## Edge Cases

**State machine**
- Attempting an invalid transition (e.g. `open → resolved`, `in_progress → closed`, `resolved → open`) → rejected with a clear error; ticket status unchanged.
- Any transition out of a terminal state (`closed`/`cancelled`) → rejected.
- Setting a ticket to its current status (no-op) → treated as allowed / harmless.

**Validation & input**
- Missing required fields (title, description, assignee, reporter) → rejected server-side.
- Boundary lengths: title below 3 or above 100 chars; description below 10 or above 2000; comment above 1000 chars → rejected.
- Out-of-enum priority or status values → rejected.
- Malformed ticket ID (not a valid ObjectId) → `400`, not a server crash.
- Operations on a non-existent ticket (get/update/delete/comment) → `404`.
- Attempting to comment on a non-existent ticket → `404`.
- Basic input sanitization (e.g. stripping script tags) so stored content is safe to render.

**Data & concurrency**
- Two near-simultaneous updates to the same ticket → last write wins without corrupting the document.
- Deleting a ticket → associated comments are also removed (no orphaned comments).
- Empty database → list/dashboard return empty results gracefully (no errors, clear empty state).

**Search & filtering**
- Search term with no matches → empty result set, not an error.
- Combined filters (status + priority + keyword) → correctly intersected.
- Pagination beyond the last page → empty page with correct metadata.

**Frontend / UX**
- Backend unreachable / network error → clear "unable to reach server" message.
- Slow requests → loading state shown; no duplicate submissions.
- Invalid status transition rejected by the backend → inline error shown near the status control (the UI also restricts the dropdown to valid next states as a first line of defense).
- Direct navigation to a detail URL for a missing/deleted ticket → friendly not-found view with a way back.
