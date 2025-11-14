# API Reference

Complete API documentation for PattyShack v1.0

**Base URL**: `https://your-domain.com/api/v1`

**Authentication**: Bearer token (JWT)

## Table of Contents

- [Authentication](#authentication)
- [Tasks](#tasks)
- [Temperature Monitoring](#temperature-monitoring)
- [Inventory](#inventory)
- [Scheduling](#scheduling)
- [Analytics](#analytics)
- [Integrations](#integrations)
- [User Management](#user-management)
- [Error Handling](#error-handling)

## Authentication

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "manager"
    }
  }
}
```

### Register

```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "role": "employee",
  "locationId": "loc-123"
}
```

## Tasks

### Create Task

```http
POST /tasks
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Clean fryer station",
  "description": "Deep clean fryer and surrounding area",
  "type": "cleaning",
  "priority": "high",
  "locationId": "loc-123",
  "assignedTo": "user-456",
  "dueDate": "2024-11-15T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "task-789",
    "title": "Clean fryer station",
    "status": "pending",
    "createdAt": "2024-11-14T10:00:00Z"
  }
}
```

### Get Tasks

```http
GET /tasks?locationId={locationId}&status={status}&type={type}
Authorization: Bearer {token}
```

**Query Parameters:**
- `locationId` (optional): Filter by location
- `status` (optional): pending, in_progress, completed, cancelled
- `type` (optional): cleaning, maintenance, safety, opening, closing
- `assignedTo` (optional): Filter by assigned user
- `priority` (optional): low, medium, high, critical

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-789",
      "title": "Clean fryer station",
      "description": "Deep clean fryer and surrounding area",
      "type": "cleaning",
      "priority": "high",
      "status": "pending",
      "locationId": "loc-123",
      "assignedTo": "user-456",
      "dueDate": "2024-11-15T14:00:00Z",
      "createdAt": "2024-11-14T10:00:00Z"
    }
  ]
}
```

### Bulk Operations

```http
POST /tasks/bulk/create
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "templateId": "template-opening",
  "locationIds": ["loc-123", "loc-456"],
  "assignedTo": "user-789",
  "dueDate": "2024-11-15T08:00:00Z"
}
```

### Task Dependencies

```http
POST /tasks/{taskId}/dependencies
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "prerequisiteTaskId": "task-123"
}
```

## Temperature Monitoring

### Log Temperature

```http
POST /temperatures
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "equipmentId": "eq-freezer-1",
  "temperature": 38.5,
  "recordedBy": "user-123",
  "notes": "Within range"
}
```

### Get Temperature Logs

```http
GET /temperatures?equipmentId={equipmentId}&startDate={date}&endDate={date}
Authorization: Bearer {token}
```

### Create Alert

```http
POST /temperatures/alerts
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "equipmentId": "eq-freezer-1",
  "temperature": 45.0,
  "alertType": "critical_high",
  "severity": "critical"
}
```

### Get Equipment Dashboard

```http
GET /temperatures/equipment/dashboard?locationId={locationId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "equipmentId": "eq-freezer-1",
      "equipmentName": "Walk-in Freezer",
      "currentTemp": 0.5,
      "status": "normal",
      "lastReading": "2024-11-14T10:30:00Z",
      "batteryLevel": 85,
      "alerts": []
    }
  ]
}
```

## Inventory

### Get Inventory

```http
GET /inventory?locationId={locationId}&category={category}
Authorization: Bearer {token}
```

### Update Count

```http
PUT /inventory/{itemId}/count
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "currentQuantity": 50,
  "countedBy": "user-123",
  "notes": "Physical count"
}
```

### Reorder Point Calculation

```http
GET /inventory/{itemId}/reorder-point?locationId={locationId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "item-123",
    "reorderPoint": 75,
    "avgDailyUsage": 15,
    "leadTime": 3,
    "safetyStock": 30,
    "currentQuantity": 45,
    "shouldReorder": true
  }
}
```

### Create Recipe

```http
POST /inventory/recipes
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Classic Burger",
  "servingSize": 1,
  "ingredients": [
    {
      "itemId": "item-beef",
      "quantity": 0.25,
      "unit": "lb"
    },
    {
      "itemId": "item-bun",
      "quantity": 1,
      "unit": "each"
    }
  ]
}
```

## Scheduling

### Create Schedule

```http
POST /scheduling/schedules
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "locationId": "loc-123",
  "scheduleDate": "2024-11-18",
  "createdBy": "user-manager"
}
```

### Generate from Template

```http
POST /scheduling/schedules/{scheduleId}/generate
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "templateId": "template-weekday"
}
```

### Auto-assign Shifts

```http
POST /scheduling/schedules/{scheduleId}/auto-assign
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUnassigned": 10,
    "assigned": 8,
    "remaining": 2,
    "assignments": [
      {
        "shiftId": "shift-123",
        "employeeId": "user-456",
        "employeeName": "John Doe"
      }
    ]
  }
}
```

### Request Time Off

```http
POST /scheduling/time-off
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "locationId": "loc-123",
  "requestType": "vacation",
  "startDate": "2024-12-01",
  "endDate": "2024-12-05",
  "reason": "Family vacation"
}
```

### Request Shift Trade

```http
POST /scheduling/shift-trades
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "shiftId": "shift-123",
  "fromUserId": "user-abc",
  "toUserId": "user-xyz",
  "tradeType": "swap",
  "offeredShiftId": "shift-456",
  "reason": "Schedule conflict"
}
```

## Analytics

### Labor Cost Report

```http
GET /analytics/labor/report?locationId={locationId}&startDate={date}&endDate={date}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLaborCost": 15000.00,
    "totalHours": 500,
    "totalOvertimeCost": 1500.00,
    "avgDailyLaborCost": 500.00,
    "dailyBreakdown": [
      {
        "shift_date": "2024-11-14",
        "total_shifts": 10,
        "total_hours": 80,
        "total_labor_cost": 1200.00
      }
    ]
  }
}
```

### Sales Report

```http
GET /analytics/sales/report?locationId={locationId}&startDate={date}&endDate={date}
Authorization: Bearer {token}
```

### Food Cost Trend

```http
GET /analytics/food-cost/trend?locationId={locationId}&months={number}
Authorization: Bearer {token}
```

### Prime Cost Analysis

```http
GET /analytics/dashboard/prime-cost?locationId={locationId}&startDate={date}&endDate={date}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "location_name": "Downtown Location",
      "period_start": "2024-11-01",
      "period_end": "2024-11-14",
      "actual_food_cost": 12000.00,
      "food_cost_percentage": 28.5,
      "total_labor_cost": 15000.00,
      "labor_cost_percentage": 35.7,
      "prime_cost": 27000.00,
      "prime_cost_percentage": 64.2,
      "sales_for_period": 42000.00
    }
  ]
}
```

### Daily Performance Dashboard

```http
GET /analytics/dashboard/daily?locationId={locationId}&date={date}
Authorization: Bearer {token}
```

## Integrations

### Get Available Providers

```http
GET /integrations/providers?category={category}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "provider-square",
      "name": "Square POS",
      "category": "pos",
      "auth_type": "oauth2",
      "supported_features": ["sales_import", "inventory_sync"]
    }
  ]
}
```

### Connect Integration

```http
POST /integrations/connect
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "locationId": "loc-123",
  "providerId": "provider-square",
  "credentials": {
    "accessToken": "sq0atp-..."
  },
  "config": {
    "syncFrequencyMinutes": 60
  }
}
```

### Sync Integration

```http
POST /integrations/{integrationId}/sync
Authorization: Bearer {token}
```

### Create Webhook

```http
POST /integrations/webhooks
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "locationId": "loc-123",
  "name": "Task Completion Webhook",
  "url": "https://your-service.com/webhooks/tasks",
  "eventTypes": ["task.completed", "task.created"],
  "authType": "bearer_token",
  "authCredentials": {
    "token": "your-secret-token"
  }
}
```

### Create API Key

```http
POST /integrations/api-keys
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Mobile App API Key",
  "locationId": "loc-123",
  "permissions": ["task:read", "task:create", "temperature:log"],
  "rateLimitPerHour": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "apikey-123",
    "name": "Mobile App API Key",
    "apiKey": "ps_8f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c...",
    "keyPrefix": "ps_8f4e3d"
  },
  "message": "Save this API key securely - it will not be shown again"
}
```

### Export Data

```http
POST /exports
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "locationId": "loc-123",
  "exportType": "tasks",
  "format": "csv",
  "filters": {
    "startDate": "2024-11-01",
    "endDate": "2024-11-14",
    "status": "completed"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "export-123",
    "status": "pending",
    "downloadUrl": "/api/v1/exports/export-123/download"
  }
}
```

## User Management

### Get User Profile

```http
GET /user-management/profile/{userId}
Authorization: Bearer {token}
```

### Update User Profile

```http
PUT /user-management/profile/{userId}
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "John Doe",
  "phoneNumber": "+1-555-0123",
  "jobTitle": "Assistant Manager",
  "department": "Operations"
}
```

### Update Preferences

```http
PUT /user-management/preferences/{userId}
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "theme": "dark",
  "timezone": "America/New_York",
  "temperatureUnit": "fahrenheit",
  "notificationsEnabled": true,
  "emailNotifications": true
}
```

### Get Roles

```http
GET /user-management/roles
Authorization: Bearer {token}
```

### Assign Role

```http
POST /user-management/users/{userId}/roles
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "roleId": "role-manager",
  "locationId": "loc-123",
  "assignedBy": "user-admin"
}
```

### Check Permission

```http
POST /user-management/users/{userId}/check-permission
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "permissionName": "task:delete",
  "locationId": "loc-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasPermission": true
  }
}
```

### Create Team

```http
POST /user-management/teams
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "locationId": "loc-123",
  "name": "Morning Crew",
  "teamLeadId": "user-456",
  "color": "#4CAF50"
}
```

### Change Password

```http
POST /user-management/password/change
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

### Request Password Reset

```http
POST /user-management/password/request-reset
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message here",
  "stack": "Error stack trace (development only)"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

### Common Errors

```json
// Invalid credentials
{
  "success": false,
  "error": "Invalid email or password"
}

// Missing token
{
  "success": false,
  "error": "No token provided"
}

// Expired token
{
  "success": false,
  "error": "Token expired"
}

// Insufficient permissions
{
  "success": false,
  "error": "Insufficient permissions"
}

// Validation error
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "title": "Title is required",
    "dueDate": "Invalid date format"
  }
}
```

## Rate Limiting

API requests are rate limited:
- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per hour per API key
- **Premium**: 10000 requests per hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699999999
```

## Pagination

List endpoints support pagination:

```http
GET /tasks?page=2&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 250,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Webhooks

### Event Types

- `task.created`
- `task.updated`
- `task.completed`
- `task.deleted`
- `temperature.alert`
- `schedule.published`
- `shift.created`
- `inventory.low_stock`

### Webhook Payload

```json
{
  "event": "task.completed",
  "timestamp": "2024-11-14T10:00:00Z",
  "data": {
    "id": "task-123",
    "title": "Clean fryer station",
    "completedBy": "user-456",
    "completedAt": "2024-11-14T09:55:00Z"
  }
}
```

---

**API Version**: 1.0
**Last Updated**: November 2024
**Interactive Docs**: `/api/v1/docs`
