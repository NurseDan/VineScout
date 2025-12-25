import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVineItemSchema, insertStorageUnitSchema, insertApiConnectionSchema, ITEM_STATUSES } from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { analyzeInventory, suggestOptimalStorage, generateReviewReminder, predictSellPrice } from "./ai-assistant";

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

  // Stripe Routes
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe publishable key:", error);
      res.status(500).json({ error: "Failed to get Stripe publishable key" });
    }
  });

  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user?.stripeSubscriptionId) {
        return res.json({ subscription: null });
      }

      const subscription = await storage.getStripeSubscription(user.stripeSubscriptionId);
      res.json({ subscription });
    } catch (error) {
      console.error("Error getting subscription:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.post("/api/checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "priceId is required" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${req.protocol}://${req.get('host')}/membership?success=true`,
        `${req.protocol}://${req.get('host')}/membership?canceled=true`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const rows = await storage.listStripeProductsWithPrices();

      const productsMap = new Map();
      for (const row of rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ data: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error listing products:", error);
      res.status(500).json({ error: "Failed to list products" });
    }
  });

  app.post("/api/billing-portal", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }

      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${req.protocol}://${req.get('host')}/membership`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      res.status(500).json({ error: "Failed to create billing portal session" });
    }
  });

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

  // Gmail Integration Routes
  app.get("/api/gmail/status", isAuthenticated, async (req, res) => {
    try {
      const { isGmailConnected } = await import("./gmail");
      const connected = await isGmailConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/gmail/search", isAuthenticated, async (req, res) => {
    try {
      const { searchVineEmails } = await import("./gmail");
      const maxResults = parseInt(req.query.maxResults as string) || 50;
      const emails = await searchVineEmails(maxResults);
      res.json(emails);
    } catch (error) {
      console.error("Error searching Gmail:", error);
      res.status(500).json({ error: "Failed to search Gmail. Make sure Gmail is connected." });
    }
  });

  // Gmail import schema for validation
  const gmailImportItemSchema = z.object({
    asin: z.string().min(10).max(20).transform(s => s.toUpperCase()),
    description: z.string().optional(),
    orderDate: z.string().optional(),
    emailId: z.string().optional(),
  });
  const gmailImportSchema = z.object({
    items: z.array(gmailImportItemSchema).min(1).max(100),
  });

  app.post("/api/gmail/import", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Validate input with Zod
      const validatedData = gmailImportSchema.parse(req.body);
      const { items } = validatedData;

      const importedItems = [];
      const skippedItems = [];

      for (const item of items) {
        const existing = await storage.getItemByAsin(userId, item.asin);
        if (existing) {
          skippedItems.push(item.asin);
          continue;
        }

        const newItem = await storage.createItem(userId, {
          asin: item.asin,
          description: item.description || `Vine Item ${item.asin}`,
          orderDate: item.orderDate ? new Date(item.orderDate) : new Date(),
          status: "ordered",
        });
        importedItems.push(newItem);
      }

      await storage.createUploadRecord(userId, {
        filename: `gmail-import-${new Date().toISOString()}`,
        uploadedAt: new Date(),
        itemsImported: importedItems.length,
        status: "completed",
      });

      res.json({
        imported: importedItems.length,
        skipped: skippedItems.length,
        skippedAsins: skippedItems,
        items: importedItems,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid import data", details: error.errors });
      }
      console.error("Error importing from Gmail:", error);
      res.status(500).json({ error: "Failed to import items from Gmail" });
    }
  });

  // AI Assistant Routes (Premium Only)
  const requirePremium = async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user?.stripeSubscriptionId) {
        return res.status(403).json({ 
          error: "Premium subscription required",
          upgradeRequired: true 
        });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "Failed to verify subscription" });
    }
  };

  app.post("/api/ai/analyze", isAuthenticated, requirePremium, async (req, res) => {
    try {
      const userId = getUserId(req);
      const items = await storage.getAllItems(userId);
      const analysis = await analyzeInventory(items);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing inventory:", error);
      res.status(500).json({ error: "Failed to analyze inventory" });
    }
  });

  app.post("/api/ai/suggest-storage", isAuthenticated, requirePremium, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ error: "itemId is required" });
      }

      const item = await storage.getItemById(userId, itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const storageUnits = await storage.getAllStorageUnits(userId);
      const suggestion = await suggestOptimalStorage(item, storageUnits);
      res.json(suggestion);
    } catch (error) {
      console.error("Error suggesting storage:", error);
      res.status(500).json({ error: "Failed to get storage suggestion" });
    }
  });

  app.post("/api/ai/review-reminder", isAuthenticated, requirePremium, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ error: "itemId is required" });
      }

      const item = await storage.getItemById(userId, itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const reminder = await generateReviewReminder(item);
      res.json(reminder);
    } catch (error) {
      console.error("Error generating review reminder:", error);
      res.status(500).json({ error: "Failed to generate review reminder" });
    }
  });

  app.post("/api/ai/sell-price", isAuthenticated, requirePremium, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ error: "itemId is required" });
      }

      const item = await storage.getItemById(userId, itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const pricing = await predictSellPrice(item);
      res.json(pricing);
    } catch (error) {
      console.error("Error predicting sell price:", error);
      res.status(500).json({ error: "Failed to predict sell price" });
    }
  });

  return httpServer;
}
