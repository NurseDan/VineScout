# Amazon Vine Inventory Management System

## Overview
A comprehensive, production-ready inventory management system for Amazon Vine reviewers. The app helps track items from order through review completion, manage physical storage, generate labels, provides analytics, and includes a marketplace for selling aged items.

## Current State
- **Production Ready**: Full database persistence with PostgreSQL
- **Authentication**: Secure user authentication via Replit Auth (supports Google, GitHub, email)
- **Multi-tenant**: Each user has their own isolated data
- **Payments**: Stripe integration for membership subscriptions
- **AI Features**: OpenAI-powered inventory assistant (premium feature)
- **Status**: All features implemented and tested

## Key Features
1. **Dashboard** - Overview stats, pending reviews, quick actions
2. **CSV Upload** - Import Vine order data from Amazon exports
3. **Inventory Management** - Full CRUD with search/filter
4. **Barcode Scanner** - USB scanner support via text input
5. **Storage Manager** - Multi-location storage with home, garage, and off-site facility support
6. **Label Generator** - Create Dymo-compatible labels with print preview
7. **Analytics** - Charts for review trends, item values, and status distribution
8. **Data Export** - Export inventory to CSV or JSON
9. **API Connections** - Connect third-party ASIN data APIs (Keepa, Rainforest)
10. **Gmail Import** - Import Vine orders directly from Amazon email notifications
11. **Membership Plans** - Free, Pro ($9.99/mo), Business ($29.99/mo) tiers via Stripe
12. **AI Assistant** - AI-powered inventory analysis, storage suggestions, price predictions (premium)
13. **Marketplace** - Sell aged inventory items (6+ months old) to other users (premium)
14. **Admin Dashboard** - System oversight and user management for administrators

## Tech Stack
- **Frontend**: React 18, Vite, TanStack Query, wouter, shadcn/ui, Tailwind CSS, Recharts
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon-backed)
- **Authentication**: Replit Auth (OpenID Connect)
- **Payments**: Stripe (subscriptions, customer portal)
- **AI**: OpenAI via Replit AI Integrations
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
│   │   ├── connections.tsx  # API connections
│   │   ├── membership.tsx   # Subscription plans
│   │   ├── ai-assistant.tsx # AI inventory assistant
│   │   ├── marketplace.tsx  # Item marketplace
│   │   ├── admin.tsx        # Admin dashboard
│   │   └── landing.tsx      # Public landing page
│   └── App.tsx              # Main app with auth flow
├── server/
│   ├── db.ts                # Database connection
│   ├── routes.ts            # Protected API endpoints
│   ├── storage.ts           # DatabaseStorage implementation
│   ├── stripeClient.ts      # Stripe integration
│   ├── stripeService.ts     # Stripe API operations
│   ├── webhookHandlers.ts   # Stripe webhook processing
│   ├── ai-assistant.ts      # OpenAI-powered assistant
│   ├── gmail.ts             # Gmail integration
│   ├── replit_integrations/ # Auth & AI integrations
│   └── index.ts             # Express server
└── shared/
    ├── schema.ts            # Data models & types
    └── models/
        ├── auth.ts          # User/Session models
        └── chat.ts          # Chat models (for AI)
```

## API Endpoints

### Core Endpoints (Protected)
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
- `GET /api/storage/locations` - All storage locations
- `GET /api/storage/locations/:id` - Get storage location
- `POST /api/storage/locations` - Create storage location
- `PATCH /api/storage/locations/:id` - Update storage location
- `DELETE /api/storage/locations/:id` - Delete storage location
- `GET /api/storage/units` - All storage units (with location data)
- `POST /api/storage/units` - Create storage unit
- `PATCH /api/storage/units/:id` - Update storage unit
- `DELETE /api/storage/units/:id` - Delete storage unit
- `POST /api/storage/find-placement` - Find optimal storage slot
- `GET /api/uploads` - Upload history
- `GET /api/export/items` - Export inventory (CSV/JSON)

### API Connections
- `GET /api/connections` - User's API connections
- `POST /api/connections` - Create API connection
- `PATCH /api/connections/:id` - Update API connection
- `DELETE /api/connections/:id` - Delete API connection
- `POST /api/connections/:id/test` - Test API connection

### Gmail (Currently disabled - requires per-user OAuth)
- `GET /api/gmail/status` - Check Gmail connection status
- `GET /api/gmail/search` - Search Vine emails
- `POST /api/gmail/import` - Import items from emails

### Stripe/Membership
- `GET /api/stripe/publishable-key` - Get Stripe publishable key
- `GET /api/subscription` - Get user's subscription status
- `POST /api/checkout` - Create checkout session
- `GET /api/products` - List subscription products
- `POST /api/billing-portal` - Create customer portal session
- `POST /api/stripe/webhook` - Stripe webhook handler

### AI Assistant (Premium Only)
- `POST /api/ai/analyze` - Analyze inventory with AI
- `POST /api/ai/suggest-storage` - Get AI storage suggestions
- `POST /api/ai/review-reminder` - Generate review reminder
- `POST /api/ai/sell-price` - Get AI price suggestion

### Marketplace
- `GET /api/marketplace` - Browse all active listings (public)
- `GET /api/marketplace/my-listings` - User's listings (protected)
- `POST /api/marketplace` - Create listing (premium only)
- `PATCH /api/marketplace/:id` - Update listing
- `DELETE /api/marketplace/:id` - Delete listing
- `POST /api/marketplace/:id/sold` - Mark as sold

### Admin (Admin Only)
- `GET /api/auth/user/is-admin` - Check if user is admin
- `GET /api/admin/stats` - System-wide statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id` - Update user

## Authentication Routes
- `GET /api/login` - Start login flow
- `GET /api/logout` - Logout user
- `GET /api/callback` - OAuth callback

## Data Models
- **User**: Replit Auth user (id, email, name, profile image, stripeCustomerId, stripeSubscriptionId)
- **VineItem**: ASIN, description, tax value, dates, status, storage location (user-scoped)
- **StorageLocation**: Parent entity for storage (home, garage, off_site) with facility-specific metadata (user-scoped)
- **StorageUnit**: Name, dimensions, shelves, utilization, linked to location (user-scoped)
- **StorageSlot**: Individual shelf positions within units
- **ScanLog**: Scan history with timestamps (user-scoped)
- **UploadRecord**: CSV import history (user-scoped)
- **ApiConnection**: Third-party API connections (user-scoped)
- **MarketplaceListing**: Items for sale with price, condition, status (user-scoped)

## Membership Tiers
- **Free**: Basic inventory tracking, limited features
- **Pro ($9.99/mo)**: Advanced analytics, AI assistant, unlimited storage
- **Business ($29.99/mo)**: All features, marketplace access, API integrations, priority support

## Item Lifecycle
1. **Ordered** - Initial state from CSV import
2. **Shipped** - Tracking number added (optional)
3. **Received** - Scanned/marked, starts review clock
4. **Reviewing** - Within review period (7-14 days)
5. **Reviewed** - Review completed
6. **Sellable** - 6 months after received date (can list on marketplace)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_USER_IDS` - Comma-separated list of admin user IDs
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (via Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (via Replit AI Integrations)
- Stripe credentials managed via Replit Stripe connector

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
- Added Gmail integration (disabled pending per-user OAuth)
- Added Stripe integration with membership tiers (Free/Pro/Business)
- Added AI Inventory Assistant (premium feature)
- Added Marketplace for selling aged items (premium feature)
- Added Admin Dashboard for system oversight
- Enhanced storage management with location hierarchy (home, garage, off-site facilities)
