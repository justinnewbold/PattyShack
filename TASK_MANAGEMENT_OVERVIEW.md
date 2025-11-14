# PattyShack Task Management System - Comprehensive Overview

## Executive Summary
The PattyShack task management system is fully implemented across backend (Node.js/Express), frontend (React), and mobile (React Native) platforms. It supports digital checklists, recurring tasks, multi-location task management, and food safety compliance features.

---

## 1. DATABASE MODELS & SCHEMA

### Location: `/home/user/PattyShack/src/database/migrations/001_initial_schema.sql`

#### Tasks Table Structure
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) -- 'checklist', 'line_check', 'food_safety', 'opening', 'closing', 'custom'
  category VARCHAR(100),
  location_id VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'medium' -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) DEFAULT 'pending' -- 'pending', 'in_progress', 'completed', 'failed', 'overdue'
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  completed_by VARCHAR(255),
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'custom'
  recurrence_interval INTEGER,
  requires_photo_verification BOOLEAN DEFAULT false,
  photo_urls JSONB DEFAULT '[]',
  requires_signature BOOLEAN DEFAULT false,
  signature_url TEXT,
  checklist_items JSONB DEFAULT '[]',
  notes TEXT,
  corrective_actions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);
```

#### Indexes
- `idx_tasks_location` - For filtering by location
- `idx_tasks_assigned_to` - For assignee-based queries
- `idx_tasks_status` - For status filtering
- `idx_tasks_type` - For task type filtering
- `idx_tasks_due_date` - For due date queries
- `idx_tasks_recurring` - For recurring task queries

#### Key Relationships
- **location_id** → Locations table (cascade delete)
- **assigned_to** → Users table (set null on delete)
- **completed_by** → Users table (set null on delete)

---

## 2. BACKEND - API ROUTES & ENDPOINTS

### Location: `/home/user/PattyShack/src/routes/tasks.js`

#### Core Endpoints

##### GET /tasks
- **Description**: List tasks with filters and pagination
- **Parameters**:
  - `page` (query, default: 1) - Page number
  - `perPage` (query, default: 20) - Items per page
  - `locationId` (query) - Filter by location
  - `status` (query) - Filter by status (pending, in_progress, completed, overdue)
  - `priority` (query) - Filter by priority (low, medium, high, critical)
  - `type` (query) - Filter by task type
  - `assignedTo` (query) - Filter by assigned user ID
  - `dueDate` (query) - Filter by due date
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "tasks": [...],
      "summary": {
        "total": 10,
        "byStatus": {...},
        "byType": {...},
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

##### GET /tasks/:id
- **Description**: Get task by ID
- **Parameters**: `id` (path) - Task ID
- **Response**: Single task object

##### POST /tasks
- **Description**: Create a new task
- **Required Fields**: `title`, `type`, `locationId`
- **Optional Fields**: `description`, `assignedTo`, `priority`, `status`, `dueDate`, `recurring`, `recurrencePattern`, `requiresPhotoVerification`, `requiresSignature`, `checklistItems`, `notes`, `metadata`
- **Response**: Created task object with status 201

##### PUT /tasks/:id
- **Description**: Update task properties
- **Parameters**: `id` (path) - Task ID
- **Updatable Fields**: `title`, `description`, `status`, `priority`, `assignedTo`, `dueDate`, `notes`
- **Response**: Updated task object

##### POST /tasks/:id/complete
- **Description**: Mark a task as completed
- **Required Body**: `userId` - ID of user completing the task
- **Optional Body**: `notes`, `photos`, `signature`
- **Features**:
  - Sets status to 'completed'
  - Records completion timestamp and user
  - Triggers next recurrence if recurring
  - Accepts photo URLs and signature
- **Response**: Completed task object

##### DELETE /tasks/:id
- **Description**: Permanently delete a task
- **Parameters**: `id` (path) - Task ID
- **Response**: Success message

#### Input Validation
- Uses custom validator functions in `/src/utils/validators.js`
- Validates: task types, task status, dates, required fields
- Sanitizes string inputs (removes HTML tags)

---

## 3. BACKEND - SERVICE LAYER & BUSINESS LOGIC

### Location: `/home/user/PattyShack/src/services/TaskService.js`

#### Core Service Methods

##### `createTask(taskData)`
- Creates new task in database
- Auto-generates timestamp-based ID: `task-${Date.now()}`
- Stores JSON fields (checklist_items, photo_urls, corrective_actions, metadata)
- Returns formatted task object

##### `getTasks(filters = {})`
- Retrieves all tasks with optional filtering
- Supported filters: `locationId`, `status`, `type`, `assignedTo`, `dueDate`
- Orders by: due_date ASC, priority DESC
- Returns array of formatted task objects

##### `getTaskById(id)`
- Retrieves single task by ID
- Returns null if not found

##### `updateTask(id, updates)`
- Updates specific task fields
- Dynamically builds SQL UPDATE query
- Automatically updates `updated_at` timestamp
- Returns updated task object

##### `completeTask(id, completionData)`
- Marks task as completed
- Records completion timestamp and user ID
- Accepts optional photos array and signature URL
- **Triggers recurring**: If task is recurring, automatically creates next occurrence
- Returns updated task object

##### `deleteTask(id)`
- Permanently removes task from database
- Returns boolean success status

##### `getSummary(filters = {})`
- Generates task statistics
- Returns object with:
  - `total` - Total task count
  - `byStatus` - Count by each status
  - `byType` - Count by each type
  - `overdue` - Count of overdue tasks

##### `getOverdueTasks()`
- Retrieves all incomplete tasks with due_date < NOW()
- Orders by due_date ASC
- Used for alerts and reporting

##### `getTasksByHierarchy(hierarchyLevel, hierarchyId)`
- Retrieves tasks based on organizational structure
- Supports hierarchy levels: location, district, region, brand
- Joins with locations table to support hierarchical filtering

##### `createNextRecurrence(task)`
- Automatically creates next task instance for recurring tasks
- Uses `calculateNextDueDate()` to determine next due date
- Preserves all task properties (title, description, assignments, etc.)

##### `calculateNextDueDate(currentDueDate, pattern)`
- Calculates next due date based on recurrence pattern
- Supported patterns:
  - `daily` - Add 1 day
  - `weekly` - Add 7 days
  - `monthly` - Add 1 month
  - `default` - Add 1 day

##### `formatTask(row)`
- Converts database row format to API response format
- Handles camelCase conversion (location_id → locationId)
- Parses JSON fields (checklist_items, photo_urls, etc.)
- Returns standardized task object

#### Database Wrapper
- Uses PostgreSQL connection pool from `/src/database/pool.js`
- Prepared statements with parameterized queries (prevents SQL injection)
- Returns raw database rows which are formatted for API responses

---

## 4. FRONTEND - COMPONENTS & PAGES

### Location: `/home/user/PattyShack/frontend/src/pages/Tasks.jsx`

#### React Component Structure

##### State Management
```javascript
tasks[] - Array of task objects
loading - Boolean for loading state
error - Error message string
showCreateModal - Boolean for create modal visibility
filters - Object with status, priority, location filters
newTask - Object with form data for new task creation
```

##### Key Features
1. **Task Listing**
   - Grid layout (1 col mobile, 2 col tablet, 3 col desktop)
   - Task cards showing title, description, status, priority, due date
   - Status icons (CheckCircle, Clock, AlertCircle)

2. **Filtering**
   - Filter by status (pending, in-progress, completed, cancelled)
   - Filter by priority (low, medium, high, urgent)
   - Filter by location (text input for location ID)
   - Filters trigger re-fetch via useEffect

3. **Task Actions**
   - Complete task button (marks as completed)
   - Delete task button (with confirmation)
   - Task card click navigation (future enhancement)

4. **Create Task Modal**
   - Modal form with fields:
     - Title (required)
     - Description (textarea)
     - Priority dropdown
     - Status dropdown
     - Due date picker
     - Location ID input
     - Assigned To input
   - Form validation
   - Submit and cancel buttons

5. **Styling**
   - Tailwind CSS utility classes
   - Color-coded status badges
   - Color-coded priority badges
   - Hover effects on cards
   - Responsive design

#### Lucide Icons Used
- CheckCircle - Task completion status
- Clock - Due date/time indication
- AlertCircle - Error/overdue indication
- Plus - Create new task
- Filter - Filter controls
- Trash2 - Delete action
- X - Close modal

---

## 5. FRONTEND - SERVICE LAYER

### Location: `/home/user/PattyShack/frontend/src/services/tasksService.js`

#### Service Methods

##### `getTasks(filters = {})`
- Makes GET request to `/tasks`
- Passes filter parameters as query params
- Returns response data

##### `getTaskById(id)`
- Makes GET request to `/tasks/:id`
- Returns single task object

##### `createTask(taskData)`
- Makes POST request to `/tasks`
- Sends task data as JSON body
- Returns created task

##### `updateTask(id, taskData)`
- Makes PUT request to `/tasks/:id`
- Sends updates as JSON body
- Returns updated task

##### `completeTask(id)`
- Makes PATCH request to `/tasks/:id/complete`
- Note: Routes use POST, but service uses PATCH (potential inconsistency)
- Returns completed task

##### `deleteTask(id)`
- Makes DELETE request to `/tasks/:id`
- Returns success response

#### API Configuration
- Uses axios instance from `/frontend/src/utils/api.js`
- Automatically handles authentication headers
- Base URL configured in central API config

---

## 6. MOBILE - SCREENS & SERVICES

### Locations:
- `/home/user/PattyShack/mobile/src/screens/Tasks/TasksScreen.js`
- `/home/user/PattyShack/mobile/src/screens/Tasks/TaskDetailScreen.js`
- `/home/user/PattyShack/mobile/src/services/tasksService.js`

#### TasksScreen Component

##### Features
- Task list with FlatList (React Native optimized)
- Pull-to-refresh functionality
- Search bar for task filtering
- Status filter chips (all, pending, in_progress, completed)
- Color-coded status chips
- Material Design (react-native-paper)

##### Styling
- Header with orange background (#FF6B35)
- Card-based layout for tasks
- FAB (Floating Action Button) for create task (TODO: not yet implemented)

##### State
- tasks[] - List of tasks
- loading - Initial load state
- refreshing - Pull-to-refresh state
- searchQuery - Search input
- filter - Current status filter

#### TaskDetailScreen Component

##### Features
- Display single task details
- Status, priority, type chips
- Description section
- Due date display
- Assigned to information
- Checklist items rendering
- Complete task button (if not completed)
- Back navigation

##### State
- task - Single task object
- loading - Initial load state
- completing - Task completion state

#### Mobile Service (`tasksService.js`)

##### Methods
- `getTasks(params)` - Get tasks with filters
- `getTask(id)` - Get single task
- `createTask(taskData)` - Create task
- `updateTask(id, taskData)` - Update task
- `deleteTask(id)` - Delete task
- `completeTask(id, completionData)` - Complete task
- `uploadPhoto(id, photoUri)` - Upload photo with FormData

#### Photo Upload Support
- Multipart form data handling
- Supports JPEG format
- Prepared for task photo verification feature

---

## 7. CURRENT FEATURES IMPLEMENTED

### Task Types
- ✓ Checklist
- ✓ Line Check
- ✓ Food Safety
- ✓ Opening
- ✓ Closing
- ✓ Custom (flexible)

### Task Status
- ✓ Pending
- ✓ In Progress
- ✓ Completed
- ✓ Failed
- ✓ Overdue

### Task Priority Levels
- ✓ Low
- ✓ Medium
- ✓ High
- ✓ Critical

### Core Features
- ✓ Multi-location task management
- ✓ Task assignment to users
- ✓ Due date scheduling
- ✓ Task completion tracking (timestamp + user)
- ✓ Recurring tasks (daily, weekly, monthly)
- ✓ Checklist items support (JSONB)
- ✓ Photo verification support (with URLs array)
- ✓ Signature support
- ✓ Corrective actions tracking
- ✓ Task notes and metadata
- ✓ Task filtering and searching
- ✓ Pagination support
- ✓ Organizational hierarchy queries (location, district, region, brand)
- ✓ Task summary/statistics

### Photo & Signature Features
- ✓ Photo URLs storage
- ✓ Signature URL storage
- ✓ Photo upload endpoint (mobile)
- ✓ Photo verification requirement flag

### Recurring Task Features
- ✓ Mark as recurring
- ✓ Set recurrence pattern (daily/weekly/monthly)
- ✓ Auto-create next occurrence on completion
- ✓ Customizable recurrence interval

---

## 8. RELATIONSHIPS WITH OTHER ENTITIES

### Users
- **assigned_to** FK → users(id)
- **completed_by** FK → users(id)
- Used for task assignment and completion tracking
- Enables user-based filtering and reporting

### Locations
- **location_id** FK → locations(id)
- Primary organizational context for tasks
- Supports location-based task filtering
- Cascading deletes location's tasks

### Locations Hierarchy
- Through locations table relationships (brand_id, district_id, region_id)
- `getTasksByHierarchy()` method supports hierarchical querying
- Enables multi-level organizational task management

### Temperature Logs (Related but not Direct)
- Tasks can include food safety checks related to temperatures
- Task type 'food_safety' designed for compliance tracking

### Schedules (Related but not Direct)
- Tasks can be assigned based on schedules
- Opening/closing tasks align with shift schedules

---

## 9. VALIDATION RULES

### Location: `/home/user/PattyShack/src/utils/validators.js`

#### Task-Specific Validators
- `isValidTaskStatus(status)` - Validates against enum values
- `isValidTaskType(type)` - Validates against enum values
- `hasRequiredFields(data, fields)` - Checks for required fields
- `sanitizeString(str)` - Removes HTML tags, trims whitespace

#### Supporting Validators
- `isValidDate(dateString)` - Validates ISO date strings
- `isNonNegativeNumber(value)` - For numeric fields
- Standard email, phone, URL validators

---

## 10. TESTING

### Location: `/home/user/PattyShack/tests/integration/tasks.test.js`

#### Test Coverage
- ✓ Create task (basic and recurring)
- ✓ Get all tasks with various filters
- ✓ Get single task by ID
- ✓ Update task properties
- ✓ Complete task (with photos and signature)
- ✓ Delete task
- ✓ Error handling (missing fields, invalid IDs)
- ✓ Pagination

#### Test Fixtures
- Test location creation
- Test user creation
- Test task creation with various configurations

---

## 11. API RESPONSE FORMAT

### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "task-1234567890",
    "title": "Daily Line Check",
    "description": "Check all equipment",
    "type": "line_check",
    "category": "food_safety",
    "locationId": "loc-123",
    "assignedTo": "user-456",
    "priority": "high",
    "status": "pending",
    "dueDate": "2025-12-20T18:00:00Z",
    "completedAt": null,
    "completedBy": null,
    "recurring": false,
    "recurrencePattern": null,
    "recurrenceInterval": null,
    "requiresPhotoVerification": true,
    "photoUrls": [],
    "requiresSignature": false,
    "signatureUrl": null,
    "checklistItems": [],
    "notes": "",
    "correctiveActions": [],
    "metadata": {},
    "createdAt": "2025-12-14T10:30:00Z",
    "updatedAt": "2025-12-14T10:30:00Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Missing required fields: title, type, locationId"
}
```

### List Response with Pagination
```json
{
  "success": true,
  "data": {
    "tasks": [...array of task objects...],
    "summary": {
      "total": 15,
      "byStatus": { "pending": 8, "in_progress": 3, "completed": 4 },
      "byType": { "checklist": 5, "line_check": 10 },
      "overdue": 2
    },
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

## 12. POTENTIAL ENHANCEMENTS FOR PHASE 1

### Areas for Enhancement
1. **Task Dependencies** - Chain tasks together
2. **Bulk Operations** - Complete multiple tasks at once
3. **Task Templates** - Reusable task configurations
4. **Reminders & Notifications** - Alert system for due tasks
5. **Task History & Audit Trail** - Complete change tracking
6. **Performance Metrics** - Task completion rates by user/location
7. **Offline Support** - Service worker for offline task operations
8. **Advanced Search** - Full-text search capabilities
9. **Custom Fields** - Extensible metadata for industry-specific needs
10. **Webhooks** - External system integrations
11. **Analytics Dashboard** - Task completion trends
12. **Mobile Photos** - Improved photo management in mobile app

---

## 13. KEY FILE LOCATIONS SUMMARY

### Backend
- **Model**: `/home/user/PattyShack/src/models/Task.js`
- **Service**: `/home/user/PattyShack/src/services/TaskService.js`
- **Routes**: `/home/user/PattyShack/src/routes/tasks.js`
- **Database Schema**: `/home/user/PattyShack/src/database/migrations/001_initial_schema.sql`
- **Validators**: `/home/user/PattyShack/src/utils/validators.js`

### Frontend (Web)
- **Component**: `/home/user/PattyShack/frontend/src/pages/Tasks.jsx`
- **Service**: `/home/user/PattyShack/frontend/src/services/tasksService.js`

### Mobile
- **Tasks Screen**: `/home/user/PattyShack/mobile/src/screens/Tasks/TasksScreen.js`
- **Task Detail Screen**: `/home/user/PattyShack/mobile/src/screens/Tasks/TaskDetailScreen.js`
- **Service**: `/home/user/PattyShack/mobile/src/services/tasksService.js`

### Tests
- **Integration Tests**: `/home/user/PattyShack/tests/integration/tasks.test.js`
- **Unit Tests**: `/home/user/PattyShack/tests/unit/taskService.test.js`

