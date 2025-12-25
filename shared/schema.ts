import { pgTable, text, varchar, integer, real, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Re-export auth models
export * from "./models/auth";

// Re-export chat models for AI assistant
export * from "./models/chat";

// Vine Items - Core product tracking (with userId for multi-tenant support)
export const vineItems = pgTable("vine_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  asin: varchar("asin", { length: 20 }).notNull(),
  description: text("description").notNull(),
  taxValue: real("tax_value").default(0),
  orderDate: timestamp("order_date"),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  receivedDate: timestamp("received_date"),
  reviewDueDate: timestamp("review_due_date"),
  reviewCompletedDate: timestamp("review_completed_date"),
  sellableDate: timestamp("sellable_date"),
  status: varchar("status", { length: 20 }).notNull().default("ordered"),
  storageLocation: varchar("storage_location", { length: 50 }),
  imageUrl: text("image_url"),
  notes: text("notes"),
  // Item dimensions for storage matching
  lengthIn: real("length_in"),
  widthIn: real("width_in"),
  heightIn: real("height_in"),
  weightLb: real("weight_lb"),
}, (table) => [
  index("vine_items_user_id_idx").on(table.userId),
  index("vine_items_asin_idx").on(table.asin),
]);

export const insertVineItemSchema = createInsertSchema(vineItems).omit({ id: true });
export type InsertVineItem = z.infer<typeof insertVineItemSchema>;
export type VineItem = typeof vineItems.$inferSelect;

// Storage Locations - Parent entity for organizing storage (home, garage, off-site)
export const storageLocations = pgTable("storage_locations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  locationType: varchar("location_type", { length: 20 }).notNull().default("home"),
  facilityName: varchar("facility_name", { length: 200 }),
  address: text("address"),
  unitNumber: varchar("unit_number", { length: 50 }),
  accessHours: varchar("access_hours", { length: 100 }),
  monthlyCost: real("monthly_cost"),
  room: varchar("room", { length: 100 }),
  notes: text("notes"),
}, (table) => [
  index("storage_locations_user_id_idx").on(table.userId),
  index("storage_locations_type_idx").on(table.locationType),
]);

export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({ id: true });
export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;
export type StorageLocation = typeof storageLocations.$inferSelect;

// Storage location types
export const LOCATION_TYPES = {
  HOME: "home",
  GARAGE: "garage",
  OFF_SITE: "off_site",
} as const;

export type LocationType = typeof LOCATION_TYPES[keyof typeof LOCATION_TYPES];

// Storage Units - Physical storage space configuration (with userId and locationId)
export const storageUnits = pgTable("storage_units", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  locationId: varchar("location_id", { length: 36 }),
  name: varchar("name", { length: 100 }).notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  depth: real("depth").notNull(),
  shelves: integer("shelves").default(1),
  usedCapacity: real("used_capacity").default(0),
}, (table) => [
  index("storage_units_user_id_idx").on(table.userId),
  index("storage_units_location_id_idx").on(table.locationId),
]);

export const insertStorageUnitSchema = createInsertSchema(storageUnits).omit({ id: true });
export type InsertStorageUnit = z.infer<typeof insertStorageUnitSchema>;
export type StorageUnit = typeof storageUnits.$inferSelect;

// Storage Slots - Individual positions within storage units
export const storageSlots = pgTable("storage_slots", {
  id: varchar("id", { length: 36 }).primaryKey(),
  unitId: varchar("unit_id", { length: 36 }).notNull(),
  slotCode: varchar("slot_code", { length: 20 }).notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  depth: real("depth").notNull(),
  isOccupied: boolean("is_occupied").default(false),
  itemId: varchar("item_id", { length: 36 }),
});

export const insertStorageSlotSchema = createInsertSchema(storageSlots).omit({ id: true });
export type InsertStorageSlot = z.infer<typeof insertStorageSlotSchema>;
export type StorageSlot = typeof storageSlots.$inferSelect;

// Scan Logs - Track barcode scans (with userId)
export const scanLogs = pgTable("scan_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  asin: varchar("asin", { length: 20 }).notNull(),
  scannedAt: timestamp("scanned_at").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  itemId: varchar("item_id", { length: 36 }),
}, (table) => [
  index("scan_logs_user_id_idx").on(table.userId),
]);

export const insertScanLogSchema = createInsertSchema(scanLogs).omit({ id: true });
export type InsertScanLog = z.infer<typeof insertScanLogSchema>;
export type ScanLog = typeof scanLogs.$inferSelect;

// CSV Upload Records - Track file uploads (with userId)
export const uploadRecords = pgTable("upload_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  uploadedAt: timestamp("uploaded_at").notNull(),
  itemsImported: integer("items_imported").default(0),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
}, (table) => [
  index("upload_records_user_id_idx").on(table.userId),
]);

export const insertUploadRecordSchema = createInsertSchema(uploadRecords).omit({ id: true });
export type InsertUploadRecord = z.infer<typeof insertUploadRecordSchema>;
export type UploadRecord = typeof uploadRecords.$inferSelect;

// Relations
export const storageLocationsRelations = relations(storageLocations, ({ many }) => ({
  units: many(storageUnits),
}));

export const storageUnitsRelations = relations(storageUnits, ({ one, many }) => ({
  location: one(storageLocations, {
    fields: [storageUnits.locationId],
    references: [storageLocations.id],
  }),
  slots: many(storageSlots),
}));

export const storageSlotsRelations = relations(storageSlots, ({ one }) => ({
  unit: one(storageUnits, {
    fields: [storageSlots.unitId],
    references: [storageUnits.id],
  }),
}));

// Extended storage unit type with location details
export type StorageUnitWithLocation = StorageUnit & {
  location: StorageLocation | null;
};

// Item status enum values
export const ITEM_STATUSES = {
  ORDERED: "ordered",
  SHIPPED: "shipped", 
  RECEIVED: "received",
  REVIEWING: "reviewing",
  REVIEWED: "reviewed",
  SELLABLE: "sellable",
} as const;

export type ItemStatus = typeof ITEM_STATUSES[keyof typeof ITEM_STATUSES];

// Label data type for printing
export type LabelData = {
  asin: string;
  description: string;
  orderDate: string;
  receivedDate: string;
  sellableDate: string;
  storageLocation: string;
  qrCode?: string;
};

// Dashboard stats type
export type DashboardStats = {
  totalItems: number;
  pendingReviews: number;
  receivedThisWeek: number;
  storageUtilization: number;
  upcomingReviewDeadlines: VineItem[];
  recentActivity: ScanLog[];
};

// Analytics types
export type AnalyticsData = {
  totalItemValue: number;
  reviewsCompleted: number;
  reviewsThisMonth: number;
  averageReviewTime: number;
  itemsByStatus: { status: string; count: number }[];
  itemsByMonth: { month: string; count: number; value: number }[];
  reviewTrend: { month: string; completed: number; pending: number }[];
};

// API Connections - Third-party service integrations (with userId)
export const apiConnections = pgTable("api_connections", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  apiKey: text("api_key"),
  isActive: boolean("is_active").default(true),
  lastTested: timestamp("last_tested"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("api_connections_user_id_idx").on(table.userId),
]);

export const insertApiConnectionSchema = createInsertSchema(apiConnections).omit({ id: true, createdAt: true });
export type InsertApiConnection = z.infer<typeof insertApiConnectionSchema>;
export type ApiConnection = typeof apiConnections.$inferSelect;

// API Connection providers
export const API_PROVIDERS = {
  KEEPA: "keepa",
  RAINFOREST: "rainforest",
  GMAIL: "gmail",
} as const;

export type ApiProvider = typeof API_PROVIDERS[keyof typeof API_PROVIDERS];

// Marketplace Listings - For selling aged inventory items
export const marketplaceListings = pgTable("marketplace_listings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  itemId: varchar("item_id", { length: 36 }).notNull(),
  askingPrice: real("asking_price").notNull(),
  description: text("description"),
  condition: varchar("condition", { length: 20 }).notNull().default("new"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  soldAt: timestamp("sold_at"),
}, (table) => [
  index("marketplace_listings_user_id_idx").on(table.userId),
  index("marketplace_listings_status_idx").on(table.status),
]);

export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({ id: true, createdAt: true });
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;

// Marketplace listing statuses
export const LISTING_STATUSES = {
  ACTIVE: "active",
  SOLD: "sold",
  CANCELLED: "cancelled",
} as const;

export type ListingStatus = typeof LISTING_STATUSES[keyof typeof LISTING_STATUSES];

// Extended marketplace listing type with item details
export type MarketplaceListingWithItem = MarketplaceListing & {
  item: VineItem;
};

// Tax Profiles - User tax settings for quarterly payments
export const taxProfiles = pgTable("tax_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  filingStatus: varchar("filing_status", { length: 30 }).notNull().default("single"),
  state: varchar("state", { length: 2 }),
  estimatedTaxRate: real("estimated_tax_rate").default(25),
  selfEmploymentTaxRate: real("self_employment_tax_rate").default(15.3),
  includeStateTax: boolean("include_state_tax").default(false),
  stateTaxRate: real("state_tax_rate").default(5),
  reminderEnabled: boolean("reminder_enabled").default(true),
  businessName: varchar("business_name", { length: 200 }),
  businessAddress: text("business_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("tax_profiles_user_id_idx").on(table.userId),
]);

export const insertTaxProfileSchema = createInsertSchema(taxProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxProfile = z.infer<typeof insertTaxProfileSchema>;
export type TaxProfile = typeof taxProfiles.$inferSelect;

// Filing status options
export const FILING_STATUSES = {
  SINGLE: "single",
  MARRIED_JOINT: "married_joint",
  MARRIED_SEPARATE: "married_separate",
  HEAD_OF_HOUSEHOLD: "head_of_household",
  QUALIFYING_WIDOW: "qualifying_widow",
} as const;

export type FilingStatus = typeof FILING_STATUSES[keyof typeof FILING_STATUSES];

// Quarterly tax estimate type
export type QuarterlyTaxEstimate = {
  quarter: number;
  year: number;
  dueDate: string;
  totalIncome: number;
  federalTax: number;
  selfEmploymentTax: number;
  stateTax: number;
  totalTax: number;
  itemCount: number;
  isPaid: boolean;
};

// Tax summary type
export type TaxSummary = {
  yearToDate: {
    totalIncome: number;
    federalTax: number;
    selfEmploymentTax: number;
    stateTax: number;
    totalTax: number;
    itemCount: number;
  };
  quarters: QuarterlyTaxEstimate[];
  nextPaymentDue: QuarterlyTaxEstimate | null;
};

// Waitlist Signups - Capture interest before launch
export const waitlistSignups = pgTable("waitlist_signups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  interestedFeatures: text("interested_features"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("waitlist_email_idx").on(table.email),
  index("waitlist_platform_idx").on(table.platform),
]);

export const insertWaitlistSignupSchema = createInsertSchema(waitlistSignups).omit({ id: true, createdAt: true });
export type InsertWaitlistSignup = z.infer<typeof insertWaitlistSignupSchema>;
export type WaitlistSignup = typeof waitlistSignups.$inferSelect;

// Platform options for waitlist
export const PLATFORMS = {
  AMAZON_VINE: "amazon_vine",
  AMAZON_INFLUENCER: "amazon_influencer",
  TIKTOK_SHOP: "tiktok_shop",
  YOUTUBE: "youtube",
  INSTAGRAM: "instagram",
  OTHER: "other",
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];
