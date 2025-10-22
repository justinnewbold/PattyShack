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
HACCP-compliant temperature logging with IoT sensor integration, threshold enforcement, and alerting.

#### List Temperature Logs
Returns all temperature readings for a location or piece of equipment along with roll-up statistics.

```http
GET /temperatures?locationId={id}&equipmentId={id}&startDate={iso}&endDate={iso}
```

**Response**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1705432339000,
        "locationId": 1,
        "equipmentId": "FRIDGE-01",
        "equipmentType": "fridge",
        "temperature": 38,
        "source": "iot_sensor",
        "recordedAt": "2024-01-15T13:12:19.000Z",
        "threshold": { "min": 33, "max": 41 },
        "isInRange": true
      }
    ],
    "statistics": {
      "totalReadings": 42,
      "outOfRange": 1,
      "averageTemp": 37.6
    }
  }
}
```

#### Log Temperature
Adds a manual or IoT sensor reading, auto-validating it against the configured thresholds and generating alerts if out of range.

```http
POST /temperatures
Content-Type: application/json

{
  "locationId": 1,
  "equipmentId": "FRIDGE-01",
  "equipmentType": "fridge",
  "temperature": 38,
  "source": "iot_sensor",
  "recordedAt": "2024-01-15T13:12:19Z"
}
```

#### Get Temperature Alerts
Summaries live, acknowledged, and resolved alerts with optional location filtering.

```http
GET /temperatures/alerts?locationId={id}&status={status}
```

#### Acknowledge Temperature Alert
Marks an alert as acknowledged and optionally attaches operator notes.

```http
POST /temperatures/alerts/{alertId}/acknowledge
Content-Type: application/json

{
  "acknowledgedBy": "manager-12",
  "note": "On-site check confirmed door was left open"
}
```

#### Resolve Temperature Alert
Resolves an alert, capturing the corrective action taken.

```http
POST /temperatures/alerts/{alertId}/resolve
Content-Type: application/json

{
  "resolvedBy": "manager-12",
  "resolution": "Adjusted thermostat and verified temperature",
  "note": "Unit stabilized within 15 minutes"
}
```

#### Get Equipment History
Returns a trend analysis and latest reading for an individual piece of equipment.

```http
GET /temperatures/equipment/{equipmentId}?period=24h
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

**Response**
```json
{
  "success": true,
  "data": {
    "period": {
      "label": "Last 7 Days",
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-08T00:00:00.000Z"
    },
    "kpis": {
      "sales": { "current": 15400, "previous": 14800, "change": 4.05 },
      "foodCost": { "current": 4600, "target": 4620, "variance": -0.43 },
      "laborCost": {
        "current": 3850,
        "target": 3850,
        "variance": 0,
        "laborPercent": 25,
        "previousPercent": 26.4
      },
      "waste": {
        "current": 215,
        "previous": 260,
        "change": -17.3,
        "topReasons": [
          { "reason": "prep_error", "value": 120 },
          { "reason": "spoilage", "value": 95 }
        ]
      },
      "compliance": {
        "score": 92,
        "tasks": { "completed": 23, "total": 25, "overdue": 1 },
        "trend": "up"
      }
    },
    "charts": {
      "salesTrend": [
        { "date": "2024-01-01", "sales": 2100, "laborCost": 520 },
        { "date": "2024-01-02", "sales": 2300, "laborCost": 540 }
      ],
      "laborVsSales": [
        { "scheduleId": "sched-100", "date": "2024-01-01", "laborCost": 520, "sales": 2100 }
      ],
      "wasteByCategory": [
        { "category": "protein", "value": 150 },
        { "category": "bakery", "value": 65 }
      ],
      "temperatureCompliance": { "complianceRate": 96.4, "totalReadings": 28, "outOfRange": 1 }
    }
  }
}
```

#### Location Comparison
```http
GET /analytics/locations?metric=compliance&period=30d
```

**Response**
```json
{
  "success": true,
  "data": {
    "metric": "compliance",
    "period": {
      "label": "Last 30 Days",
      "start": "2023-12-10T00:00:00.000Z",
      "end": "2024-01-09T00:00:00.000Z"
    },
    "locations": [
      { "locationId": "store-100", "value": 94, "previousValue": 90, "change": 4.44, "rank": 1 },
      { "locationId": "store-200", "value": 87, "previousValue": 88, "change": -1.14, "rank": 2 }
    ],
    "benchmark": {
      "average": 90.5,
      "topPerformer": { "locationId": "store-100", "value": 94 },
      "bottomPerformer": { "locationId": "store-200", "value": 87 }
    }
  }
}
```

#### Generate Report
```http
GET /analytics/reports/{type}?locationId={id}&startDate={start}&endDate={end}
```

**Response**
```json
{
  "success": true,
  "data": {
    "reportType": "operations",
    "generatedAt": "2024-02-01T15:30:00.000Z",
    "filters": {
      "locationId": "store-100",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-02-01T00:00:00.000Z"
    },
    "exportUrl": null,
    "data": {
      "title": "Operations Summary",
      "compliance": {
        "score": 92,
        "previousScore": 89,
        "tasks": { "completed": 45, "total": 49, "overdue": 2 }
      },
      "alerts": {
        "alerts": [
          { "id": "alert-1", "type": "temperature", "severity": "critical" },
          { "id": "inventory-item-100", "type": "inventory", "severity": "warning" }
        ],
        "summary": { "critical": 1, "warning": 1, "info": 0 }
      },
      "taskBreakdown": {
        "total": 49,
        "byStatus": { "completed": 45, "pending": 3, "in_progress": 1 },
        "byType": { "safety": 20, "ops": 29 }
      }
    }
  }
}
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
