import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVineItemSchema, insertStorageUnitSchema, insertApiConnectionSchema, ITEM_STATUSES } from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

// Helper to get userId from authenticated request
function getUserId(req: any): string {
  return req.user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (MUST be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Dashboard Stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Analytics
  app.get("/api/analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const analytics = await storage.getAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Vine Items CRUD
  app.get("/api/items", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const items = await storage.getAllItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const item = await storage.getItemById(userId, req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertVineItemSchema.omit({ userId: true }).parse(req.body);
      const item = await storage.createItem(userId, validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid item data", details: error.errors });
      }
      console.error("Error creating item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // Bulk import items from CSV
  app.post("/api/items/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      if (items.length === 0) {
        return res.status(400).json({ error: "No items to import" });
      }

      const validItems: any[] = [];
      const skippedItems: { asin: string; reason: string }[] = [];
      const existingAsins = new Set<string>();

      // Get existing ASINs to check for duplicates
      const existingItems = await storage.getAllItems(userId);
      existingItems.forEach((item) => existingAsins.add(item.asin.toUpperCase()));

      for (const item of items) {
        const asin = (item.asin || "").toString().toUpperCase().trim();
        const description = (item.description || "").toString().trim();

        if (!asin) {
          skippedItems.push({ asin: "N/A", reason: "Missing ASIN" });
          continue;
        }

        if (!description) {
          skippedItems.push({ asin, reason: "Missing description" });
          continue;
        }

        if (existingAsins.has(asin)) {
          skippedItems.push({ asin, reason: "Duplicate ASIN" });
          continue;
        }

        const taxValueStr = (item.taxValue || "0").toString().replace(/[^0-9.]/g, "");
        const taxValue = parseFloat(taxValueStr) || 0;

        let orderDate: Date | null = null;
        if (item.orderDate) {
          const parsed = new Date(item.orderDate);
          if (!isNaN(parsed.getTime())) {
            orderDate = parsed;
          }
        }

        validItems.push({
          asin,
          description,
          taxValue,
          orderDate: orderDate || new Date(),
          status: ITEM_STATUSES.ORDERED,
        });

        existingAsins.add(asin);
      }

      const createdItems = await storage.createItemsBulk(userId, validItems);

      // Create upload record
      await storage.createUploadRecord(userId, {
        filename: `import_${new Date().toISOString().split("T")[0]}.csv`,
        uploadedAt: new Date(),
        itemsImported: createdItems.length,
        status: "completed",
      });

      res.status(201).json({
        count: createdItems.length,
        skipped: skippedItems.length,
        skippedItems: skippedItems.slice(0, 10),
        items: createdItems,
      });
    } catch (error) {
      console.error("Error bulk importing items:", error);
      res.status(500).json({ error: "Failed to import items" });
    }
  });

  app.patch("/api/items/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const updates = req.body;
      const item = await storage.updateItem(userId, req.params.id, updates);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteItem(userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Mark item as received
  app.post("/api/items/:id/receive", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const item = await storage.markItemReceived(userId, req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      await storage.createScanLog(userId, {
        asin: item.asin,
        scannedAt: new Date(),
        action: "received",
        itemId: item.id,
      });

      res.json({ item });
    } catch (error) {
      console.error("Error marking item received:", error);
      res.status(500).json({ error: "Failed to mark item received" });
    }
  });

  // Scan endpoint
  app.post("/api/scan", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { asin } = req.body;
      if (!asin) {
        return res.status(400).json({ error: "ASIN is required" });
      }

      const item = await storage.getItemByAsin(userId, asin.toUpperCase());

      await storage.createScanLog(userId, {
        asin: asin.toUpperCase(),
        scannedAt: new Date(),
        action: "lookup",
        itemId: item?.id || null,
      });

      if (!item) {
        return res.json({ item: null, message: "Item not found" });
      }

      res.json({ item });
    } catch (error) {
      console.error("Error scanning:", error);
      res.status(500).json({ error: "Failed to process scan" });
    }
  });

  // Recent scans
  app.get("/api/scans/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 20;
      const scans = await storage.getRecentScans(userId, limit);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
      res.status(500).json({ error: "Failed to fetch recent scans" });
    }
  });

  // Upload Records
  app.get("/api/uploads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const records = await storage.getAllUploadRecords(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching upload records:", error);
      res.status(500).json({ error: "Failed to fetch upload records" });
    }
  });

  // Storage Units CRUD
  app.get("/api/storage/units", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const units = await storage.getAllStorageUnits(userId);
      res.json(units);
    } catch (error) {
      console.error("Error fetching storage units:", error);
      res.status(500).json({ error: "Failed to fetch storage units" });
    }
  });

  app.post("/api/storage/units", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertStorageUnitSchema.omit({ userId: true }).parse(req.body);
      const unit = await storage.createStorageUnit(userId, validatedData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid storage unit data", details: error.errors });
      }
      console.error("Error creating storage unit:", error);
      res.status(500).json({ error: "Failed to create storage unit" });
    }
  });

  app.patch("/api/storage/units/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const updates = req.body;
      const unit = await storage.updateStorageUnit(userId, req.params.id, updates);
      if (!unit) {
        return res.status(404).json({ error: "Storage unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error updating storage unit:", error);
      res.status(500).json({ error: "Failed to update storage unit" });
    }
  });

  app.delete("/api/storage/units/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteStorageUnit(userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Storage unit not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting storage unit:", error);
      res.status(500).json({ error: "Failed to delete storage unit" });
    }
  });

  // Find optimal storage placement
  app.post("/api/storage/find-placement", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { asin, width, height, depth } = req.body;

      if (!asin || !width || !height || !depth) {
        return res.status(400).json({ error: "ASIN and dimensions are required" });
      }

      const placement = await storage.findOptimalPlacement(
        userId,
        asin.toUpperCase(),
        parseFloat(width),
        parseFloat(height),
        parseFloat(depth)
      );

      if (!placement) {
        return res.json({ placement: null, message: "No suitable placement found" });
      }

      res.json({ placement });
    } catch (error) {
      console.error("Error finding placement:", error);
      res.status(500).json({ error: "Failed to find placement" });
    }
  });

  // API Connections CRUD
  app.get("/api/connections", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const connections = await storage.getApiConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching API connections:", error);
      res.status(500).json({ error: "Failed to fetch API connections" });
    }
  });

  app.post("/api/connections", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertApiConnectionSchema.omit({ userId: true }).parse(req.body);
      
      const existing = await storage.getApiConnectionByProvider(userId, validatedData.provider);
      if (existing) {
        return res.status(400).json({ error: "Connection for this provider already exists" });
      }
      
      const connection = await storage.createApiConnection(userId, validatedData);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid connection data", details: error.errors });
      }
      console.error("Error creating API connection:", error);
      res.status(500).json({ error: "Failed to create API connection" });
    }
  });

  app.patch("/api/connections/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const updates = req.body;
      const connection = await storage.updateApiConnection(userId, req.params.id, updates);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }
      res.json(connection);
    } catch (error) {
      console.error("Error updating API connection:", error);
      res.status(500).json({ error: "Failed to update API connection" });
    }
  });

  app.delete("/api/connections/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteApiConnection(userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API connection:", error);
      res.status(500).json({ error: "Failed to delete API connection" });
    }
  });

  app.post("/api/connections/:id/test", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const result = await storage.testApiConnection(userId, req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error testing API connection:", error);
      res.status(500).json({ error: "Failed to test API connection" });
    }
  });

  // Export data endpoints
  app.get("/api/export/items", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const format = req.query.format as string || 'json';
      const items = await storage.getAllItems(userId);

      if (format === 'csv') {
        const headers = ['ASIN', 'Description', 'Tax Value', 'Order Date', 'Status', 'Received Date', 'Review Due', 'Storage Location'];
        const csvRows = [headers.join(',')];
        
        items.forEach(item => {
          const row = [
            item.asin,
            `"${(item.description || '').replace(/"/g, '""')}"`,
            item.taxValue || 0,
            item.orderDate ? new Date(item.orderDate).toISOString().split('T')[0] : '',
            item.status,
            item.receivedDate ? new Date(item.receivedDate).toISOString().split('T')[0] : '',
            item.reviewDueDate ? new Date(item.reviewDueDate).toISOString().split('T')[0] : '',
            item.storageLocation || ''
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=vine-inventory-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvRows.join('\n'));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=vine-inventory-${new Date().toISOString().split('T')[0]}.json`);
        res.json(items);
      }
    } catch (error) {
      console.error("Error exporting items:", error);
      res.status(500).json({ error: "Failed to export items" });
    }
  });

  return httpServer;
}
