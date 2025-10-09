# Integration Guide

## Overview
PattyShack provides comprehensive integration capabilities to connect with your existing restaurant technology stack.

## POS Integration

### Supported Systems
- Square
- Toast
- Clover
- Aloha
- Micros
- NCR

### Data Synced
- Real-time sales data
- Menu items and pricing
- Transaction details
- Employee information
- Time clock data

### Configuration
```javascript
{
  "pos": {
    "provider": "toast",
    "apiKey": "your-api-key",
    "locationId": "location-id",
    "syncInterval": 300, // seconds
    "endpoints": {
      "sales": "https://api.toast.com/v2/sales",
      "menu": "https://api.toast.com/v2/menu"
    }
  }
}
```

## Payroll Integration

### Supported Providers
- ADP
- Paychex
- Gusto
- Paylocity
- Paycor

### Data Synced
- Employee time cards
- Clock in/out records
- Overtime calculations
- Labor cost allocation
- Schedule data

### Configuration
```javascript
{
  "payroll": {
    "provider": "adp",
    "companyCode": "your-company-code",
    "apiKey": "your-api-key",
    "exportFrequency": "daily",
    "exportFormat": "csv"
  }
}
```

## Accounting Integration

### Supported Systems
- QuickBooks Online
- Xero
- Sage
- NetSuite

### Data Synced
- Invoice data
- Vendor payments
- General ledger entries
- Cost of goods sold
- Purchase orders

### Configuration
```javascript
{
  "accounting": {
    "provider": "quickbooks",
    "oauthToken": "oauth-token",
    "companyId": "company-id",
    "glMapping": {
      "food": "5000",
      "labor": "6000",
      "supplies": "5100"
    }
  }
}
```

## IoT Sensor Integration

### Supported Devices
- Monnit Wireless Sensors
- Sensaphone
- Dickson
- Xylem Analytics
- Generic Bluetooth probes

### Temperature Sensors
```javascript
{
  "iot": {
    "provider": "monnit",
    "gateway": {
      "id": "gateway-123",
      "ipAddress": "192.168.1.100"
    },
    "sensors": [
      {
        "id": "sensor-001",
        "type": "temperature",
        "equipment": "walk-in-cooler",
        "location": "back-of-house",
        "thresholds": {
          "min": 33,
          "max": 40,
          "unit": "F"
        }
      }
    ]
  }
}
```

### Sensor Data Flow
1. Sensor reads temperature
2. Data sent to gateway
3. Gateway forwards to PattyShack API
4. System checks thresholds
5. Alerts triggered if out of range
6. Corrective action workflow initiated

## Delivery Aggregator Integration

### Supported Platforms
- DoorDash
- Uber Eats
- Grubhub
- Postmates

### Data Synced
- Online orders
- Delivery times
- Customer feedback
- Sales by platform

## REST API

### Authentication
All API requests require authentication using JWT tokens:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.pattyshack.com/api/v1/tasks
```

### Endpoints

#### Create Task
```bash
POST /api/v1/tasks
Content-Type: application/json

{
  "title": "Morning Line Check",
  "locationId": 1,
  "assignedTo": 5,
  "dueDate": "2024-01-15T08:00:00Z"
}
```

#### Log Temperature
```bash
POST /api/v1/temperatures
Content-Type: application/json

{
  "locationId": 1,
  "equipmentId": "cooler-1",
  "temperature": 38,
  "unit": "F"
}
```

#### Update Inventory
```bash
POST /api/v1/inventory/count
Content-Type: application/json

{
  "locationId": 1,
  "items": [
    { "itemId": 1, "quantity": 50 }
  ]
}
```

## Webhooks

### Available Events
- `task.completed`
- `task.overdue`
- `temperature.alert`
- `inventory.low_stock`
- `schedule.updated`

### Webhook Configuration
```javascript
{
  "webhooks": [
    {
      "url": "https://your-domain.com/webhooks/pattyshack",
      "events": ["temperature.alert", "task.overdue"],
      "secret": "webhook-secret-key"
    }
  ]
}
```

### Payload Format
```json
{
  "event": "temperature.alert",
  "timestamp": "2024-01-15T08:30:00Z",
  "data": {
    "locationId": 1,
    "equipmentId": "cooler-1",
    "temperature": 45,
    "threshold": { "min": 33, "max": 40 },
    "severity": "high"
  }
}
```

## Single Sign-On (SSO)

### Supported Protocols
- SAML 2.0
- OAuth 2.0
- OpenID Connect

### Configuration
```javascript
{
  "sso": {
    "protocol": "saml",
    "provider": "okta",
    "entryPoint": "https://your-org.okta.com/app/pattyshack/sso/saml",
    "issuer": "https://your-org.okta.com",
    "cert": "-----BEGIN CERTIFICATE-----\n..."
  }
}
```

## Data Warehouse

### Export Options
- Real-time streaming
- Scheduled batch exports
- On-demand API access

### Formats
- JSON
- CSV
- Parquet
- Avro

### Example: BigQuery Export
```javascript
{
  "dataWarehouse": {
    "provider": "bigquery",
    "projectId": "your-project",
    "dataset": "pattyshack",
    "tables": {
      "tasks": "tasks_data",
      "temperatures": "temp_logs",
      "inventory": "inventory_data"
    },
    "frequency": "hourly"
  }
}
```

## BI Tool Integration

### Power BI
```javascript
{
  "bi": {
    "tool": "powerbi",
    "workspace": "workspace-id",
    "dataSource": {
      "type": "rest_api",
      "url": "https://api.pattyshack.com/api/v1/analytics/export"
    }
  }
}
```

### Tableau
```javascript
{
  "bi": {
    "tool": "tableau",
    "server": "https://tableau.your-org.com",
    "connector": "web_data_connector",
    "url": "https://api.pattyshack.com/wdc/tableau"
  }
}
```

## Testing Integrations

### Test Mode
Enable test mode for safe integration testing:
```javascript
{
  "testMode": true,
  "mockData": true,
  "skipExternalCalls": true
}
```

### Sandbox Environment
```
API URL: https://sandbox-api.pattyshack.com
Test Credentials: test@pattyshack.com / testpassword123
```

## Rate Limits

- Standard API: 1000 requests/hour
- Premium API: 10000 requests/hour
- Webhook delivery: Best effort with 3 retries

## Support

For integration support:
- Email: integrations@pattyshack.com
- Documentation: https://docs.pattyshack.com
- Status: https://status.pattyshack.com

## Best Practices

1. **Use webhooks** for real-time updates instead of polling
2. **Cache responses** where appropriate
3. **Implement exponential backoff** for retries
4. **Monitor rate limits** and adjust accordingly
5. **Validate webhook signatures** to ensure authenticity
6. **Handle errors gracefully** with proper logging
7. **Test thoroughly** in sandbox before production
