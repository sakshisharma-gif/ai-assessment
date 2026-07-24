# API Contract

**Base URL:** `http://localhost:3000/api`  
**Content-Type:** `application/json`

## Response Envelope

All API responses follow a consistent structure:

```json
{
  "status": "success" | "error",
  "message": "Human-readable message",
  "data": { /* payload on success */ }
}
```

---

## Tickets

### Endpoint: Create Ticket
**Method:** `POST`  
**Path:** `/tickets`  
**Purpose:** Create a new ticket with initial status `open`.

#### Request
```json
{
  "title": "Bug: Login form not submitting",
  "description": "The login form shows a spinner but never completes when clicking Submit on Safari.",
  "priority": "high",
  "assignee": "Alice Chen",
  "reporter": "Bob Martinez",
  "labels": ["bug", "ux"]
}
```

#### Response
```json
{
  "status": "success",
  "message": "Ticket created successfully",
  "data": {
    "ticket": {
      "id": "668f3c8cdc643f2637c4aba1",
      "title": "Bug: Login form not submitting",
      "description": "The login form shows a spinner...",
      "status": "open",
      "priority": "high",
      "assignee": "Alice Chen",
      "reporter": "Bob Martinez",
      "labels": ["bug", "ux"],
      "resolutionDate": null,
      "createdDate": "2026-07-25T10:30:00.000Z",
      "updatedDate": "2026-07-25T10:30:00.000Z"
    }
  }
}
```


#### Validation Rules
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| title | Yes | string | 3–100 characters |
| description | Yes | string | 10–2000 characters |
| priority | No | enum | `low`, `medium`, `high`, `critical` (default: `medium`) |
| assignee | Yes | string | 2–50 characters |
| reporter | Yes | string | 2–50 characters |
| labels | No | array | Array of strings, each 2–30 characters |

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Missing required field | `"Title is required"` |
| 400 | Invalid priority | `"Priority must be one of: low, medium, high, critical"` |
| 400 | Title too short | `"Title must be between 3 and 100 characters"` |
| 400 | Description too short | `"Description must be between 10 and 2000 characters"` |

---

### Endpoint: List Tickets
**Method:** `GET`  
**Path:** `/tickets`  
**Purpose:** Retrieve a paginated, filterable, searchable list of tickets.

#### Request
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 10 | Items per page (max 100) |
| status | enum | — | Filter: `open`, `in_progress`, `resolved`, `closed`, `cancelled` |
| priority | enum | — | Filter: `low`, `medium`, `high`, `critical` |
| assignee | string | — | Filter by assignee name |
| reporter | string | — | Filter by reporter name |
| search | string | — | Keyword search across title, description, assignee, reporter |
| sortBy | string | `createdDate` | Sort field: `createdDate`, `updatedDate`, `title`, `status`, `priority` |
| sortOrder | string | `desc` | `asc` or `desc` |


#### Response
```json
{
  "status": "success",
  "data": {
    "tickets": [
      {
        "id": "668f3c8cdc643f2637c4aba1",
        "title": "Bug: Login form not submitting",
        "status": "open",
        "priority": "high",
        "assignee": "Alice Chen",
        "reporter": "Bob Martinez",
        "labels": ["bug", "ux"],
        "createdDate": "2026-07-25T10:30:00.000Z",
        "updatedDate": "2026-07-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalPages": 3,
      "totalCount": 25
    }
  }
}
```

#### Validation Rules
- `page` and `limit` must be positive integers
- `status` and `priority` must be valid enum values if provided
- `sortBy` must be one of: `createdDate`, `updatedDate`, `title`, `status`, `priority`
- `sortOrder` must be `asc` or `desc`

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid status | `"Status must be one of: open, in_progress, resolved, closed, cancelled"` |
| 400 | Invalid priority | `"Priority must be one of: low, medium, high, critical"` |

---

### Endpoint: Get Ticket by ID
**Method:** `GET`  
**Path:** `/tickets/:id`  
**Purpose:** Retrieve a single ticket with its comments.


#### Request
Path parameter: `id` (MongoDB ObjectId)

#### Response
```json
{
  "status": "success",
  "data": {
    "ticket": {
      "id": "668f3c8cdc643f2637c4aba1",
      "title": "Bug: Login form not submitting",
      "description": "The login form shows a spinner but never completes...",
      "status": "in_progress",
      "priority": "high",
      "assignee": "Alice Chen",
      "reporter": "Bob Martinez",
      "labels": ["bug", "ux"],
      "resolutionDate": null,
      "createdDate": "2026-07-25T10:30:00.000Z",
      "updatedDate": "2026-07-25T11:00:00.000Z"
    },
    "comments": [
      {
        "id": "668f3c8cdc643f2637c4aba2",
        "ticketId": "668f3c8cdc643f2637c4aba1",
        "content": "Reproduced on Safari 17. Investigating.",
        "author": "Alice Chen",
        "timestamp": "2026-07-25T11:00:00.000Z"
      }
    ]
  }
}
```

#### Validation Rules
- `id` must be a valid 24-character MongoDB ObjectId

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Malformed ID | `"Invalid ticket ID"` |
| 404 | Ticket not found | `"Ticket not found"` |

---

### Endpoint: Update Ticket
**Method:** `PUT`  
**Path:** `/tickets/:id`  
**Purpose:** Update ticket fields (title, description, priority, assignee, status, labels).


#### Request
```json
{
  "title": "Bug: Login form not submitting on Safari",
  "priority": "critical",
  "assignee": "Carol Davis",
  "status": "in_progress"
}
```

#### Response
```json
{
  "status": "success",
  "message": "Ticket updated successfully",
  "data": {
    "ticket": {
      "id": "668f3c8cdc643f2637c4aba1",
      "title": "Bug: Login form not submitting on Safari",
      "status": "in_progress",
      "priority": "critical",
      "assignee": "Carol Davis",
      "updatedDate": "2026-07-25T12:00:00.000Z"
    }
  }
}
```

#### Validation Rules
- Same constraints as Create (when fields are provided)
- **Status transitions must follow the state machine:**

| From | Allowed → To |
|------|--------------|
| `open` | `in_progress`, `cancelled` |
| `in_progress` | `resolved`, `cancelled` |
| `resolved` | `closed` |
| `closed` | _(terminal — none)_ |
| `cancelled` | _(terminal — none)_ |

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid status transition | `"Invalid status transition from open to resolved"` |
| 400 | Validation failure | `"Priority must be one of: low, medium, high, critical"` |
| 404 | Ticket not found | `"Ticket not found"` |

---


### Endpoint: Update Ticket Status
**Method:** `PATCH`  
**Path:** `/tickets/:id/status`  
**Purpose:** Change only the ticket status (dedicated endpoint for state-machine transitions).

#### Request
```json
{
  "status": "resolved"
}
```

#### Response
```json
{
  "status": "success",
  "message": "Status updated successfully",
  "data": {
    "ticket": {
      "id": "668f3c8cdc643f2637c4aba1",
      "status": "resolved",
      "resolutionDate": "2026-07-25T14:00:00.000Z",
      "updatedDate": "2026-07-25T14:00:00.000Z"
    }
  }
}
```

#### Validation Rules
- `status` is required and must be a valid enum value
- Transition must follow the state machine rules (see Update Ticket)

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Missing status | `"Status is required"` |
| 400 | Invalid status value | `"Status must be one of: open, in_progress, resolved, closed, cancelled"` |
| 400 | Invalid transition | `"Invalid status transition from in_progress to closed"` |
| 404 | Ticket not found | `"Ticket not found"` |

---

### Endpoint: Delete Ticket
**Method:** `DELETE`  
**Path:** `/tickets/:id`  
**Purpose:** Permanently delete a ticket and all associated comments.


#### Request
Path parameter: `id` (MongoDB ObjectId)

#### Response
```json
{
  "status": "success",
  "message": "Ticket deleted successfully"
}
```

#### Validation Rules
- `id` must be a valid MongoDB ObjectId

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Malformed ID | `"Invalid ticket ID"` |
| 404 | Ticket not found | `"Ticket not found"` |

---

### Endpoint: Get Tickets by Status
**Method:** `GET`  
**Path:** `/tickets/status/:status`  
**Purpose:** Retrieve tickets filtered by a specific status.

#### Request
Path parameter: `status` (`open`, `in_progress`, `resolved`, `closed`, `cancelled`)

#### Response
Same structure as List Tickets.

#### Validation Rules
- `status` must be a valid enum value

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid status | `"Status must be one of: open, in_progress, resolved, closed, cancelled"` |

---

### Endpoint: Get Tickets by Assignee
**Method:** `GET`  
**Path:** `/tickets/assignee/:assignee`  
**Purpose:** Retrieve tickets assigned to a specific user.


#### Request
Path parameter: `assignee` (2–50 characters)  
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| status | enum | — | Optional status filter |
| limit | number | 50 | Number of tickets to return |

#### Response
Same structure as List Tickets.

#### Validation Rules
- `assignee` must be 2–50 characters

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Assignee too short | `"Assignee must be between 2 and 50 characters"` |

---

## Comments

### Endpoint: Add Comment
**Method:** `POST`  
**Path:** `/tickets/:ticketId/comments`  
**Purpose:** Add a comment to an existing ticket.

#### Request
```json
{
  "content": "Reproduced on Safari 17. The issue is in the form validation handler.",
  "author": "Alice Chen"
}
```

#### Response
```json
{
  "status": "success",
  "message": "Comment added successfully",
  "data": {
    "comment": {
      "id": "668f3c8cdc643f2637c4aba2",
      "ticketId": "668f3c8cdc643f2637c4aba1",
      "content": "Reproduced on Safari 17. The issue is in the form validation handler.",
      "author": "Alice Chen",
      "timestamp": "2026-07-25T11:00:00.000Z"
    }
  }
}
```


#### Validation Rules
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| content | Yes | string | 1–1000 characters |
| author | Yes | string | 2–50 characters |

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Missing content | `"Comment content is required"` |
| 400 | Author too short | `"Author must be between 2 and 50 characters"` |
| 400 | Content too long | `"Comment must be between 1 and 1000 characters"` |
| 400 | Invalid ticket ID | `"Invalid ticket ID"` |
| 404 | Ticket not found | `"Ticket not found"` |

---

### Endpoint: List Comments
**Method:** `GET`  
**Path:** `/tickets/:ticketId/comments`  
**Purpose:** Retrieve all comments for a ticket.

#### Request
Path parameter: `ticketId` (MongoDB ObjectId)  
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page (max 100) |

#### Response
```json
{
  "status": "success",
  "data": {
    "comments": [
      {
        "id": "668f3c8cdc643f2637c4aba2",
        "ticketId": "668f3c8cdc643f2637c4aba1",
        "content": "Reproduced on Safari 17.",
        "author": "Alice Chen",
        "timestamp": "2026-07-25T11:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 1,
      "currentPage": 1,
      "pageSize": 50,
      "totalPages": 1
    }
  }
}
```


#### Validation Rules
- `ticketId` must be a valid MongoDB ObjectId

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid ticket ID | `"Invalid ticket ID"` |
| 404 | Ticket not found | `"Ticket not found"` |

---

### Endpoint: Get Comment by ID
**Method:** `GET`  
**Path:** `/comments/:id`  
**Purpose:** Retrieve a specific comment.

#### Request
Path parameter: `id` (MongoDB ObjectId)

#### Response
```json
{
  "status": "success",
  "data": {
    "comment": {
      "id": "668f3c8cdc643f2637c4aba2",
      "ticketId": "668f3c8cdc643f2637c4aba1",
      "content": "Reproduced on Safari 17.",
      "author": "Alice Chen",
      "timestamp": "2026-07-25T11:00:00.000Z"
    }
  }
}
```

#### Validation Rules
- `id` must be a valid MongoDB ObjectId

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid comment ID | `"Invalid comment ID"` |
| 404 | Comment not found | `"Comment not found"` |

---

### Endpoint: Update Comment
**Method:** `PUT`  
**Path:** `/comments/:id`  
**Purpose:** Update a comment's content.


#### Request
```json
{
  "content": "Updated: Reproduced on Safari 17 and Firefox 120."
}
```

#### Response
```json
{
  "status": "success",
  "message": "Comment updated successfully",
  "data": {
    "comment": {
      "id": "668f3c8cdc643f2637c4aba2",
      "ticketId": "668f3c8cdc643f2637c4aba1",
      "content": "Updated: Reproduced on Safari 17 and Firefox 120.",
      "author": "Alice Chen",
      "timestamp": "2026-07-25T11:00:00.000Z"
    }
  }
}
```

#### Validation Rules
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| content | Yes | string | 1–1000 characters |

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Missing content | `"Comment content is required"` |
| 400 | Invalid comment ID | `"Invalid comment ID"` |
| 404 | Comment not found | `"Comment not found"` |

---

### Endpoint: Delete Comment
**Method:** `DELETE`  
**Path:** `/comments/:id`  
**Purpose:** Delete a comment.

#### Request
Path parameter: `id` (MongoDB ObjectId)

#### Response
```json
{
  "status": "success",
  "message": "Comment deleted successfully"
}
```


#### Validation Rules
- `id` must be a valid MongoDB ObjectId

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid comment ID | `"Invalid comment ID"` |
| 404 | Comment not found | `"Comment not found"` |

---

### Endpoint: Get Recent Comments
**Method:** `GET`  
**Path:** `/comments/recent`  
**Purpose:** Retrieve recent comments across all tickets.

#### Request
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| limit | number | 10 | Number of comments to return |

#### Response
```json
{
  "status": "success",
  "data": {
    "comments": [
      {
        "id": "668f3c8cdc643f2637c4aba2",
        "ticketId": "668f3c8cdc643f2637c4aba1",
        "content": "Reproduced on Safari 17.",
        "author": "Alice Chen",
        "timestamp": "2026-07-25T11:00:00.000Z"
      }
    ]
  }
}
```

#### Validation Rules
- `limit` must be between 1 and 100

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid limit | `"Limit must be between 1 and 100"` |

---


## Dashboard

### Endpoint: Get Dashboard Stats
**Method:** `GET`  
**Path:** `/dashboard/stats`  
**Purpose:** Retrieve comprehensive dashboard statistics including KPI metrics.

#### Request
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| assignee | string | — | Optional: filter stats by assignee |

#### Response
```json
{
  "status": "success",
  "data": {
    "totalTickets": 156,
    "openTickets": 45,
    "inProgressTickets": 32,
    "resolvedTickets": 67,
    "closedTickets": 12,
    "cancelledTickets": 0,
    "priorityBreakdown": {
      "critical": 8,
      "high": 23,
      "medium": 89,
      "low": 36
    },
    "avgResolutionTimeHours": 24.5
  }
}
```

#### Validation Rules
- `assignee` must be 2–50 characters if provided

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid assignee | `"Assignee must be between 2 and 50 characters"` |

---

### Endpoint: Get KPI Metrics
**Method:** `GET`  
**Path:** `/dashboard/kpi`  
**Purpose:** Retrieve lightweight KPI metrics only.

#### Request
No parameters required.


#### Response
```json
{
  "status": "success",
  "data": {
    "totalTickets": 156,
    "openTickets": 45,
    "inProgressTickets": 32,
    "resolvedTickets": 67,
    "closedTickets": 12
  }
}
```

#### Validation Rules
None.

#### Error Responses
None expected for this endpoint.

---

### Endpoint: Get My Tickets
**Method:** `GET`  
**Path:** `/dashboard/my-tickets`  
**Purpose:** Retrieve tickets assigned to current user with statistics.

#### Request
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| assignee | string | — | Required: assignee name |
| status | enum | — | Optional status filter |
| limit | number | 20 | Number of tickets to return |

#### Response
```json
{
  "status": "success",
  "data": {
    "tickets": [...],
    "stats": {
      "total": 15,
      "open": 5,
      "inProgress": 8,
      "resolved": 2
    }
  }
}
```

#### Validation Rules
- `assignee` is required and must be 2–50 characters
- `limit` must be between 1 and 50

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Missing assignee | `"Assignee must be between 2 and 50 characters"` |

---


### Endpoint: Get Recent Activity
**Method:** `GET`  
**Path:** `/dashboard/recent-activity`  
**Purpose:** Retrieve recent activity including updated tickets and new comments.

#### Request
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| limit | number | 10 | Number of items to return |

#### Response
```json
{
  "status": "success",
  "data": {
    "recentActivity": [
      {
        "type": "ticket_updated",
        "ticket": {...},
        "timestamp": "2026-07-25T11:00:00.000Z"
      },
      {
        "type": "comment_added",
        "comment": {...},
        "timestamp": "2026-07-25T10:30:00.000Z"
      }
    ]
  }
}
```

#### Validation Rules
- `limit` must be between 1 and 50

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid limit | `"Limit must be between 1 and 50"` |

---

### Endpoint: Get Trends
**Method:** `GET`  
**Path:** `/dashboard/trends`  
**Purpose:** Retrieve ticket trends and analytics over time.

#### Request
Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| days | number | 30 | Number of days to analyze (max 365) |


#### Response
```json
{
  "status": "success",
  "data": {
    "trends": {
      "ticketsCreated": 45,
      "ticketsResolved": 38,
      "averageResolutionDays": 2.5,
      "byPriority": {...},
      "byStatus": {...}
    }
  }
}
```

#### Validation Rules
- `days` must be between 1 and 365

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid days | `"Days must be between 1 and 365"` |

---

### Endpoint: Get User Dashboard
**Method:** `GET`  
**Path:** `/dashboard/user/:userId`  
**Purpose:** Retrieve user-specific dashboard with assigned tickets and metrics.

#### Request
Path parameter: `userId` (1–100 characters, alphanumeric with spaces, dots, @, hyphens)

#### Response
```json
{
  "status": "success",
  "data": {
    "recentActivity": [],
    "assignedTickets": 12,
    "resolvedTickets": 8,
    "avgCompletionTime": 18.5
  }
}
```

#### Validation Rules
- `userId` must be 1–100 characters
- `userId` must match pattern: alphanumeric, spaces, dots, @, hyphens

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid userId | `"userId contains invalid characters"` |

---


### Endpoint: Get Team Dashboard
**Method:** `GET`  
**Path:** `/dashboard/team/:teamId`  
**Purpose:** Retrieve team-specific dashboard with member breakdown and metrics.

#### Request
Path parameter: `teamId` (1–100 characters, alphanumeric with spaces, dots, @, hyphens)

#### Response
```json
{
  "status": "success",
  "data": {
    "teamStats": {
      "totalTickets": 50,
      "openTickets": 15,
      "memberBreakdown": {...}
    }
  }
}
```

#### Validation Rules
- `teamId` must be 1–100 characters
- `teamId` must match pattern: alphanumeric, spaces, dots, @, hyphens

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Invalid teamId | `"teamId contains invalid characters"` |

---

## Health Checks

### Endpoint: Health Check
**Method:** `GET`  
**Path:** `/health`  
**Purpose:** Verify the API is running.

#### Request
No parameters required.

#### Response
```json
{
  "status": "OK",
  "message": "Ticket Management System API is running",
  "timestamp": "2026-07-25T10:00:00.000Z",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "name": "ticket_management",
    "collections": 2
  }
}
```


#### Validation Rules
None.

#### Error Responses
None expected for this endpoint.

---

### Endpoint: Database Health
**Method:** `GET`  
**Path:** `/health/database`  
**Purpose:** Verify database connectivity with detailed status.

#### Request
No parameters required.

#### Response
```json
{
  "database": {
    "connected": true,
    "readyState": 1,
    "host": "localhost",
    "port": 27017,
    "name": "ticket_management",
    "collections": ["tickets", "comments"]
  },
  "timestamp": "2026-07-25T10:00:00.000Z"
}
```

#### Validation Rules
None.

#### Error Responses
| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 503 | Database not connected | Returns status with `connected: false` |

---

## API Root

### Endpoint: API Documentation
**Method:** `GET`  
**Path:** `/api`  
**Purpose:** Retrieve API information and available endpoints.

#### Request
No parameters required.

#### Response
```json
{
  "status": "success",
  "message": "Ticket Management System API",
  "version": "1.0.0",
  "documentation": {
    "endpoints": {
      "tickets": "/api/tickets",
      "comments": "/api/comments",
      "dashboard": "/api/dashboard",
      "health": "/health"
    },
    "features": [
      "Create, read, update, delete tickets",
      "Add and manage comments on tickets",
      "Status state machine for ticket workflow",
      "Dashboard with KPI metrics and analytics",
      "Search and filter tickets",
      "Pagination support",
      "Data validation and error handling"
    ]
  },
  "timestamp": "2026-07-25T10:00:00.000Z"
}
```

#### Validation Rules
None.

#### Error Responses
None expected for this endpoint.
