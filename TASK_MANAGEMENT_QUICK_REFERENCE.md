# Task Management - Quick Reference Guide

## File Structure Map

```
/home/user/PattyShack/
├── Backend
│   ├── src/
│   │   ├── models/Task.js                           # Data model class
│   │   ├── services/TaskService.js                  # Business logic
│   │   ├── routes/tasks.js                          # API endpoints
│   │   ├── database/migrations/001_initial_schema.sql  # DB schema
│   │   └── utils/validators.js                      # Input validation
│   └── tests/
│       └── integration/tasks.test.js                # Integration tests
│
├── Frontend (Web)
│   └── frontend/src/
│       ├── pages/Tasks.jsx                          # Main component
│       └── services/tasksService.js                 # API client
│
├── Mobile
│   └── mobile/src/
│       ├── screens/Tasks/TasksScreen.js             # List screen
│       ├── screens/Tasks/TaskDetailScreen.js        # Detail screen
│       └── services/tasksService.js                 # API client
│
└── Documentation
    ├── TASK_MANAGEMENT_OVERVIEW.md                  # Full documentation
    └── TASK_MANAGEMENT_QUICK_REFERENCE.md           # This file
```

## API Quick Reference

### Base URL
```
/api/v1/tasks
```

### Endpoint Summary

| Method | Endpoint | Purpose | Status Code |
|--------|----------|---------|-------------|
| GET | /tasks | List all tasks with filters | 200 |
| GET | /tasks/:id | Get single task | 200 |
| POST | /tasks | Create new task | 201 |
| PUT | /tasks/:id | Update task | 200 |
| POST | /tasks/:id/complete | Mark complete | 200 |
| DELETE | /tasks/:id | Delete task | 200 |

## Data Model

### Required Fields (on creation)
- `title` (string, max 500 chars)
- `type` (enum: 'checklist', 'line_check', 'food_safety', 'opening', 'closing', 'custom')
- `locationId` (string, FK to locations)

### Key Optional Fields
- `description` (text)
- `assignedTo` (string, FK to users)
- `priority` (enum: 'low', 'medium', 'high', 'critical')
- `dueDate` (timestamp)
- `recurring` (boolean)
- `recurrencePattern` (enum: 'daily', 'weekly', 'monthly')
- `checklistItems` (array of objects/strings, stored as JSONB)
- `requiresPhotoVerification` (boolean)
- `photoUrls` (array of URLs, stored as JSONB)
- `requiresSignature` (boolean)
- `notes` (text)
- `metadata` (object, extensible, stored as JSONB)

### Status Values
- `pending` (default)
- `in_progress`
- `completed`
- `failed`
- `overdue`

## Database Queries

### Key Indexes
```
- idx_tasks_location (for filtering by location)
- idx_tasks_status (for status filtering)
- idx_tasks_assigned_to (for user-based queries)
- idx_tasks_due_date (for date range queries)
- idx_tasks_type (for task type filtering)
- idx_tasks_recurring (for recurring task queries)
```

### Critical Foreign Keys
```
location_id → locations(id) ON DELETE CASCADE
assigned_to → users(id) ON DELETE SET NULL
completed_by → users(id) ON DELETE SET NULL
```

## Common Filtering Patterns

### By Location
```javascript
// Frontend
tasksService.getTasks({ locationId: 'loc-123' })

// Backend
filters.locationId = 'loc-123'
// SQL: WHERE location_id = $1
```

### By Status
```javascript
tasksService.getTasks({ status: 'pending' })
// SQL: WHERE status = $1
```

### By Assigned User
```javascript
tasksService.getTasks({ assignedTo: 'user-456' })
// SQL: WHERE assigned_to = $1
```

### By Date Range
```javascript
// Filter by specific date
tasksService.getTasks({ dueDate: '2025-12-20' })
// SQL: WHERE DATE(due_date) = DATE($1)
```

### Combined Filters
```javascript
tasksService.getTasks({
  locationId: 'loc-123',
  status: 'pending',
  priority: 'high'
})
```

## Task Completion Flow

1. **Frontend/Mobile sends**: `POST /tasks/:id/complete` with `userId`
2. **Backend processes**:
   - Updates status to 'completed'
   - Records completionAt timestamp
   - Records completedBy user ID
   - If recurring: creates next occurrence
3. **Response**: Updated task object

## Recurring Task Auto-Creation

When a recurring task is completed:
1. Service checks `recurring` flag
2. Calls `createNextRecurrence(task)`
3. Calculates new due date based on `recurrencePattern`
4. Creates new task with same properties but future due date
5. Both parent and child have independent records

## Key Service Methods

### TaskService Methods
```javascript
// Create
await TaskService.createTask(taskData)

// Read
await TaskService.getTasks(filters)
await TaskService.getTaskById(id)
await TaskService.getTasksByHierarchy(level, id)

// Update
await TaskService.updateTask(id, updates)
await TaskService.completeTask(id, completionData)

// Delete
await TaskService.deleteTask(id)

// Analytics
await TaskService.getSummary(filters)
await TaskService.getOverdueTasks()

// Recurring
await TaskService.createNextRecurrence(task)
TaskService.calculateNextDueDate(date, pattern)
```

## Response Format

### Success List Response
```json
{
  "success": true,
  "data": {
    "tasks": [{...}, {...}],
    "summary": {
      "total": 10,
      "byStatus": {"pending": 5, "completed": 5},
      "byType": {"checklist": 3, "line_check": 7},
      "overdue": 2
    },
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing the issue"
}
```

## Validation Functions

Located in `/src/utils/validators.js`:

```javascript
validators.isValidTaskType(type)        // Validates task type enum
validators.isValidTaskStatus(status)    // Validates status enum
validators.isValidDate(dateString)      // Validates ISO date
validators.hasRequiredFields(data, arr) // Checks required fields
validators.sanitizeString(str)          // Removes HTML tags
```

## Frontend Component Structure

### Tasks.jsx State
- `tasks[]` - Current task list
- `loading` - Loading state
- `error` - Error message
- `showCreateModal` - Modal visibility
- `filters` - Current filter values
- `newTask` - Form data

### Key Functions
- `fetchTasks()` - Load tasks with filters
- `handleCreateTask()` - Create new task
- `handleCompleteTask()` - Mark task complete
- `handleDeleteTask()` - Delete task with confirmation

## Mobile Integration

### TasksScreen
- Displays task list with FlatList
- Pull-to-refresh support
- Status filter chips
- Navigation to detail screen

### TaskDetailScreen
- Shows full task details
- Displays checklist items
- Complete button
- Back navigation

## Development Notes

### ID Generation
Tasks use timestamp-based IDs: `task-${Date.now()}`
Example: `task-1702551000000`

### Date Handling
- Timestamps use PostgreSQL TIMESTAMP type
- Frontend/Mobile send ISO 8601 format
- API returns ISO 8601 format
- Service converts to JavaScript Date objects

### JSON Fields
Three fields use JSONB for flexibility:
- `checklist_items` - Array of checklist items
- `photo_urls` - Array of photo URLs
- `metadata` - Custom extensible object

### Transactions
Current implementation: No explicit transaction wrapping
Note: Recurring task creation happens after completion without transaction

## Performance Considerations

### Current Indexes
- All high-cardinality fields indexed
- Composite indexes: None currently (consider for multi-field filters)
- Foreign keys indexed by default

### Query Optimization
- Default ordering: `due_date ASC, priority DESC`
- Pagination default: 20 items per page
- No full-text search implemented

## Known Limitations

1. **Frontend/Mobile inconsistency**
   - Frontend service uses PATCH for complete
   - Routes defined as POST
   - Fix needed: Standardize to POST

2. **Offline Support**
   - Mobile app prepared with photo upload
   - No actual offline service worker yet

3. **Recurring Task Interval**
   - `recurrenceInterval` field defined but not fully utilized
   - Current: Only daily/weekly/monthly patterns used

4. **Notifications**
   - Infrastructure ready in config
   - No actual notification endpoints implemented

5. **Search**
   - Basic filter only, no full-text search
   - No global search across all task fields

## Extension Points for Phase 1

### 1. Task Dependencies
Add new table:
```sql
task_dependencies (
  id, parent_task_id, child_task_id, 
  dependency_type, created_at
)
```

### 2. Task Templates
Add new table:
```sql
task_templates (
  id, name, description, type, checklist_items,
  requires_photo, requires_signature, metadata
)
```

### 3. Task History/Audit
Leverage existing audit_logs table (migration 002)
Add task-specific event tracking

### 4. Bulk Operations
Extend routes:
- `POST /tasks/bulk` (create multiple)
- `PATCH /tasks/bulk` (update multiple)
- `POST /tasks/complete-multiple` (complete batch)

### 5. Advanced Filtering
Add to TaskService.getTasks():
- Date range queries
- Multi-status filtering
- Full-text search on title/description
- Due soon/overdue smart filters

### 6. Analytics/Reporting
New service methods:
- `getCompletionRate(locationId, dateRange)`
- `getTasksByUser(userId, dateRange)`
- `getAverageCompletionTime(type)`
- `getOverdueTasksTrend()`

## Testing

### Running Tests
```bash
npm test -- tests/integration/tasks.test.js
npm test -- tests/unit/taskService.test.js
```

### Test Database
Uses separate test database with fixtures
Resets before each test with `clearTestDatabase()`

## Environment Configuration

### Key Settings (src/config/app.js)
- `apiPrefix: '/api/v1'`
- `upload.maxFileSize: 10MB`
- `upload.allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']`

---

**Last Updated**: December 2025
**API Version**: v1
**Status**: Production Ready
