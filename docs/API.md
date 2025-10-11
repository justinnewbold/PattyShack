# PattyShack API Documentation

## Overview
PattyShack is a comprehensive restaurant operations platform that provides multi-location task management, temperature monitoring, inventory control, labor management, and analytics.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Core Features

### 1. Task Management
Manage digital checklists, recurring tasks, and SOPs across all locations.

#### List Tasks
```http
GET /tasks?locationId={id}&status={status}&type={type}
```

#### Get Task Details
```http
GET /tasks/:id
```

#### Create Task
```http
POST /tasks
Content-Type: application/json

{
  "title": "Morning Line Check",
  "description": "Complete morning food safety checklist",
  "type": "line_check",
  "locationId": 1,
  "assignedTo": 5,
  "dueDate": "2024-01-15T08:00:00Z",
  "recurring": true,
  "recurrencePattern": "daily"
}
```

#### Complete Task
```http
POST /tasks/:id/complete
Content-Type: application/json

{
  "photos": ["url1", "url2"],
  "signature": "signature_url",
  "notes": "All checks passed"
}
```

### 2. Temperature Monitoring
HACCP-compliant temperature logging with IoT sensor integration.

#### Log Temperature
```http
POST /temperatures
Content-Type: application/json

{
  "locationId": 1,
  "equipmentId": "FRIDGE-01",
  "equipmentType": "refrigerator",
  "temperature": 38,
  "unit": "F",
  "source": "iot_sensor"
}
```

#### Get Temperature Alerts
```http
GET /temperatures/alerts?locationId={id}&status={status}
```

### 3. Inventory Management
Real-time inventory tracking with barcode scanning and waste logging.

#### List Inventory
```http
GET /inventory?locationId={id}&category={category}&lowStock=true
```

#### Perform Inventory Count
```http
POST /inventory/count
Content-Type: application/json

{
  "locationId": 1,
  "items": [
    { "itemId": 1, "quantity": 50 },
    { "itemId": 2, "quantity": 30 }
  ],
  "countedBy": 5
}
```

#### Log Waste
```http
POST /inventory/waste
Content-Type: application/json

{
  "itemId": 1,
  "quantity": 2,
  "reasonCode": "expired",
  "notes": "Past expiration date"
}
```

### 4. Scheduling & Labor
Shift scheduling, time tracking, and labor forecasting.

#### Create Schedule
```http
POST /schedules
Content-Type: application/json

{
  "locationId": 1,
  "userId": 5,
  "date": "2024-01-15",
  "startTime": "08:00",
  "endTime": "16:00",
  "position": "cook"
}
```

#### Clock In
```http
POST /schedules/:id/clock-in
Content-Type: application/json

{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

#### Labor Forecasting
```http
GET /schedules/forecast?locationId={id}&date={date}
```

### 5. Analytics & Reporting
Real-time dashboards, KPIs, and performance metrics.

#### Get Dashboard
```http
GET /analytics/dashboard?locationId={id}&period=7d
```

#### Location Comparison
```http
GET /analytics/locations?metric=compliance&period=30d
```

#### Generate Report
```http
GET /analytics/reports/{type}?locationId={id}&startDate={start}&endDate={end}
```

### 6. Location Management
Multi-location hierarchy and organization.

#### List Locations
```http
GET /locations?districtId={id}&regionId={id}
```

#### Get Location Scorecard
```http
GET /locations/:id/scorecard?period=30d
```

## Role-Based Access Control

### Roles
- **crew**: Basic task completion and temperature logging
- **manager**: Full location management
- **district**: Multi-location oversight
- **regional**: Regional performance monitoring
- **corporate**: Enterprise-wide access

### Permissions Matrix

| Feature | Crew | Manager | District | Regional | Corporate |
|---------|------|---------|----------|----------|-----------|
| View Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Complete Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Tasks | - | ✓ | ✓ | ✓ | ✓ |
| Log Temperatures | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Inventory | - | ✓ | ✓ | ✓ | ✓ |
| View Analytics | - | ✓ | ✓ | ✓ | ✓ |
| Manage Schedules | - | ✓ | ✓ | ✓ | ✓ |
| Multi-Location View | - | - | ✓ | ✓ | ✓ |
| System Configuration | - | - | - | - | ✓ |

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting
API requests are rate-limited to 1000 requests per hour per user.

## Pagination
List endpoints support pagination:
```
GET /tasks?page=1&perPage=20
```

## Filtering
Most endpoints support filtering via query parameters:
```
GET /tasks?status=pending&type=line_check&locationId=1
```

## Webhooks
Configure webhooks to receive real-time notifications for events:
- Task completed
- Temperature alert
- Inventory low stock
- Schedule changes

## Integration APIs
- POS Integration
- Payroll Integration
- Accounting Integration
- IoT Sensor Integration

For more details, see [INTEGRATIONS.md](./INTEGRATIONS.md)
