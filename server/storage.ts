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
  type DashboardStats,
  type AnalyticsData,
  type ApiConnection,
  type InsertApiConnection,
  type User,
  ITEM_STATUSES,
  API_PROVIDERS,
  vineItems,
  storageUnits,
  storageSlots,
  scanLogs,
  uploadRecords,
  apiConnections,
  users,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface IStorage {
  // Vine Items
  getAllItems(userId: string): Promise<VineItem[]>;
  getItemById(userId: string, id: string): Promise<VineItem | undefined>;
  getItemByAsin(userId: string, asin: string): Promise<VineItem | undefined>;
  createItem(userId: string, item: Omit<InsertVineItem, 'userId'>): Promise<VineItem>;
  createItemsBulk(userId: string, items: Omit<InsertVineItem, 'userId'>[]): Promise<VineItem[]>;
  updateItem(userId: string, id: string, updates: Partial<VineItem>): Promise<VineItem | undefined>;
  deleteItem(userId: string, id: string): Promise<boolean>;
  markItemReceived(userId: string, id: string): Promise<VineItem | undefined>;

  // Storage Units
  getAllStorageUnits(userId: string): Promise<StorageUnit[]>;
  getStorageUnitById(userId: string, id: string): Promise<StorageUnit | undefined>;
  createStorageUnit(userId: string, unit: Omit<InsertStorageUnit, 'userId'>): Promise<StorageUnit>;
  updateStorageUnit(userId: string, id: string, updates: Partial<StorageUnit>): Promise<StorageUnit | undefined>;
  deleteStorageUnit(userId: string, id: string): Promise<boolean>;

  // Scan Logs
  getRecentScans(userId: string, limit?: number): Promise<ScanLog[]>;
  createScanLog(userId: string, log: Omit<InsertScanLog, 'userId'>): Promise<ScanLog>;

  // Upload Records
  getAllUploadRecords(userId: string): Promise<UploadRecord[]>;
  createUploadRecord(userId: string, record: Omit<InsertUploadRecord, 'userId'>): Promise<UploadRecord>;

  // Dashboard
  getDashboardStats(userId: string): Promise<DashboardStats>;

  // Analytics
  getAnalytics(userId: string): Promise<AnalyticsData>;

  // Storage Placement
  findOptimalPlacement(
    userId: string,
    asin: string,
    width: number,
    height: number,
    depth: number
  ): Promise<{ unit: string; slot: string; item: VineItem } | null>;

  // API Connections
  getApiConnections(userId: string): Promise<ApiConnection[]>;
  getApiConnectionByProvider(userId: string, provider: string): Promise<ApiConnection | undefined>;
  createApiConnection(userId: string, data: Omit<InsertApiConnection, 'userId'>): Promise<ApiConnection>;
  updateApiConnection(userId: string, id: string, updates: Partial<ApiConnection>): Promise<ApiConnection | undefined>;
  deleteApiConnection(userId: string, id: string): Promise<boolean>;
  testApiConnection(userId: string, id: string): Promise<{ success: boolean; message: string }>;

  // Stripe / User methods
  getUser(userId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined>;
  getStripeProduct(productId: string): Promise<any>;
  listStripeProducts(active?: boolean, limit?: number, offset?: number): Promise<any[]>;
  listStripeProductsWithPrices(active?: boolean, limit?: number, offset?: number): Promise<any[]>;
  getStripeSubscription(subscriptionId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Vine Items
  async getAllItems(userId: string): Promise<VineItem[]> {
    return await db
      .select()
      .from(vineItems)
      .where(eq(vineItems.userId, userId))
      .orderBy(desc(vineItems.orderDate));
  }

  async getItemById(userId: string, id: string): Promise<VineItem | undefined> {
    const [item] = await db
      .select()
      .from(vineItems)
      .where(and(eq(vineItems.id, id), eq(vineItems.userId, userId)));
    return item;
  }

  async getItemByAsin(userId: string, asin: string): Promise<VineItem | undefined> {
    const [item] = await db
      .select()
      .from(vineItems)
      .where(and(
        eq(vineItems.userId, userId),
        sql`UPPER(${vineItems.asin}) = UPPER(${asin})`
      ));
    return item;
  }

  async createItem(userId: string, insertItem: Omit<InsertVineItem, 'userId'>): Promise<VineItem> {
    const id = randomUUID();
    const [item] = await db
      .insert(vineItems)
      .values({
        id,
        userId,
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
      })
      .returning();
    return item;
  }

  async createItemsBulk(userId: string, insertItems: Omit<InsertVineItem, 'userId'>[]): Promise<VineItem[]> {
    if (insertItems.length === 0) return [];
    
    const values = insertItems.map(insertItem => ({
      id: randomUUID(),
      userId,
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
    }));

    const items = await db
      .insert(vineItems)
      .values(values)
      .returning();
    return items;
  }

  async updateItem(userId: string, id: string, updates: Partial<VineItem>): Promise<VineItem | undefined> {
    const { id: _, userId: __, ...safeUpdates } = updates;
    const [item] = await db
      .update(vineItems)
      .set(safeUpdates)
      .where(and(eq(vineItems.id, id), eq(vineItems.userId, userId)))
      .returning();
    return item;
  }

  async deleteItem(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(vineItems)
      .where(and(eq(vineItems.id, id), eq(vineItems.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async markItemReceived(userId: string, id: string): Promise<VineItem | undefined> {
    const now = new Date();
    const reviewDueDate = addDays(now, 14);
    const sellableDate = addMonths(now, 6);

    const [item] = await db
      .update(vineItems)
      .set({
        receivedDate: now,
        reviewDueDate,
        sellableDate,
        status: ITEM_STATUSES.RECEIVED,
      })
      .where(and(eq(vineItems.id, id), eq(vineItems.userId, userId)))
      .returning();
    return item;
  }

  // Storage Units
  async getAllStorageUnits(userId: string): Promise<StorageUnit[]> {
    return await db
      .select()
      .from(storageUnits)
      .where(eq(storageUnits.userId, userId));
  }

  async getStorageUnitById(userId: string, id: string): Promise<StorageUnit | undefined> {
    const [unit] = await db
      .select()
      .from(storageUnits)
      .where(and(eq(storageUnits.id, id), eq(storageUnits.userId, userId)));
    return unit;
  }

  async createStorageUnit(userId: string, insertUnit: Omit<InsertStorageUnit, 'userId'>): Promise<StorageUnit> {
    const id = randomUUID();
    const [unit] = await db
      .insert(storageUnits)
      .values({
        id,
        userId,
        name: insertUnit.name,
        width: insertUnit.width,
        height: insertUnit.height,
        depth: insertUnit.depth,
        shelves: insertUnit.shelves ?? 1,
        usedCapacity: insertUnit.usedCapacity ?? 0,
      })
      .returning();

    // Create slots for each shelf
    const slotValues = [];
    for (let i = 1; i <= (unit.shelves || 1); i++) {
      slotValues.push({
        id: randomUUID(),
        unitId: id,
        slotCode: `S${i}`,
        width: unit.width,
        height: unit.height / (unit.shelves || 1),
        depth: unit.depth,
        isOccupied: false,
        itemId: null,
      });
    }
    if (slotValues.length > 0) {
      await db.insert(storageSlots).values(slotValues);
    }

    return unit;
  }

  async updateStorageUnit(userId: string, id: string, updates: Partial<StorageUnit>): Promise<StorageUnit | undefined> {
    const { id: _, userId: __, ...safeUpdates } = updates;
    const [unit] = await db
      .update(storageUnits)
      .set(safeUpdates)
      .where(and(eq(storageUnits.id, id), eq(storageUnits.userId, userId)))
      .returning();
    return unit;
  }

  async deleteStorageUnit(userId: string, id: string): Promise<boolean> {
    // First delete associated slots
    await db
      .delete(storageSlots)
      .where(eq(storageSlots.unitId, id));

    const result = await db
      .delete(storageUnits)
      .where(and(eq(storageUnits.id, id), eq(storageUnits.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // Scan Logs
  async getRecentScans(userId: string, limit: number = 20): Promise<ScanLog[]> {
    return await db
      .select()
      .from(scanLogs)
      .where(eq(scanLogs.userId, userId))
      .orderBy(desc(scanLogs.scannedAt))
      .limit(limit);
  }

  async createScanLog(userId: string, insertLog: Omit<InsertScanLog, 'userId'>): Promise<ScanLog> {
    const id = randomUUID();
    const [log] = await db
      .insert(scanLogs)
      .values({
        id,
        userId,
        asin: insertLog.asin,
        scannedAt: insertLog.scannedAt,
        action: insertLog.action,
        itemId: insertLog.itemId ?? null,
      })
      .returning();
    return log;
  }

  // Upload Records
  async getAllUploadRecords(userId: string): Promise<UploadRecord[]> {
    return await db
      .select()
      .from(uploadRecords)
      .where(eq(uploadRecords.userId, userId))
      .orderBy(desc(uploadRecords.uploadedAt));
  }

  async createUploadRecord(userId: string, insertRecord: Omit<InsertUploadRecord, 'userId'>): Promise<UploadRecord> {
    const id = randomUUID();
    const [record] = await db
      .insert(uploadRecords)
      .values({
        id,
        userId,
        filename: insertRecord.filename,
        uploadedAt: insertRecord.uploadedAt,
        itemsImported: insertRecord.itemsImported ?? 0,
        status: insertRecord.status ?? "completed",
      })
      .returning();
    return record;
  }

  // Dashboard
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const allItems = await this.getAllItems(userId);
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const pendingReviews = allItems.filter(
      (item) =>
        item.status === ITEM_STATUSES.RECEIVED ||
        item.status === ITEM_STATUSES.REVIEWING
    ).length;

    const receivedThisWeek = allItems.filter((item) => {
      if (!item.receivedDate) return false;
      const receivedDate = new Date(item.receivedDate);
      return receivedDate >= weekStart && receivedDate <= weekEnd;
    }).length;

    const units = await this.getAllStorageUnits(userId);
    const storageUtilization =
      units.length > 0
        ? units.reduce((sum, u) => sum + (u.usedCapacity || 0), 0) / units.length
        : 0;

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

    const recentActivity = await this.getRecentScans(userId, 10);

    return {
      totalItems: allItems.length,
      pendingReviews,
      receivedThisWeek,
      storageUtilization,
      upcomingReviewDeadlines: upcomingDeadlines,
      recentActivity,
    };
  }

  // Analytics
  async getAnalytics(userId: string): Promise<AnalyticsData> {
    const allItems = await this.getAllItems(userId);
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Total item value
    const totalItemValue = allItems.reduce((sum, item) => sum + (item.taxValue || 0), 0);

    // Reviews completed
    const reviewsCompleted = allItems.filter(
      (item) => item.status === ITEM_STATUSES.REVIEWED || item.status === ITEM_STATUSES.SELLABLE
    ).length;

    // Reviews this month
    const reviewsThisMonth = allItems.filter((item) => {
      if (!item.reviewCompletedDate) return false;
      const completedDate = new Date(item.reviewCompletedDate);
      return completedDate >= monthStart && completedDate <= monthEnd;
    }).length;

    // Average review time (in days)
    const itemsWithReviewTime = allItems.filter(
      (item) => item.receivedDate && item.reviewCompletedDate
    );
    const averageReviewTime = itemsWithReviewTime.length > 0
      ? itemsWithReviewTime.reduce((sum, item) => {
          const received = new Date(item.receivedDate!).getTime();
          const completed = new Date(item.reviewCompletedDate!).getTime();
          return sum + (completed - received) / (1000 * 60 * 60 * 24);
        }, 0) / itemsWithReviewTime.length
      : 0;

    // Items by status
    const statusCounts = new Map<string, number>();
    allItems.forEach((item) => {
      statusCounts.set(item.status, (statusCounts.get(item.status) || 0) + 1);
    });
    const itemsByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Items by month (last 6 months)
    const itemsByMonth: { month: string; count: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const monthItems = allItems.filter((item) => {
        if (!item.orderDate) return false;
        const orderDate = new Date(item.orderDate);
        return orderDate >= mStart && orderDate <= mEnd;
      });
      itemsByMonth.push({
        month: format(monthDate, 'MMM yyyy'),
        count: monthItems.length,
        value: monthItems.reduce((sum, item) => sum + (item.taxValue || 0), 0),
      });
    }

    // Review trend (last 6 months)
    const reviewTrend: { month: string; completed: number; pending: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      
      const completed = allItems.filter((item) => {
        if (!item.reviewCompletedDate) return false;
        const completedDate = new Date(item.reviewCompletedDate);
        return completedDate >= mStart && completedDate <= mEnd;
      }).length;

      const pending = allItems.filter((item) => {
        if (!item.receivedDate || item.reviewCompletedDate) return false;
        const receivedDate = new Date(item.receivedDate);
        return receivedDate >= mStart && receivedDate <= mEnd;
      }).length;

      reviewTrend.push({
        month: format(monthDate, 'MMM yyyy'),
        completed,
        pending,
      });
    }

    return {
      totalItemValue,
      reviewsCompleted,
      reviewsThisMonth,
      averageReviewTime,
      itemsByStatus,
      itemsByMonth,
      reviewTrend,
    };
  }

  // Storage Placement
  async findOptimalPlacement(
    userId: string,
    asin: string,
    width: number,
    height: number,
    depth: number
  ): Promise<{ unit: string; slot: string; item: VineItem } | null> {
    const item = await this.getItemByAsin(userId, asin);
    if (!item) return null;

    // Get only user's storage units
    const units = await this.getAllStorageUnits(userId);
    if (units.length === 0) return null;

    // Get unit IDs for this user
    const userUnitIds = units.map(u => u.id);

    // Query only slots belonging to user's units (defense in depth)
    const userSlots = await db
      .select()
      .from(storageSlots)
      .where(inArray(storageSlots.unitId, userUnitIds));

    for (const unit of units) {
      const unitSlots = userSlots.filter(
        (slot) => slot.unitId === unit.id && !slot.isOccupied
      );

      for (const slot of unitSlots) {
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

    for (const unit of units) {
      const unitSlots = userSlots.filter(
        (slot) => slot.unitId === unit.id && !slot.isOccupied
      );

      if (unitSlots.length > 0) {
        return {
          unit: unit.name,
          slot: unitSlots[0].slotCode,
          item,
        };
      }
    }

    return null;
  }

  // API Connections
  async getApiConnections(userId: string): Promise<ApiConnection[]> {
    return await db
      .select()
      .from(apiConnections)
      .where(eq(apiConnections.userId, userId))
      .orderBy(desc(apiConnections.createdAt));
  }

  async getApiConnectionByProvider(userId: string, provider: string): Promise<ApiConnection | undefined> {
    const [connection] = await db
      .select()
      .from(apiConnections)
      .where(and(eq(apiConnections.userId, userId), eq(apiConnections.provider, provider)));
    return connection;
  }

  async createApiConnection(userId: string, data: Omit<InsertApiConnection, 'userId'>): Promise<ApiConnection> {
    const id = randomUUID();
    const [connection] = await db
      .insert(apiConnections)
      .values({
        id,
        userId,
        provider: data.provider,
        apiKey: data.apiKey ?? null,
        isActive: data.isActive ?? true,
        lastTested: data.lastTested ?? null,
      })
      .returning();
    return connection;
  }

  async updateApiConnection(userId: string, id: string, updates: Partial<ApiConnection>): Promise<ApiConnection | undefined> {
    const { id: _, userId: __, ...safeUpdates } = updates;
    const [connection] = await db
      .update(apiConnections)
      .set(safeUpdates)
      .where(and(eq(apiConnections.id, id), eq(apiConnections.userId, userId)))
      .returning();
    return connection;
  }

  async deleteApiConnection(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(apiConnections)
      .where(and(eq(apiConnections.id, id), eq(apiConnections.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async testApiConnection(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const [connection] = await db
      .select()
      .from(apiConnections)
      .where(and(eq(apiConnections.id, id), eq(apiConnections.userId, userId)));

    if (!connection) {
      return { success: false, message: "Connection not found" };
    }

    try {
      if (connection.provider === API_PROVIDERS.KEEPA) {
        if (!connection.apiKey) {
          return { success: false, message: "API key is required" };
        }
        const response = await fetch(`https://api.keepa.com/token?key=${connection.apiKey}`);
        if (response.ok) {
          await db
            .update(apiConnections)
            .set({ lastTested: new Date(), isActive: true })
            .where(eq(apiConnections.id, id));
          return { success: true, message: "Keepa API connection successful" };
        }
        return { success: false, message: "Keepa API key is invalid" };
      }

      if (connection.provider === API_PROVIDERS.RAINFOREST) {
        if (!connection.apiKey) {
          return { success: false, message: "API key is required" };
        }
        const response = await fetch(`https://api.rainforestapi.com/request?api_key=${connection.apiKey}&type=account`);
        if (response.ok) {
          await db
            .update(apiConnections)
            .set({ lastTested: new Date(), isActive: true })
            .where(eq(apiConnections.id, id));
          return { success: true, message: "Rainforest API connection successful" };
        }
        return { success: false, message: "Rainforest API key is invalid" };
      }

      if (connection.provider === API_PROVIDERS.GMAIL) {
        return { success: false, message: "Gmail requires OAuth authentication. This feature is coming soon." };
      }

      return { success: false, message: "Unknown provider" };
    } catch (error) {
      console.error("Error testing API connection:", error);
      return { success: false, message: "Failed to test connection. Please try again." };
    }
  }

  // Stripe / User methods
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined> {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user;
  }

  async getStripeProduct(productId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listStripeProducts(active = true, limit = 20, offset = 0): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async listStripeProductsWithPrices(active = true, limit = 20, offset = 0): Promise<any[]> {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = ${active}
          ORDER BY id
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getStripeSubscription(subscriptionId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }
}

export const storage = new DatabaseStorage();
