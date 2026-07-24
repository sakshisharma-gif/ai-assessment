# Implementation Plan

## Overview

Build a full-stack **Support Ticket Management System** where internal users can create, list, view, update, comment on, search, and progress tickets through an enforced status state machine, with all data persisted to MongoDB.

- **Frontend:** React + Vite + Redux Toolkit
- **Backend:** Node.js + Express (routes → controllers → models)
- **Database:** MongoDB + Mongoose (MongoDB Memory Server for tests)
- **Testing:** Jest + Supertest (backend), Vitest + React Testing Library (frontend)

The delivery approach is incremental: establish the requirements and architecture, scaffold both apps, build the backend API with real persistence and validation, wire the frontend to the real API, then harden the lifecycle (state machine) with a dedicated integration test tier. The state machine is treated as the highest-value, highest-risk piece and gets the most rigorous testing.

---

## Task Breakdown

### 1. Requirements & Design
- Capture functional/non-functional requirements and acceptance criteria.
- Define the ticket data model (fields, enums) and the API contract.
- Define the status state machine (allowed transitions + terminal states).

### 2. Project Scaffolding
- Set up backend (Express app, config, DB connection, health checks).
- Set up frontend (Vite, Redux store, routing, base layout).
- Establish `.env.example` files and ensure secrets are git-ignored.

### 3. Backend — Core API
- **Models:** `Ticket` (with `canTransitionTo` state machine) and `Comment`.
- **Ticket CRUD:** create, list (pagination/filter/search/sort), get-by-id, update, delete (cascade comments).
- **Status updates:** dedicated `PATCH /:id/status` plus status changes via `PUT`.
- **Comments:** nested `POST/GET /tickets/:id/comments`.
- **Validation middleware:** required fields, enums, length constraints → 400 responses.
- **Dashboard/KPIs:** aggregate stats endpoints.

### 4. Frontend — Feature Pages
- **Ticket list:** table, keyword search, status/priority filters, pagination.
- **Create ticket:** form with client-side validation mirroring the backend.
- **Ticket detail:** view fields + comments; edit mode for fields/reassign; status control constrained to valid transitions.
- **Comments:** add-comment form wired to the API.
- **State management:** Redux slices calling the real API service layer.
- **Error/empty/loading states** across all pages.

### 5. State Machine Hardening (signature piece)
- Enforce transitions in the model and reject invalid ones at the API with clear messages.
- Constrain the UI status dropdown to valid next states and surface transition errors inline.

### 6. Testing
- Model unit tests (validation, `canTransitionTo`).
- Controller integration tests for full CRUD + comments.
- **Mandatory:** dedicated state-machine integration suite (valid succeed / invalid rejected, both endpoints).
- Frontend tests for slices, selectors, form, and dashboard.

### 7. Documentation & Review
- Root README with setup + requirements coverage.
- Testing guides (incl. how to run the state-machine tests).
- `test-results.md` run report; prompt history; acceptance-criteria checklist.

---

## Milestones

| # | Milestone | Definition of Done |
|---|-----------|--------------------|
| M1 | Requirements & design locked | Requirements, acceptance criteria, data model, and state machine documented |
| M2 | Apps scaffolded & running | Backend serves `/health`; frontend renders and connects; DB connects |
| M3 | Backend CRUD complete | All ticket + comment endpoints working with validation and persistence |
| M4 | Frontend wired to real API | Create/list/detail/edit/comment/search/filter all functional in the UI |
| M5 | State machine enforced | Invalid transitions rejected (backend) and handled clearly (frontend) |
| M6 | Tests green | Backend + frontend suites pass; state-machine integration tier complete |
| M7 | Docs & polish | README, testing guides, test-results, and acceptance criteria finalized |

---

## AI Usage Plan

AI (Kiro) is used across the lifecycle, with human review at each step:

- **Planning:** draft requirements, acceptance criteria, and the state-machine definition; refine through Q&A.
- **Design:** propose the data model, API contract, and folder structure.
- **Implementation:** generate models, controllers, routes, validation middleware, Redux slices, and React components; iterate on diffs.
- **Debugging:** diagnose runtime issues (CORS, enum casing, response unwrapping, nested-route params) with AI proposing root-cause fixes.
- **Testing:** generate and maintain unit/integration tests, especially the exhaustive state-machine matrix; align tests with real behavior.
- **Documentation:** produce README, testing guides, requirement analysis, and run reports.
- **Prompt history:** every prompt and outcome recorded in `ai-prompts/prompt-history.md` for traceability.

Guardrails: no secrets in prompts or commits; AI output is reviewed, built, and tested before acceptance; the backend remains the source of truth for business rules regardless of AI-suggested shortcuts.

---

## Risks

| Risk | Impact |
|------|--------|
| **State-machine gaps** — an invalid transition slips through or a valid one is blocked | High — corrupts ticket history; it's the signature requirement |
| **Frontend/backend contract drift** — mismatched enums, casing, or response shapes | High — features "silently" break (e.g. create returns 400, undefined IDs) |
| **Validation only on the client** — backend trusts input | High — invalid/unsafe records persist |
| **Data loss / non-persistent store** — using in-memory DB in the running app | High — data doesn't survive restart |
| **Secrets committed** — `.env` or credentials pushed to the repo | High — security exposure |
| **Flaky/slow tests** — shared state or huge inputs typed char-by-char | Medium — erodes trust in the suite |
| **Scope creep** — auth/roles/notifications beyond core | Medium — delays core delivery |
| **AI-introduced regressions** — plausible-looking but wrong edits | Medium — bugs merged without verification |

---

## Mitigation

- **State machine:** define transitions in one place (`STATUS_TRANSITIONS`), enforce in the model, and cover with a dedicated integration suite exercising every valid + invalid transition on both endpoints; mirror the rules in the UI dropdown.
- **Contract drift:** standardize a single response envelope and a shared lowercase enum vocabulary; add API integration tests; verify each feature end-to-end in the browser after changes.
- **Validation:** enforce with server-side `express-validator` + Mongoose schema rules returning `400`; mirror rules client-side for UX only, never as the sole gate.
- **Persistence:** use real MongoDB in the app (Memory Server only for tests); verify data survives a backend restart.
- **Secrets:** keep values in git-ignored `.env`, commit only `.env.example`; restrict CORS to known origins.
- **Test reliability:** isolate tests (clean DB per test), use in-memory Mongo for speed, and use direct events for large-input cases instead of char-by-char typing.
- **Scope control:** keep auth/roles/notifications explicitly out of core scope; log them as clarifications for the product owner.
- **AI regressions:** review every diff, run the build and full test suites after changes, and treat execution results (not assumptions) as the source of truth.
