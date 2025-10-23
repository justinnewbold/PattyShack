# PattyShack Frontend

Modern React application for managing restaurant operations including tasks, inventory, schedules, temperatures, and analytics.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:5173
```

## Features

- 🔐 **Authentication** - Login/register with JWT tokens
- 📊 **Dashboard** - Real-time metrics and quick stats
- ✅ **Tasks** - Create, assign, and track tasks
- 🌡️ **Temperatures** - Monitor equipment temperatures and alerts
- 📦 **Inventory** - Track stock levels, log waste, variance analysis
- 📅 **Schedules** - Employee scheduling with clock in/out
- 📍 **Locations** - Multi-location management with scorecards
- 📈 **Analytics** - Charts, reports, and AI-driven alerts
- 💰 **Invoices** - Digital capture and approval workflow

## Tech Stack

- React 18 + Vite
- React Router v6
- Tailwind CSS
- Axios
- Lucide React (icons)
- Recharts (charts)
- date-fns

## Environment Setup

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

## Project Structure

```
src/
├── components/      # Layout, Navbar, Sidebar, PrivateRoute
├── context/         # AuthContext
├── pages/           # All page components
├── services/        # API services
├── utils/           # API client with interceptors
└── App.jsx          # Main app with routing
```

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## API Integration

All API calls go through services that use the configured `VITE_API_URL`. The app automatically handles:
- JWT token management
- Token refresh on expiration
- Request/response interceptors

## Deployment

Deploy to Vercel, Netlify, or any static hosting:

```bash
npm run build
# Deploy the dist/ folder
```
