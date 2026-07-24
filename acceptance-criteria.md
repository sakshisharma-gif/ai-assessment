# Acceptance Criteria

## Core

- [x] **AC-01** A user can create a ticket via the UI.
- [x] **AC-02** A user can view all tickets from the database.
- [x] **AC-03** A user can open a ticket detail view.
- [x] **AC-04** A user can update ticket fields and reassign.
- [x] **AC-05** A user can add comments.
- [x] **AC-06** Status changes only through valid transitions; invalid ones are rejected.
- [x] **AC-07** Keyword search and status filter work.
- [x] **AC-08** Data remains available after restart.
- [x] **AC-09** Backend validation prevents invalid records.
- [x] **AC-10** No secrets committed to the repo.
- [x] **AC-11** State-machine integration tests pass.

## Validation

- [x] Title: required, 3–100 chars — returns 400 with field-level error if violated
- [x] Description: required, 10–2000 chars — returns 400 if missing/too short
- [x] Priority: must be one of low / medium / high / critical — returns 400 for invalid value
- [x] Assignee & Reporter: required, 2–50 chars — returns 400 if missing/invalid
- [x] Comment content: required, 1–1000 chars; author required, 2–50 chars — returns 400 if invalid
- [x] Status transition: must follow the state machine — returns 400 with an "Invalid status transition" message

## Error Handling

- [x] Network errors show a clear "unable to reach the server" style message
- [x] 404 errors (ticket not found) show a friendly message with a back link
- [x] 400 validation errors surface field-level / inline errors on forms
- [x] Invalid status transitions surface an inline error near the status control (not swallowed)
- [x] Async operations show loading states
- [x] Lists show an empty state when there is no data

## Testing

- [x] 38 state-machine integration tests (`__tests__/integration/stateMachine.test.js`) — all pass
- [x] 33 ticket CRUD/validation integration tests (`__tests__/controllers/ticketController.test.js`) — all pass
- [x] Backend: 161 tests across 8 suites; Frontend: 93 tests across 7 files — all pass
- [x] Tests use real HTTP requests via supertest against in-memory MongoDB (MongoDB Memory Server)
- [x] Tests are isolated — no shared state between test cases
- [x] Run with: `npm test` (from `src/backend` and `src/frontend`)

## Documentation

- [x] `README.md` with full setup instructions and requirements coverage at repo root
- [x] `src/frontend/README.md` with environment config and scripts
- [x] `tests/README.md` and `src/backend/__tests__/README.md` testing guides (incl. state-machine steps)
- [x] `test-results.md` with the latest run report (CRUD + state machine)
- [x] `.env.example` files committed for backend and frontend with placeholder values
- [x] Prompt history documented in `ai-prompts/prompt-history.md`