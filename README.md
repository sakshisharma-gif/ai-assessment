# TicketDesk — Support Ticket Management System

A modern, full-stack internal application for managing support tickets with enhanced UI/UX design. Internal users can create, update, comment on, search, and progress tickets through a defined lifecycle.

Built as part of the JS AI Capability Exercise using **Kiro** (AI-powered IDE) with comprehensive UI enhancements and modern design patterns.

## 🤖 AI-Assisted Development Journey

This project demonstrates a complete AI-assisted development workflow including iterative refinements, debugging scenarios, and comprehensive testing strategies. See detailed sections below for the full development narrative.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Redux Toolkit + Modern CSS |
| Backend | Node.js + Express + JavaScript |
| Database | MongoDB Atlas + Mongoose |
| Auth | Demo Authentication (Any credentials accepted) |
| Testing | Jest + Supertest + Custom Test Utilities |
| UI/UX | Modern Gradient Design + CSS Animations + Responsive Layout |

---

## Prerequisites

- Node.js v18+
- npm v9+
- MongoDB Atlas account (using cloud database)
- Internet connection for MongoDB Atlas access

---

## Quick Start

### 1. Clone the repository
```bash
git clone <repo-url>
cd ai-practical
```

### 2. Backend setup
```bash
cd src/backend
npm install
npm start     # starts API on http://localhost:3000
```

The backend is pre-configured with MongoDB Atlas credentials and will connect automatically.

### 3. Frontend setup (in a new terminal)
```bash
cd src/frontend
npm install
npm run dev   # starts on http://localhost:3001
```

### 4. Open the app
Navigate to `http://localhost:3001` and use any credentials to login (demo authentication enabled).

**Demo Login**: Use any username and password - the system accepts all credentials for testing purposes.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized JavaScript origins: `http://localhost:3000`
5. Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Secret to `backend/.env`

---

## Running Tests

```bash
cd src/backend
npm run test:integration   # runs all 26 integration tests
```

---

## Project Structure

```
ticket-management-system/
├── README.md
├── candidate-info.md
├── tool-workflow.md
├── requirements-analysis.md
├── acceptance-criteria.md
├── implementation-plan.md
├── design-notes.md
├── api-contract.md
├── data-model.md
├── ui-flow.md
├── test-strategy.md
├── test-results.md
├── debugging-notes.md
├── code-review-notes.md
├── review-fixes.md
├── pr-description.md
├── reflection.md
├── final-ai-usage-summary.md
├── database/
│   ├── schema-or-migrations.md
│   ├── seed-data.md
│   └── setup-notes.md
├── ai-prompts/
│   ├── planning.md
│   ├── design.md
│   ├── implementation.md
│   ├── testing.md
│   ├── debugging.md
│   ├── code-review.md
│   └── documentation.md
├── tool-specific/
│   └── kiro-specs/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
├── backend/          ← Express API
└── frontend/         ← React SPA
```

---

## Features

- ✅ Create, view, update, and list tickets
- ✅ Status state machine (OPEN → IN_PROGRESS → RESOLVED → CLOSED, OPEN/IN_PROGRESS → CANCELLED)
- ✅ Add comments (blocked on CLOSED/CANCELLED tickets)
- ✅ Keyword search + filter by status + filter by assignee + sort
- ✅ Google OAuth authentication + JWT sessions
- ✅ Role-based access (admin / agent / user)
- ✅ 26 integration tests (15 state machine + 11 CRUD)
- ✅ Data persists across server restarts

---

## Requirements Coverage

Every required core feature is implemented and backed by automated tests. Paths are relative to the repo root; test commands run from `src/backend` (backend) or `src/frontend` (frontend).

| # | Requirement | Backend (API + logic) | Frontend (UI) | Tests |
|---|---|---|---|---|
| 1 | **Create a ticket** | `POST /api/tickets` — `controllers/ticketController.js` (`createTicket`), `middleware/validation.js` (`validateCreateTicket`) | `src/frontend/src/pages/TicketCreate/TicketCreate.jsx`, `components/ticket/TicketForm.jsx` | `__tests__/controllers/ticketController.test.js` (Create ×5); `__tests__/components/TicketForm.test.jsx` |
| 2 | **List tickets** | `GET /api/tickets` (pagination) — `getAllTickets` | `pages/TicketList/TicketList.jsx` | `ticketController.test.js` (Get All ×7) |
| 3 | **View ticket details** | `GET /api/tickets/:id` (ticket + comments) — `getTicketById` | `pages/TicketDetail/TicketDetail.jsx` | `ticketController.test.js` (Get by ID ×3) |
| 4 | **Update fields** (title, description, priority, assignee) | `PUT /api/tickets/:id` — `updateTicket` | `TicketDetail.jsx` edit mode / `TicketForm.jsx` | `ticketController.test.js` (Update ×6) |
| 5 | **Change status via enforced state machine** | `PATCH /api/tickets/:id/status` + `PUT` — `models/Ticket.js` (`canTransitionTo`, `STATUS_TRANSITIONS`) | Constrained status dropdown + inline transition error in `TicketDetail.jsx` | **`__tests__/integration/stateMachine.test.js` (×38)**; `models/Ticket.test.js` unit checks |
| 6 | **Add comments to a ticket** | `POST /api/tickets/:id/comments` — `controllers/commentController.js`, nested route with `mergeParams` | Comment form + list in `TicketDetail.jsx` | `__tests__/controllers/commentController.test.js` (×9) |
| 7 | **Keyword search & filter by status** | `GET /api/tickets?search=&status=&priority=&assignee=` — `getAllTickets` | Search box + status/priority filters in `TicketList.jsx` | `ticketController.test.js` (filter/search cases) |
| 8 | **Persist all data; survives restart** | MongoDB (Atlas) via `config/database.js` + Mongoose models | — | Verified live across restarts; suites use MongoDB Memory Server |
| 9 | **Validate required fields; reject invalid input at backend** | `express-validator` (`middleware/validation.js`) + Mongoose schema validation → `400` responses | Client-side validation mirrors backend rules | Create/Update/Comment/Dashboard validation cases |
| 10 | **Meaningful error states in the UI** | Consistent `{ status: 'error', message }` payloads | Error banners: `Login`, `TicketCreate`, `TicketList`; inline save/transition + comment errors in `TicketDetail` | `TicketForm.test.jsx`, `Dashboard.test.jsx` error-state tests |

### Test status (latest run)

| Suite | Location | Result |
|---|---|---|
| Backend (all) | `src/backend/__tests__/**` | ✅ 161/161 passing (8 suites) |
| Frontend (all) | `src/frontend/src/__tests__/**` | ✅ 93/93 passing (7 files) |
| State machine (mandatory tier) | `__tests__/integration/stateMachine.test.js` | ✅ 38/38 passing |

Run everything:
```bash
# Backend
cd src/backend && npm test

# Frontend
cd src/frontend && npm test -- --run
```

A detailed, up-to-date run report lives in [`test-results.md`](./test-results.md).

---

## Seed Users

After running `npm run seed` the following users are available:

| Email | Role |
|---|---|
| admin@ticketdesk.io | admin |
| agent1@ticketdesk.io | agent |
| agent2@ticketdesk.io | agent |
| user1@ticketdesk.io | user |
| user2@ticketdesk.io | user |

> Note: Seed users have synthetic Google IDs. Real users are created on first Google login.