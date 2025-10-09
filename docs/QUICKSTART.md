# Quick Start Guide

Get PattyShack up and running in minutes!

## Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/justinnewbold/PattyShack.git
cd PattyShack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## Access the Platform

### Web Interface

Open your browser and navigate to:
```
http://localhost:3000
```

You'll see the PattyShack dashboard with all available features.

### API Access

The REST API is available at:
```
http://localhost:3000/api/v1
```

### Health Check

Verify the server is running:
```bash
curl http://localhost:3000/health
```

## Try the API

### List Tasks

```bash
curl http://localhost:3000/api/v1/tasks
```

### Create a Task

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Morning Line Check",
    "description": "Complete morning food safety checklist",
    "type": "line_check",
    "locationId": 1,
    "dueDate": "2024-01-15T08:00:00Z"
  }'
```

### Log Temperature

```bash
curl -X POST http://localhost:3000/api/v1/temperatures \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": 1,
    "equipmentId": "cooler-1",
    "equipmentType": "refrigerator",
    "temperature": 38,
    "unit": "F"
  }'
```

### Get Dashboard Data

```bash
curl http://localhost:3000/api/v1/analytics/dashboard?locationId=1
```

## Development Mode

For development with auto-reload:

```bash
npm run dev
```

## Next Steps

1. **Configure Your Environment**
   - Copy `.env.example` to `.env`
   - Update configuration values

2. **Explore the Features**
   - Task Management: `http://localhost:3000/api/v1/tasks`
   - Temperature Monitoring: `http://localhost:3000/api/v1/temperatures`
   - Inventory: `http://localhost:3000/api/v1/inventory`
   - Analytics: `http://localhost:3000/api/v1/analytics/dashboard`

3. **Read the Documentation**
   - [API Documentation](./API.md)
   - [Features Overview](./FEATURES.md)
   - [Integration Guide](./INTEGRATIONS.md)
   - [Deployment Guide](./DEPLOYMENT.md)

4. **Set Up Your Locations**
   - Create your restaurant locations via API
   - Set up user accounts and roles
   - Configure equipment and sensors

5. **Start Managing Operations**
   - Create daily checklists
   - Set up temperature monitoring
   - Configure inventory items
   - Build employee schedules

## Common Tasks

### Create a Location

```bash
curl -X POST http://localhost:3000/api/v1/locations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Patty Shack Downtown",
    "code": "PS001",
    "type": "corporate",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  }'
```

### Create a Schedule

```bash
curl -X POST http://localhost:3000/api/v1/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": 1,
    "userId": 5,
    "date": "2024-01-15",
    "startTime": "08:00",
    "endTime": "16:00",
    "position": "cook"
  }'
```

### Perform Inventory Count

```bash
curl -X POST http://localhost:3000/api/v1/inventory/count \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": 1,
    "items": [
      { "itemId": 1, "quantity": 50 },
      { "itemId": 2, "quantity": 30 }
    ],
    "countedBy": 5
  }'
```

## Troubleshooting

### Server won't start
- Check that port 3000 is not in use
- Verify Node.js is installed: `node --version`
- Check for error messages in the console

### Cannot connect to API
- Ensure the server is running
- Check firewall settings
- Verify the URL is correct

### Need Help?
- Check the [full documentation](./API.md)
- Review example requests above
- Check server logs for errors

## What's Next?

Now that PattyShack is running, explore these key features:

✅ **Task Management** - Create digital checklists and track completion  
✅ **Temperature Monitoring** - Log temperatures and set up alerts  
✅ **Inventory Control** - Track inventory and manage costs  
✅ **Staff Scheduling** - Build schedules and track labor  
✅ **Analytics** - Monitor KPIs and performance metrics  
✅ **Multi-Location** - Manage multiple restaurant locations  

Happy restaurant managing! 🍔
