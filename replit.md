# Amazon Vine Inventory Management System

## Overview
A comprehensive, production-ready inventory management system for Amazon Vine reviewers. The app helps track items from order through review completion, manage physical storage, generate labels, and provides analytics.

## Current State
- **Production Ready**: Full database persistence with PostgreSQL
- **Authentication**: Secure user authentication via Replit Auth (supports Google, GitHub, email)
- **Multi-tenant**: Each user has their own isolated data
- **Status**: All features implemented and tested

## Key Features
1. **Dashboard** - Overview stats, pending reviews, quick actions
2. **CSV Upload** - Import Vine order data from Amazon exports
3. **Inventory Management** - Full CRUD with search/filter
4. **Barcode Scanner** - USB scanner support via text input
5. **Storage Manager** - Configure physical shelving, intelligent placement algorithm
6. **Label Generator** - Create Dymo-compatible labels with print preview
7. **Analytics** - Charts for review trends, item values, and status distribution
8. **Data Export** - Export inventory to CSV or JSON
9. **API Connections** - Connect third-party ASIN data APIs (Keepa, Rainforest)
10. **Gmail Import** - Import Vine orders directly from Amazon email notifications

## Tech Stack
- **Frontend**: React 18, Vite, TanStack Query, wouter, shadcn/ui, Tailwind CSS, Recharts
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon-backed)
- **Authentication**: Replit Auth (OpenID Connect)
- **Styling**: Modern design with dark/light mode support

## Project Structure
```
├── client/src/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── app-sidebar.tsx  # Navigation sidebar
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── hooks/
│   │   └── use-auth.ts      # Authentication hook
│   ├── lib/
│   │   ├── queryClient.ts   # TanStack Query client
│   │   └── auth-utils.ts    # Auth utilities
│   ├── pages/
│   │   ├── dashboard.tsx    # Main dashboard
│   │   ├── upload.tsx       # CSV import
│   │   ├── inventory.tsx    # Item list/details
│   │   ├── scan.tsx         # Barcode scanning
│   │   ├── storage.tsx      # Storage management
│   │   ├── labels.tsx       # Label generation
│   │   ├── analytics.tsx    # Charts and reports
│   │   └── landing.tsx      # Public landing page
│   └── App.tsx              # Main app with auth flow
├── server/
│   ├── db.ts                # Database connection
│   ├── routes.ts            # Protected API endpoints
│   ├── storage.ts           # DatabaseStorage implementation
│   ├── replit_integrations/ # Auth integration
│   └── index.ts             # Express server
└── shared/
    ├── schema.ts            # Data models & types
    └── models/
        └── auth.ts          # User/Session models
```

## API Endpoints (All Protected)
- `GET /api/auth/user` - Current authenticated user
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/analytics` - Analytics data
- `GET /api/items` - All vine items
- `POST /api/items` - Create single item
- `POST /api/items/bulk` - Bulk import from CSV
- `PATCH /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `POST /api/items/:id/receive` - Mark item received
- `POST /api/scan` - Scan ASIN and lookup item
- `GET /api/scans/recent` - Recent scan logs
- `GET /api/storage/units` - All storage units
- `POST /api/storage/units` - Create storage unit
- `DELETE /api/storage/units/:id` - Delete storage unit
- `POST /api/storage/find-placement` - Find optimal storage slot
- `GET /api/uploads` - Upload history
- `GET /api/export/items` - Export inventory (CSV/JSON)
- `GET /api/connections` - User's API connections
- `POST /api/connections` - Create API connection
- `PATCH /api/connections/:id` - Update API connection
- `DELETE /api/connections/:id` - Delete API connection
- `POST /api/connections/:id/test` - Test API connection
- `GET /api/gmail/status` - Check Gmail connection status
- `GET /api/gmail/search` - Search Vine emails
- `POST /api/gmail/import` - Import items from emails

## Authentication Routes
- `GET /api/login` - Start login flow
- `GET /api/logout` - Logout user
- `GET /api/callback` - OAuth callback

## Data Models
- **User**: Replit Auth user (id, email, name, profile image)
- **VineItem**: ASIN, description, tax value, dates, status, storage location (user-scoped)
- **StorageUnit**: Name, dimensions, shelves, utilization (user-scoped)
- **StorageSlot**: Individual shelf positions within units
- **ScanLog**: Scan history with timestamps (user-scoped)
- **UploadRecord**: CSV import history (user-scoped)
- **ApiConnection**: Third-party API connections (Keepa, Rainforest, Gmail) (user-scoped)

## Item Lifecycle
1. **Ordered** - Initial state from CSV import
2. **Shipped** - Tracking number added (optional)
3. **Received** - Scanned/marked, starts review clock
4. **Reviewing** - Within review period (7-14 days)
5. **Reviewed** - Review completed
6. **Sellable** - 6 months after received date

## User Preferences
- Dark/light mode support
- Modern Inter font (primary), JetBrains Mono (data)
- Clean, accessible design

## Development
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run db:push  # Push schema changes to database
```

Server runs on port 5000 (both frontend and API).

## Recent Changes
- Added PostgreSQL database persistence
- Added Replit Auth for secure user authentication
- Added multi-tenant support (user data isolation)
- Added Analytics page with charts
- Added data export (CSV/JSON)
- Updated all API endpoints to be protected
- Added landing page for unauthenticated users
- Added API Connections page (Keepa, Rainforest API)
- Added Gmail integration for importing Vine orders from emails
