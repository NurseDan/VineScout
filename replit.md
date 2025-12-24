# Amazon Vine Inventory Management System

## Overview
A comprehensive inventory management system for Amazon Vine reviewers, designed to run on a Raspberry Pi. The app helps track items from order through review completion, manage physical storage, and generate labels.

## Current State
- **MVP Complete**: Core functionality implemented and tested
- **Status**: All pages functional with in-memory storage

## Key Features
1. **Dashboard** - Overview stats, pending reviews, quick actions
2. **CSV Upload** - Import Vine order data from Amazon exports
3. **Inventory Management** - Full CRUD with search/filter
4. **Barcode Scanner** - USB scanner support via text input (scanners act as keyboards)
5. **Storage Manager** - Configure physical shelving, intelligent placement algorithm
6. **Label Generator** - Create Dymo-compatible labels with print preview

## Tech Stack
- **Frontend**: React 18, Vite, TanStack Query, wouter, shadcn/ui, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Storage**: In-memory (MemStorage) - ready for PostgreSQL migration
- **Styling**: Material Design-inspired, touch-friendly for Raspberry Pi

## Project Structure
```
├── client/src/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── app-sidebar.tsx  # Navigation sidebar
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── pages/
│   │   ├── dashboard.tsx    # Main dashboard
│   │   ├── upload.tsx       # CSV import
│   │   ├── inventory.tsx    # Item list/details
│   │   ├── scan.tsx         # Barcode scanning
│   │   ├── storage.tsx      # Storage management
│   │   └── labels.tsx       # Label generation
│   └── App.tsx              # Main app with routing
├── server/
│   ├── routes.ts            # API endpoints
│   ├── storage.ts           # Storage interface (MemStorage)
│   └── index.ts             # Express server
└── shared/
    └── schema.ts            # Data models & types
```

## API Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/items` - All vine items
- `POST /api/items` - Create single item
- `POST /api/items/bulk` - Bulk import from CSV
- `PATCH /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `POST /api/items/:id/receive` - Mark item received (starts review clock)
- `POST /api/scan` - Scan ASIN and lookup item
- `GET /api/scans/recent` - Recent scan logs
- `GET /api/storage/units` - All storage units
- `POST /api/storage/units` - Create storage unit
- `DELETE /api/storage/units/:id` - Delete storage unit
- `POST /api/storage/find-placement` - Find optimal storage slot
- `GET /api/uploads` - Upload history

## Data Models
- **VineItem**: ASIN, description, tax value, dates (order/received/review due/sellable), status, storage location
- **StorageUnit**: Name, dimensions (W x H x D), shelves count, utilization %
- **StorageSlot**: Individual shelf positions within units
- **ScanLog**: Scan history with timestamps and actions
- **UploadRecord**: CSV import history

## Item Lifecycle
1. **Ordered** - Initial state from CSV import
2. **Shipped** - Tracking number added (optional)
3. **Received** - Scanned/marked, starts review clock
4. **Reviewing** - Within review period (7-14 days)
5. **Reviewed** - Review completed
6. **Sellable** - 6 months after received date

## User Preferences
- Touch-friendly UI design for Raspberry Pi
- Dark/light mode support
- Inter font (primary), JetBrains Mono (data/numbers)
- Material Design-inspired components

## Future Enhancements (Post-MVP)
- Gmail API integration for auto-importing orders
- Camera-based package measurement
- Direct Dymo label printer integration
- PDF parsing support
- PostgreSQL persistence

## Development
```bash
npm run dev    # Start development server
npm run build  # Build for production
```

Server runs on port 5000 (both frontend and API).
