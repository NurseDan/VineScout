# Design Guidelines: Amazon Vine Inventory Management System

## Design Approach
**Selected Approach:** Design System - Material Design (Data-focused application)

**Justification:** This is a utility-focused inventory management tool requiring efficient data display, scanning workflows, and quick task completion. Material Design provides robust components for tables, forms, and data visualization while maintaining clarity on smaller displays.

**Key Principles:**
- Information hierarchy for quick scanning
- Task-oriented workflows with clear CTAs
- Responsive data tables and card layouts
- Touch-friendly targets for Raspberry Pi touchscreen use

## Typography
**Font Stack:** Google Fonts - Inter (primary) + JetBrains Mono (data/numbers)

**Hierarchy:**
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-medium
- Body Text: text-base font-normal
- Data Labels: text-sm font-medium uppercase tracking-wide
- Numerical Data: text-base font-mono (JetBrains Mono)
- Timestamps: text-xs text-gray-500

## Layout System
**Spacing Units:** Consistent use of 4, 6, 8, 12, and 16 (p-4, gap-6, m-8, py-12, px-16)

**Grid Structure:**
- Main dashboard: 12-column grid with sidebar
- Sidebar: Fixed 256px width (w-64)
- Content area: Flexible with max-w-7xl container
- Card layouts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for stats

## Core Components

### Navigation Sidebar (Left-aligned)
- Logo/app name at top (h-16)
- Main navigation items with icons and labels
- Active state with accent border-left indicator
- Sections: Dashboard, Upload Items, Email Sync, Inventory, Scan Item, Storage Manager, Reports

### Dashboard View
- Stats cards grid (3-4 columns on desktop): Pending Reviews, Items Received This Week, Storage Utilization %, Upcoming Review Deadlines
- Recent Activity timeline component
- Quick Actions panel with large buttons for Upload CSV, Scan Item, Measure Package

### Upload Interface
- Drag-and-drop zone with file type icons (CSV/PDF)
- Upload progress indicators
- Preview table of parsed data before confirmation
- Bulk action buttons (Accept All, Review Individual)

### Inventory Table
- Sortable/filterable data table with columns: ASIN, Description, Order Date, Received Date, Review Due, Storage Location, Status
- Inline action buttons (Edit, View Details, Generate Label)
- Status badges with visual indicators (Pending, Received, Reviewed, Available to Sell)
- Search bar with filter dropdowns above table
- Pagination controls at bottom

### Barcode Scanning Screen
- Large centered scanning area placeholder
- Real-time item match display immediately upon scan
- Quick action buttons: Mark Received, View Details, Print Label
- Recent scans list below main area

### Item Detail Modal/Page
- Two-column layout: Product info (left) + Timeline/Actions (right)
- Product image placeholder with gallery thumbnails
- Key data in definition list format
- Timeline showing: Ordered → Received → Review Due → Can Sell dates with visual progress indicator
- Action panel with buttons: Print Label, Mark Reviewed, Add to Sale Queue

### Storage Manager Interface
- Visual grid representation of storage units
- Package dimension input form with camera activation button
- Storage slot assignment algorithm results
- 3D visualization or top-down grid view of storage layout
- Highlighted recommended placement location

### Label Preview Component
- Print preview card showing: Item description (truncated), Order date, Received date, Sell-after date, Storage location code
- QR code placeholder for quick lookup
- Print button with printer selection

### Email Sync Dashboard
- Connection status indicator (Gmail integration)
- Auto-sync toggle and manual sync button
- Recent email matches list with confidence scores
- Pending approval queue for uncertain matches

## Component Specifications

**Cards:** Elevated with shadow-sm, rounded-lg, padding p-6, hover:shadow-md transition

**Buttons:**
- Primary: Large touch targets (h-12 min), font-medium, rounded-lg
- Secondary: Outlined variant with transparent background
- Icon buttons: Square (w-10 h-10) for actions

**Forms:**
- Input fields: h-12, rounded-md, border focus:ring-2
- Labels: text-sm font-medium mb-2
- Helper text: text-xs below inputs

**Tables:**
- Header: Sticky positioning, background-gray-50, font-medium text-sm uppercase
- Rows: Alternating background (stripe pattern), h-16 for touch accessibility
- Cell padding: px-6 py-4

**Badges:** Inline-flex, px-3 py-1, rounded-full, text-xs font-medium

**Progress Indicators:** Linear for uploads, Circular for scanning status, Stepped for review timeline

## Animations
Use sparingly - only for state feedback:
- Loading spinners for async operations
- Smooth transitions on scan success (scale + fade)
- Slide-in for modals and drawers

## Images
**No hero images required.** This is a dashboard application.

**Image Usage:**
- Product thumbnails in inventory table (64x64px)
- Larger product images in detail view (400x400px)
- Package/camera capture previews
- QR code placeholders for labels
- Empty state illustrations for "No items" scenarios

## Accessibility
- Keyboard navigation for all interactive elements
- Clear focus states (ring-2 ring-offset-2)
- High contrast text (minimum AA compliance)
- Large touch targets throughout (minimum 44x44px)
- Screen reader labels for icon-only buttons