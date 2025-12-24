import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVineItemSchema, insertStorageUnitSchema, ITEM_STATUSES } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Vine Items CRUD
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await storage.getItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      const validatedData = insertVineItemSchema.parse(req.body);
      const item = await storage.createItem(validatedData);
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
  app.post("/api/items/bulk", async (req, res) => {
    try {
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
      const existingItems = await storage.getAllItems();
      existingItems.forEach((item) => existingAsins.add(item.asin.toUpperCase()));

      for (const item of items) {
        const asin = (item.asin || "").toString().toUpperCase().trim();
        const description = (item.description || "").toString().trim();

        // Validate required fields
        if (!asin) {
          skippedItems.push({ asin: "N/A", reason: "Missing ASIN" });
          continue;
        }

        if (!description) {
          skippedItems.push({ asin, reason: "Missing description" });
          continue;
        }

        // Check for duplicates (both in import and existing)
        if (existingAsins.has(asin)) {
          skippedItems.push({ asin, reason: "Duplicate ASIN" });
          continue;
        }

        // Parse tax value safely
        const taxValueStr = (item.taxValue || "0").toString().replace(/[^0-9.]/g, "");
        const taxValue = parseFloat(taxValueStr) || 0;

        // Parse order date
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

        existingAsins.add(asin); // Track for duplicate detection in same batch
      }

      const createdItems = await storage.createItemsBulk(validItems);

      // Create upload record
      await storage.createUploadRecord({
        filename: `import_${new Date().toISOString().split("T")[0]}.csv`,
        uploadedAt: new Date(),
        itemsImported: createdItems.length,
        status: "completed",
      });

      res.status(201).json({
        count: createdItems.length,
        skipped: skippedItems.length,
        skippedItems: skippedItems.slice(0, 10), // Return first 10 skipped for feedback
        items: createdItems,
      });
    } catch (error) {
      console.error("Error bulk importing items:", error);
      res.status(500).json({ error: "Failed to import items" });
    }
  });

  app.patch("/api/items/:id", async (req, res) => {
    try {
      const updates = req.body;
      const item = await storage.updateItem(req.params.id, updates);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteItem(req.params.id);
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
  app.post("/api/items/:id/receive", async (req, res) => {
    try {
      const item = await storage.markItemReceived(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Log the scan
      await storage.createScanLog({
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
  app.post("/api/scan", async (req, res) => {
    try {
      const { asin } = req.body;
      if (!asin) {
        return res.status(400).json({ error: "ASIN is required" });
      }

      const item = await storage.getItemByAsin(asin.toUpperCase());

      // Log the scan
      await storage.createScanLog({
        asin: asin.toUpperCase(),
        scannedAt: new Date(),
        action: item ? "lookup" : "lookup",
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
  app.get("/api/scans/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const scans = await storage.getRecentScans(limit);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
      res.status(500).json({ error: "Failed to fetch recent scans" });
    }
  });

  // Upload Records
  app.get("/api/uploads", async (req, res) => {
    try {
      const records = await storage.getAllUploadRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching upload records:", error);
      res.status(500).json({ error: "Failed to fetch upload records" });
    }
  });

  // Storage Units CRUD
  app.get("/api/storage/units", async (req, res) => {
    try {
      const units = await storage.getAllStorageUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching storage units:", error);
      res.status(500).json({ error: "Failed to fetch storage units" });
    }
  });

  app.post("/api/storage/units", async (req, res) => {
    try {
      const validatedData = insertStorageUnitSchema.parse(req.body);
      const unit = await storage.createStorageUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid storage unit data", details: error.errors });
      }
      console.error("Error creating storage unit:", error);
      res.status(500).json({ error: "Failed to create storage unit" });
    }
  });

  app.patch("/api/storage/units/:id", async (req, res) => {
    try {
      const updates = req.body;
      const unit = await storage.updateStorageUnit(req.params.id, updates);
      if (!unit) {
        return res.status(404).json({ error: "Storage unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error updating storage unit:", error);
      res.status(500).json({ error: "Failed to update storage unit" });
    }
  });

  app.delete("/api/storage/units/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStorageUnit(req.params.id);
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
  app.post("/api/storage/find-placement", async (req, res) => {
    try {
      const { asin, width, height, depth } = req.body;

      if (!asin || !width || !height || !depth) {
        return res.status(400).json({ error: "ASIN and dimensions are required" });
      }

      const placement = await storage.findOptimalPlacement(
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

  return httpServer;
}
