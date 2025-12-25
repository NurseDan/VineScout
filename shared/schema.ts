import { pgTable, text, varchar, integer, real, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Re-export auth models
export * from "./models/auth";

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
}, (table) => [
  index("vine_items_user_id_idx").on(table.userId),
  index("vine_items_asin_idx").on(table.asin),
]);

export const insertVineItemSchema = createInsertSchema(vineItems).omit({ id: true });
export type InsertVineItem = z.infer<typeof insertVineItemSchema>;
export type VineItem = typeof vineItems.$inferSelect;

// Storage Units - Physical storage space configuration (with userId)
export const storageUnits = pgTable("storage_units", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  depth: real("depth").notNull(),
  shelves: integer("shelves").default(1),
  usedCapacity: real("used_capacity").default(0),
}, (table) => [
  index("storage_units_user_id_idx").on(table.userId),
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
export const storageUnitsRelations = relations(storageUnits, ({ many }) => ({
  slots: many(storageSlots),
}));

export const storageSlotsRelations = relations(storageSlots, ({ one }) => ({
  unit: one(storageUnits, {
    fields: [storageSlots.unitId],
    references: [storageUnits.id],
  }),
}));

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
