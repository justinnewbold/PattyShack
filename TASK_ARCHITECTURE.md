# Task Management System - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────────────────┐    │
│  │   Web Frontend   │      │    Mobile Application        │    │
│  │  (React.js)      │      │   (React Native)             │    │
│  ├──────────────────┤      ├──────────────────────────────┤    │
│  │ - Tasks.jsx      │      │ - TasksScreen.js             │    │
│  │ - Task cards     │      │ - TaskDetailScreen.js        │    │
│  │ - Create modal   │      │ - Photo upload               │    │
│  │ - Filters        │      │ - Offline support (planned)  │    │
│  │ - Status badges  │      │ - Push notifications (ready) │    │
│  └──────────────────┘      └──────────────────────────────┘    │
│         │                              │                        │
│         └──────────────────┬───────────┘                        │
│                            │                                     │
│                    HTTP/REST API Calls                          │
│                       (JSON format)                             │
└────────────────────────────────────────────┬────────────────────┘
                                             │
                        ┌────────────────────▼──────────────────┐
                        │     API GATEWAY / ROUTING             │
                        │   Express.js Server (Node.js)         │
                        │     Base: /api/v1/tasks               │
                        └─────────────────┬──────────────────────┘
                                          │
        ┌─────────────────────────────────┼──────────────────────┐
        │                                 │                      │
        ▼                                 ▼                      ▼
┌─────────────────┐           ┌──────────────────────┐   ┌──────────────┐
│   Authentication│           │  Route Handlers      │   │  Middleware  │
│   (JWT/OAuth)   │           │  (tasks.js)          │   │  - Logger    │
└─────────────────┘           │                      │   │  - Validator │
                              │  - GET /tasks        │   │  - Error     │
                              │  - GET /tasks/:id    │   │    Handler   │
                              │  - POST /tasks       │   └──────────────┘
                              │  - PUT /tasks/:id    │
                              │  - POST /:id/complete│
                              │  - DELETE /tasks/:id │
                              └──────────────┬───────┘
                                            │
                        ┌───────────────────▼──────────────────┐
                        │   SERVICE LAYER                      │
                        │   TaskService.js                     │
                        ├──────────────────────────────────────┤
                        │ Business Logic Methods:              │
                        │ - createTask()                       │
                        │ - getTasks()                         │
                        │ - getTaskById()                      │
                        │ - updateTask()                       │
                        │ - completeTask()                     │
                        │ - deleteTask()                       │
                        │ - getSummary()                       │
                        │ - getOverdueTasks()                  │
                        │ - getTasksByHierarchy()              │
                        │ - createNextRecurrence()             │
                        │ - calculateNextDueDate()             │
                        │ - formatTask()                       │
                        └────────────────┬─────────────────────┘
                                         │
                        ┌────────────────▼──────────────────┐
                        │   DATA VALIDATION                │
                        │   validators.js                  │
                        ├──────────────────────────────────┤
                        │ - isValidTaskType()              │
                        │ - isValidTaskStatus()            │
                        │ - isValidDate()                  │
                        │ - hasRequiredFields()            │
                        │ - sanitizeString()               │
                        └────────────────┬─────────────────┘
                                         │
                        ┌────────────────▼──────────────────┐
                        │   DATABASE LAYER                 │
                        │   PostgreSQL Connection Pool     │
                        ├──────────────────────────────────┤
                        │ - Prepared Statements            │
                        │ - Parameterized Queries          │
                        │ - Connection Pooling             │
                        │ - Query Execution                │
                        └────────────────┬─────────────────┘
                                         │
                        ┌────────────────▼──────────────────┐
                        │   POSTGRESQL DATABASE            │
                        ├──────────────────────────────────┤
                        │  TABLES:                         │
                        │  - tasks                         │
                        │  - users (FK)                    │
                        │  - locations (FK)               │
                        │  - temperature_logs              │
                        │  - schedules                     │
                        │  - inventory_items               │
                        │  - audit_logs                    │
                        └──────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Task List Retrieval Flow

```
Frontend/Mobile                    Backend                     Database
      │                              │                            │
      │  GET /tasks?status=pending   │                            │
      ├─────────────────────────────►│                            │
      │                              │ TaskService.getTasks()     │
      │                              ├──┐                         │
      │                              │  │ Parse filters           │
      │                              │  │ Validate input          │
      │                              │  │ Build SQL query         │
      │                              │◄─┘                         │
      │                              │                            │
      │                              │  SELECT * FROM tasks       │
      │                              │    WHERE status = $1       │
      │                              │    ORDER BY due_date, pri  │
      │                              ├───────────────────────────►│
      │                              │                            │
      │                              │◄─── rows []               │
      │                              │                            │
      │                              │ formatTask() x N           │
      │                              │ (Convert snake_case        │
      │                              │  Parse JSON fields)        │
      │                              │                            │
      │  {success, data: [tasks]}    │                            │
      │◄─────────────────────────────┤                            │
      │                              │                            │
```

### 2. Task Creation Flow

```
Frontend/Mobile                    Backend                     Database
      │                              │                            │
      │  POST /tasks                 │                            │
      │  {title, type, locationId}   │                            │
      ├─────────────────────────────►│                            │
      │                              │ validators.hasRequired()   │
      │                              │ validators.isValidType()   │
      │                              │ validators.sanitize()      │
      │                              │                            │
      │                              │ TaskService.createTask()   │
      │                              │  - Generate ID             │
      │                              │  - Prepare data            │
      │                              │  - Convert JSON fields     │
      │                              │                            │
      │                              │  INSERT INTO tasks         │
      │                              ├───────────────────────────►│
      │                              │                            │
      │                              │◄─── RETURNING * (row)     │
      │                              │                            │
      │                              │ formatTask(row)            │
      │                              │                            │
      │  {success, data: task}       │                            │
      │◄─────────────────────────────┤                            │
      │  (201 Created)               │                            │
```

### 3. Task Completion Flow (with Recurring)

```
Frontend/Mobile                    Backend                     Database
      │                              │                            │
      │  POST /tasks/:id/complete    │                            │
      │  {userId, notes}             │                            │
      ├─────────────────────────────►│                            │
      │                              │ TaskService.completeTask() │
      │                              │                            │
      │                              │ UPDATE tasks SET status... │
      │                              ├───────────────────────────►│
      │                              │                            │
      │                              │◄─── RETURNING * (row)     │
      │                              │                            │
      │                              │ Check: recurring == true?  │
      │                              │                            │
      │                              │ IF recurring:              │
      │                              │   createNextRecurrence()   │
      │                              │   - calcNextDueDate()      │
      │                              │   - INSERT new task        │
      │                              ├───────────────────────────►│
      │                              │                            │
      │                              │◄─── inserted (new task)   │
      │                              │                            │
      │  {success, data: task}       │                            │
      │◄─────────────────────────────┤                            │
      │  (201/200)                   │                            │
      │                              │                            │
```

## Component Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        TASK MODEL                           │
│  (Task.js - JavaScript Class)                              │
├─────────────────────────────────────────────────────────────┤
│  Properties:                                                │
│  - id, title, description, type, category                  │
│  - locationId, assignedTo, priority, status                │
│  - dueDate, completedAt, completedBy                       │
│  - recurring, recurrencePattern, recurrenceInterval         │
│  - requiresPhotoVerification, photoUrls                     │
│  - requiresSignature, signatureUrl                          │
│  - checklistItems, notes, correctiveActions, metadata       │
│                                                              │
│  Methods:                                                   │
│  - isOverdue()                                              │
│  - complete(userId, photos, signature)                      │
└────────┬────────────────────────────────────────────────────┘
         │ Used by
         │
┌────────▼────────────────────────────────────────────────────┐
│             TASK SERVICE (Business Logic)                   │
│  (TaskService.js)                                           │
├─────────────────────────────────────────────────────────────┤
│  CRUD Operations:                                           │
│  ├─ createTask() → Database INSERT                          │
│  ├─ getTasks() → Database SELECT with filters               │
│  ├─ getTaskById() → Database SELECT by ID                   │
│  ├─ updateTask() → Database UPDATE                          │
│  ├─ deleteTask() → Database DELETE                          │
│  └─ completeTask() → UPDATE + createNextRecurrence()        │
│                                                              │
│  Analytics:                                                 │
│  ├─ getSummary() → Task statistics                          │
│  ├─ getOverdueTasks() → Overdue query                       │
│  └─ getTasksByHierarchy() → Org chart query                 │
│                                                              │
│  Recurring Tasks:                                           │
│  ├─ createNextRecurrence() → Creates new instance           │
│  └─ calculateNextDueDate() → Date calculation               │
│                                                              │
│  Formatting:                                                │
│  └─ formatTask() → Row → API response format                │
└────────┬────────────────────────────────────────────────────┘
         │ Uses
         │
    ┌────┼────┐
    │    │    │
    ▼    ▼    ▼
 ┌──┐ ┌──┐ ┌──────────────┐
 │V │ │V │ │  Database    │
 │a │ │a │ │  Pool        │
 │l │ │l │ │ (PostgreSQL) │
 │i │ │i │ │              │
 │d │ │d │ │  Tables:     │
 │a │ │a │ │  - tasks     │
 │t │ │t │ │  - users     │
 │o │ │o │ │  - locations │
 │r │ │r │ │  - schedules │
 │s │ │s │ │  - inventory │
 │  │ │  │ │  - invoices  │
 └──┘ └──┘ └──────────────┘
```

## Frontend Integration Flow

```
┌──────────────────────────────────────────────────────────────┐
│           WEB FRONTEND (React)                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Tasks.jsx Component                                         │
│  ├─ State: tasks[], loading, filters, newTask               │
│  ├─ useEffect(() => fetchTasks(), [filters])                │
│  ├─ handleCreateTask() ──────────┐                          │
│  ├─ handleCompleteTask() ────────┤                          │
│  ├─ handleDeleteTask() ──────────┤                          │
│  │                               │                          │
│  ├─ Renders:                     │                          │
│  │  - Task list (grid)           │                          │
│  │  - Filter panel               │                          │
│  │  - Task cards                 │                          │
│  │  - Create modal               │                          │
│  │  - Status/Priority badges     │                          │
│  │                               │                          │
│  └───────────┬───────────────────┘                          │
│              │                                               │
│  tasksService (API Client)                                  │
│  ├─ getTasks(filters)                                       │
│  ├─ getTaskById(id)                                         │
│  ├─ createTask(data)                                        │
│  ├─ updateTask(id, data)                                    │
│  ├─ completeTask(id)    ← USES PATCH (inconsistency!)       │
│  └─ deleteTask(id)                                          │
│      │                                                       │
│      └──► axios instance                                    │
│           ├─ Base URL: /api/v1                              │
│           ├─ Headers: { Authorization: token }              │
│           └─ interceptors: error handling                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Mobile Integration Flow

```
┌──────────────────────────────────────────────────────────────┐
│         MOBILE FRONTEND (React Native)                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Navigation Stack:                                           │
│  TasksScreen                                                 │
│  ├─ FlatList of tasks                                        │
│  ├─ Pull-to-refresh                                          │
│  ├─ Search bar                                               │
│  ├─ Status filter chips                                      │
│  └─ onPress → TaskDetailScreen                              │
│      │                                                       │
│      └─ TaskDetailScreen                                     │
│         ├─ Task details display                              │
│         ├─ Checklist items                                   │
│         ├─ Complete button                                   │
│         └─ Back navigation                                   │
│                                                               │
│  tasksService (API Client)                                  │
│  ├─ getTasks(params)                                         │
│  ├─ getTask(id)                                              │
│  ├─ createTask(data)                                         │
│  ├─ updateTask(id, data)                                     │
│  ├─ deleteTask(id)                                           │
│  ├─ completeTask(id, completionData)                         │
│  └─ uploadPhoto(id, photoUri)  ← FormData upload            │
│      │                                                       │
│      └──► axios instance                                    │
│           ├─ Base URL: from config/api.js                   │
│           ├─ Headers: { Authorization: token }              │
│           └─ Error handling                                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────────────────┐
│       LOCATIONS         │
├─────────────────────────┤
│ id (PK)                 │
│ name                    │
│ code                    │
│ brand_id                │
│ district_id             │
│ region_id               │
│ manager_id (→ users)    │
└────┬──────────────────┬─┘
     │                  │
     │ location_id (FK) │
     │                  │
┌────▼────────┐   ┌────▼──────────────┐
│   TASKS     │   │   TEMPERATURE     │
├─────────────┤   │   LOGS            │
│ id (PK)     │   ├───────────────────┤
│ title       │   │ id (PK)           │
│ description │   │ location_id (FK)  │
│ type        │   │ equipment_id      │
│ category    │   │ temperature       │
│ status      │   │ recorded_by (FK)  │
│ priority    │   │ recorded_at       │
│ due_date    │   └───────────────────┘
│ recurring   │
│ checklist   │
│ items (JSON)│
│ photo_urls  │   ┌──────────────────┐
│ (JSON)      │   │  USERS           │
│ metadata    │   ├──────────────────┤
│ (JSON)      │   │ id (PK)          │
└─────────────┘   │ username         │
     │            │ role             │
     │ assigned   │ location_id (FK) │
     │ _to (FK)   │ email            │
     │            │ password         │
┌────┴─────────┐  │ active           │
│              │  └──────────────────┘
└──────────────┘
 completed_by
   (FK)

Foreign Keys with Indexes:
├─ location_id      → locations(id) [idx_tasks_location]
├─ assigned_to      → users(id)     [idx_tasks_assigned_to]
├─ completed_by     → users(id)
└─ Cascade/Set Null on delete
```

## API Request/Response Cycle

```
CLIENT REQUEST                  SERVER PROCESSING          DATABASE
────────────────────────────────────────────────────────────────────

GET /api/v1/tasks?status=pending
│                                   │
├──────────────────────────────────►│ Authentication middleware
│                                   │ JWT verification
│                                   │
│                                   │ Route handler: tasks.js
│                                   │ - Extract query params
│                                   │ - Create filters object
│                                   │
│                                   │ TaskService.getTasks()
│                                   │ - Validate filter values
│                                   │ - Build SQL query
│                                   │ - Execute query
│                                   │
│                                   ├─ SELECT * FROM tasks
│                                   │   WHERE status = 'pending'
│                                   │
│                                   │◄─ rows: []
│                                   │
│                                   │ Map formatTask() over rows
│                                   │ Build response object:
│                                   │ {
│                                   │   success: true,
│                                   │   data: {
│                                   │     tasks: [...],
│                                   │     summary: {...},
│                                   │     pagination: {...}
│                                   │   }
│                                   │ }
│                                   │
{                                   │
  success: true,                    │
  data: {                           │
    tasks: [task_objects],◄────────►│
    summary: {count_objects},       │
    pagination: {page_info}         │
  }                                 │
}                                   │
────────────────────────────────────────────────────────────────────
```

## Query Execution Path

```
HTTP Request
    ↓
Express Router (tasks.js)
    ├─ Method validation (GET, POST, PUT, DELETE)
    ├─ Route matching (/tasks, /tasks/:id, /tasks/:id/complete)
    └─ Request handler function
        ↓
    Middleware
    ├─ Authentication (JWT verification)
    ├─ Authorization (role-based access)
    ├─ Input validation (validators.js)
    └─ Error handling
        ↓
    TaskService.<method>()
    ├─ Business logic
    ├─ Data preparation
    └─ Database interaction
        ↓
    Pool.query(sql, params)
    ├─ Prepared statement
    ├─ Parameter binding (prevents SQL injection)
    └─ Query execution
        ↓
    PostgreSQL
    ├─ Query parsing
    ├─ Index lookup
    ├─ Data retrieval/modification
    └─ Return results
        ↓
    Pool returns rows
    ├─ Rows array
    └─ Metadata
        ↓
    formatTask(rows)
    ├─ Convert snake_case → camelCase
    ├─ Parse JSON fields
    └─ Return formatted objects
        ↓
    HTTP Response Builder
    ├─ Status code (200, 201, 400, 404, 500)
    ├─ Response body
    │   {
    │     success: boolean,
    │     data: {...} OR error: string,
    │     pagination: {...} (if list)
    │   }
    └─ Content-Type: application/json
        ↓
    HTTP Response sent to Client
```

---

## Summary

The task management system uses a **three-tier architecture**:

1. **Presentation Tier** (Frontend/Mobile)
   - React.js web interface
   - React Native mobile app
   - Service-based API calls

2. **Application Tier** (Backend)
   - Express.js REST API
   - TaskService with business logic
   - Validators for data integrity
   - Route handlers and middleware

3. **Data Tier** (PostgreSQL)
   - Tasks table with 20+ fields
   - Supporting tables (users, locations)
   - Indexes for performance
   - Foreign key constraints

**Key Design Patterns**:
- Service pattern for business logic separation
- Factory pattern for task formatting
- Async/await for database operations
- Prepared statements for SQL injection prevention
- Standardized response format across all endpoints
