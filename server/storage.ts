import {
  type VineItem,
  type InsertVineItem,
  type StorageUnit,
  type InsertStorageUnit,
  type StorageSlot,
  type InsertStorageSlot,
  type ScanLog,
  type InsertScanLog,
  type UploadRecord,
  type InsertUploadRecord,
  type User,
  type InsertUser,
  type DashboardStats,
  ITEM_STATUSES,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { addDays, addMonths, subDays, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Vine Items
  getAllItems(): Promise<VineItem[]>;
  getItemById(id: string): Promise<VineItem | undefined>;
  getItemByAsin(asin: string): Promise<VineItem | undefined>;
  createItem(item: InsertVineItem): Promise<VineItem>;
  createItemsBulk(items: InsertVineItem[]): Promise<VineItem[]>;
  updateItem(id: string, updates: Partial<VineItem>): Promise<VineItem | undefined>;
  deleteItem(id: string): Promise<boolean>;
  markItemReceived(id: string): Promise<VineItem | undefined>;

  // Storage Units
  getAllStorageUnits(): Promise<StorageUnit[]>;
  getStorageUnitById(id: string): Promise<StorageUnit | undefined>;
  createStorageUnit(unit: InsertStorageUnit): Promise<StorageUnit>;
  updateStorageUnit(id: string, updates: Partial<StorageUnit>): Promise<StorageUnit | undefined>;
  deleteStorageUnit(id: string): Promise<boolean>;

  // Scan Logs
  getRecentScans(limit?: number): Promise<ScanLog[]>;
  createScanLog(log: InsertScanLog): Promise<ScanLog>;

  // Upload Records
  getAllUploadRecords(): Promise<UploadRecord[]>;
  createUploadRecord(record: InsertUploadRecord): Promise<UploadRecord>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Storage Placement
  findOptimalPlacement(
    asin: string,
    width: number,
    height: number,
    depth: number
  ): Promise<{ unit: string; slot: string; item: VineItem } | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private items: Map<string, VineItem>;
  private storageUnits: Map<string, StorageUnit>;
  private storageSlots: Map<string, StorageSlot>;
  private scanLogs: Map<string, ScanLog>;
  private uploadRecords: Map<string, UploadRecord>;

  constructor() {
    this.users = new Map();
    this.items = new Map();
    this.storageUnits = new Map();
    this.storageSlots = new Map();
    this.scanLogs = new Map();
    this.uploadRecords = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Vine Items
  async getAllItems(): Promise<VineItem[]> {
    return Array.from(this.items.values()).sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getItemById(id: string): Promise<VineItem | undefined> {
    return this.items.get(id);
  }

  async getItemByAsin(asin: string): Promise<VineItem | undefined> {
    return Array.from(this.items.values()).find(
      (item) => item.asin.toUpperCase() === asin.toUpperCase()
    );
  }

  async createItem(insertItem: InsertVineItem): Promise<VineItem> {
    const id = randomUUID();
    const item: VineItem = {
      id,
      asin: insertItem.asin,
      description: insertItem.description,
      taxValue: insertItem.taxValue ?? 0,
      orderDate: insertItem.orderDate ?? null,
      trackingNumber: insertItem.trackingNumber ?? null,
      receivedDate: insertItem.receivedDate ?? null,
      reviewDueDate: insertItem.reviewDueDate ?? null,
      reviewCompletedDate: insertItem.reviewCompletedDate ?? null,
      sellableDate: insertItem.sellableDate ?? null,
      status: insertItem.status ?? ITEM_STATUSES.ORDERED,
      storageLocation: insertItem.storageLocation ?? null,
      imageUrl: insertItem.imageUrl ?? null,
      notes: insertItem.notes ?? null,
    };
    this.items.set(id, item);
    return item;
  }

  async createItemsBulk(insertItems: InsertVineItem[]): Promise<VineItem[]> {
    const createdItems: VineItem[] = [];
    for (const insertItem of insertItems) {
      const item = await this.createItem(insertItem);
      createdItems.push(item);
    }
    return createdItems;
  }

  async updateItem(id: string, updates: Partial<VineItem>): Promise<VineItem | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;

    const updatedItem: VineItem = { ...item, ...updates, id };
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async markItemReceived(id: string): Promise<VineItem | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;

    const now = new Date();
    const reviewDueDate = addDays(now, 14); // 14 days to review
    const sellableDate = addMonths(now, 6); // 6 months until sellable

    const updatedItem: VineItem = {
      ...item,
      receivedDate: now,
      reviewDueDate,
      sellableDate,
      status: ITEM_STATUSES.RECEIVED,
    };

    this.items.set(id, updatedItem);
    return updatedItem;
  }

  // Storage Units
  async getAllStorageUnits(): Promise<StorageUnit[]> {
    return Array.from(this.storageUnits.values());
  }

  async getStorageUnitById(id: string): Promise<StorageUnit | undefined> {
    return this.storageUnits.get(id);
  }

  async createStorageUnit(insertUnit: InsertStorageUnit): Promise<StorageUnit> {
    const id = randomUUID();
    const unit: StorageUnit = {
      id,
      name: insertUnit.name,
      width: insertUnit.width,
      height: insertUnit.height,
      depth: insertUnit.depth,
      shelves: insertUnit.shelves ?? 1,
      usedCapacity: insertUnit.usedCapacity ?? 0,
    };
    this.storageUnits.set(id, unit);

    // Create slots for each shelf
    for (let i = 1; i <= (unit.shelves || 1); i++) {
      const slotId = randomUUID();
      const slot: StorageSlot = {
        id: slotId,
        unitId: id,
        slotCode: `S${i}`,
        width: unit.width,
        height: unit.height / (unit.shelves || 1),
        depth: unit.depth,
        isOccupied: false,
        itemId: null,
      };
      this.storageSlots.set(slotId, slot);
    }

    return unit;
  }

  async updateStorageUnit(
    id: string,
    updates: Partial<StorageUnit>
  ): Promise<StorageUnit | undefined> {
    const unit = this.storageUnits.get(id);
    if (!unit) return undefined;

    const updatedUnit: StorageUnit = { ...unit, ...updates, id };
    this.storageUnits.set(id, updatedUnit);
    return updatedUnit;
  }

  async deleteStorageUnit(id: string): Promise<boolean> {
    // Also delete associated slots
    const slotsToDelete = Array.from(this.storageSlots.values())
      .filter((slot) => slot.unitId === id)
      .map((slot) => slot.id);

    for (const slotId of slotsToDelete) {
      this.storageSlots.delete(slotId);
    }

    return this.storageUnits.delete(id);
  }

  // Scan Logs
  async getRecentScans(limit: number = 20): Promise<ScanLog[]> {
    return Array.from(this.scanLogs.values())
      .sort((a, b) => {
        const dateA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
        const dateB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async createScanLog(insertLog: InsertScanLog): Promise<ScanLog> {
    const id = randomUUID();
    const log: ScanLog = {
      id,
      asin: insertLog.asin,
      scannedAt: insertLog.scannedAt,
      action: insertLog.action,
      itemId: insertLog.itemId ?? null,
    };
    this.scanLogs.set(id, log);
    return log;
  }

  // Upload Records
  async getAllUploadRecords(): Promise<UploadRecord[]> {
    return Array.from(this.uploadRecords.values()).sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createUploadRecord(insertRecord: InsertUploadRecord): Promise<UploadRecord> {
    const id = randomUUID();
    const record: UploadRecord = {
      id,
      filename: insertRecord.filename,
      uploadedAt: insertRecord.uploadedAt,
      itemsImported: insertRecord.itemsImported ?? 0,
      status: insertRecord.status ?? "completed",
    };
    this.uploadRecords.set(id, record);
    return record;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const allItems = Array.from(this.items.values());
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    // Items with pending reviews (received but not reviewed)
    const pendingReviews = allItems.filter(
      (item) =>
        item.status === ITEM_STATUSES.RECEIVED ||
        item.status === ITEM_STATUSES.REVIEWING
    ).length;

    // Items received this week
    const receivedThisWeek = allItems.filter((item) => {
      if (!item.receivedDate) return false;
      const receivedDate = new Date(item.receivedDate);
      return isWithinInterval(receivedDate, { start: weekStart, end: weekEnd });
    }).length;

    // Storage utilization
    const storageUnits = Array.from(this.storageUnits.values());
    const storageUtilization =
      storageUnits.length > 0
        ? storageUnits.reduce((sum, u) => sum + (u.usedCapacity || 0), 0) /
          storageUnits.length
        : 0;

    // Upcoming review deadlines (next 7 days)
    const upcomingDeadlines = allItems
      .filter((item) => {
        if (!item.reviewDueDate) return false;
        if (item.status === ITEM_STATUSES.REVIEWED || item.status === ITEM_STATUSES.SELLABLE)
          return false;
        const dueDate = new Date(item.reviewDueDate);
        const in7Days = addDays(now, 7);
        return dueDate <= in7Days;
      })
      .sort((a, b) => {
        const dateA = a.reviewDueDate ? new Date(a.reviewDueDate).getTime() : 0;
        const dateB = b.reviewDueDate ? new Date(b.reviewDueDate).getTime() : 0;
        return dateA - dateB;
      });

    // Recent activity (scan logs)
    const recentActivity = await this.getRecentScans(10);

    return {
      totalItems: allItems.length,
      pendingReviews,
      receivedThisWeek,
      storageUtilization,
      upcomingReviewDeadlines: upcomingDeadlines,
      recentActivity,
    };
  }

  // Storage Placement
  async findOptimalPlacement(
    asin: string,
    width: number,
    height: number,
    depth: number
  ): Promise<{ unit: string; slot: string; item: VineItem } | null> {
    const item = await this.getItemByAsin(asin);
    if (!item) return null;

    const units = Array.from(this.storageUnits.values());
    const slots = Array.from(this.storageSlots.values());

    // Find available slots that can fit the package
    for (const unit of units) {
      const unitSlots = slots.filter(
        (slot) => slot.unitId === unit.id && !slot.isOccupied
      );

      for (const slot of unitSlots) {
        // Check if package fits (with some tolerance)
        if (
          width <= slot.width * 0.9 &&
          height <= slot.height * 0.9 &&
          depth <= slot.depth * 0.9
        ) {
          return {
            unit: unit.name,
            slot: slot.slotCode,
            item,
          };
        }
      }
    }

    // If no exact fit, find any available slot in units that can accommodate
    for (const unit of units) {
      const unitSlots = slots.filter(
        (slot) => slot.unitId === unit.id && !slot.isOccupied
      );

      if (unitSlots.length > 0) {
        // Just return the first available slot
        return {
          unit: unit.name,
          slot: unitSlots[0].slotCode,
          item,
        };
      }
    }

    return null;
  }
}

export const storage = new MemStorage();
