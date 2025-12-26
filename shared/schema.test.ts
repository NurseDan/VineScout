import { describe, it, expect } from 'vitest';
import {
  insertVineItemSchema,
  insertStorageLocationSchema,
  insertStorageUnitSchema,
  insertStorageSlotSchema,
  insertScanLogSchema,
  insertUploadRecordSchema,
  insertApiConnectionSchema,
  insertMarketplaceListingSchema,
  insertTaxProfileSchema,
  insertWaitlistSignupSchema,
  ITEM_STATUSES,
  LOCATION_TYPES,
  LISTING_STATUSES,
  API_PROVIDERS,
  FILING_STATUSES,
  PLATFORMS,
} from './schema';

describe('Schema Validation Tests', () => {
  describe('insertVineItemSchema', () => {
    it('should accept valid item data with all required fields', () => {
      const validItem = {
        userId: 'user-123',
        asin: 'B0TEST1234',
        description: 'Test Product',
        status: 'ordered',
      };

      const result = insertVineItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should accept valid item with optional fields', () => {
      const validItem = {
        userId: 'user-123',
        asin: 'B0TEST1234',
        description: 'Test Product',
        taxValue: 25.99,
        orderDate: new Date('2024-01-01'),
        trackingNumber: 'TRACK123',
        lengthIn: 10,
        widthIn: 8,
        heightIn: 6,
        weightLb: 2.5,
        notes: 'Test notes',
      };

      const result = insertVineItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject item missing userId', () => {
      const invalidItem = {
        asin: 'B0TEST1234',
        description: 'Test Product',
      };

      const result = insertVineItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item missing asin', () => {
      const invalidItem = {
        userId: 'user-123',
        description: 'Test Product',
      };

      const result = insertVineItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item missing description', () => {
      const invalidItem = {
        userId: 'user-123',
        asin: 'B0TEST1234',
      };

      const result = insertVineItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should handle all valid item statuses', () => {
      const statuses = Object.values(ITEM_STATUSES);

      statuses.forEach(status => {
        const item = {
          userId: 'user-123',
          asin: 'B0TEST1234',
          description: 'Test Product',
          status,
        };

        const result = insertVineItemSchema.safeParse(item);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('insertStorageLocationSchema', () => {
    it('should accept valid storage location with required fields', () => {
      const validLocation = {
        userId: 'user-123',
        name: 'Home Garage',
        locationType: 'garage',
      };

      const result = insertStorageLocationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });

    it('should accept storage location with all optional fields', () => {
      const validLocation = {
        userId: 'user-123',
        name: 'Storage Unit',
        locationType: 'off_site',
        facilityName: 'ABC Storage',
        address: '123 Main St',
        unitNumber: 'A-105',
        accessHours: '6am-10pm',
        monthlyCost: 150.00,
        room: 'Unit A',
        notes: 'Climate controlled',
      };

      const result = insertStorageLocationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });

    it('should reject location missing userId', () => {
      const invalidLocation = {
        name: 'Home Garage',
        locationType: 'garage',
      };

      const result = insertStorageLocationSchema.safeParse(invalidLocation);
      expect(result.success).toBe(false);
    });

    it('should reject location missing name', () => {
      const invalidLocation = {
        userId: 'user-123',
        locationType: 'garage',
      };

      const result = insertStorageLocationSchema.safeParse(invalidLocation);
      expect(result.success).toBe(false);
    });

    it('should handle all valid location types', () => {
      const types = Object.values(LOCATION_TYPES);

      types.forEach(locationType => {
        const location = {
          userId: 'user-123',
          name: 'Test Location',
          locationType,
        };

        const result = insertStorageLocationSchema.safeParse(location);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('insertStorageUnitSchema', () => {
    it('should accept valid storage unit with required fields', () => {
      const validUnit = {
        userId: 'user-123',
        name: 'Shelf A',
        width: 48,
        height: 72,
        depth: 18,
      };

      const result = insertStorageUnitSchema.safeParse(validUnit);
      expect(result.success).toBe(true);
    });

    it('should accept storage unit with location and optional fields', () => {
      const validUnit = {
        userId: 'user-123',
        locationId: 'loc-123',
        name: 'Shelf A',
        width: 48,
        height: 72,
        depth: 18,
        shelves: 5,
        usedCapacity: 25.5,
      };

      const result = insertStorageUnitSchema.safeParse(validUnit);
      expect(result.success).toBe(true);
    });

    it('should reject unit missing required dimensions', () => {
      const invalidUnit = {
        userId: 'user-123',
        name: 'Shelf A',
        width: 48,
        // Missing height and depth
      };

      const result = insertStorageUnitSchema.safeParse(invalidUnit);
      expect(result.success).toBe(false);
    });

    it('should reject unit missing name', () => {
      const invalidUnit = {
        userId: 'user-123',
        width: 48,
        height: 72,
        depth: 18,
      };

      const result = insertStorageUnitSchema.safeParse(invalidUnit);
      expect(result.success).toBe(false);
    });
  });

  describe('insertStorageSlotSchema', () => {
    it('should accept valid storage slot', () => {
      const validSlot = {
        unitId: 'unit-123',
        slotCode: 'A1',
        width: 12,
        height: 12,
        depth: 18,
      };

      const result = insertStorageSlotSchema.safeParse(validSlot);
      expect(result.success).toBe(true);
    });

    it('should accept slot with optional fields', () => {
      const validSlot = {
        unitId: 'unit-123',
        slotCode: 'A1',
        width: 12,
        height: 12,
        depth: 18,
        isOccupied: true,
        itemId: 'item-123',
      };

      const result = insertStorageSlotSchema.safeParse(validSlot);
      expect(result.success).toBe(true);
    });

    it('should reject slot missing required dimensions', () => {
      const invalidSlot = {
        unitId: 'unit-123',
        slotCode: 'A1',
        width: 12,
        // Missing height and depth
      };

      const result = insertStorageSlotSchema.safeParse(invalidSlot);
      expect(result.success).toBe(false);
    });
  });

  describe('insertScanLogSchema', () => {
    it('should accept valid scan log', () => {
      const validScan = {
        userId: 'user-123',
        asin: 'B0TEST1234',
        scannedAt: new Date(),
        action: 'mark_received',
      };

      const result = insertScanLogSchema.safeParse(validScan);
      expect(result.success).toBe(true);
    });

    it('should accept scan log with itemId', () => {
      const validScan = {
        userId: 'user-123',
        asin: 'B0TEST1234',
        scannedAt: new Date(),
        action: 'mark_received',
        itemId: 'item-123',
      };

      const result = insertScanLogSchema.safeParse(validScan);
      expect(result.success).toBe(true);
    });

    it('should reject scan log missing required fields', () => {
      const invalidScan = {
        userId: 'user-123',
        asin: 'B0TEST1234',
        // Missing scannedAt and action
      };

      const result = insertScanLogSchema.safeParse(invalidScan);
      expect(result.success).toBe(false);
    });
  });

  describe('insertUploadRecordSchema', () => {
    it('should accept valid upload record', () => {
      const validUpload = {
        userId: 'user-123',
        filename: 'inventory.csv',
        uploadedAt: new Date(),
      };

      const result = insertUploadRecordSchema.safeParse(validUpload);
      expect(result.success).toBe(true);
    });

    it('should accept upload record with optional fields', () => {
      const validUpload = {
        userId: 'user-123',
        filename: 'inventory.csv',
        uploadedAt: new Date(),
        itemsImported: 50,
        status: 'completed',
      };

      const result = insertUploadRecordSchema.safeParse(validUpload);
      expect(result.success).toBe(true);
    });

    it('should reject upload record missing filename', () => {
      const invalidUpload = {
        userId: 'user-123',
        uploadedAt: new Date(),
      };

      const result = insertUploadRecordSchema.safeParse(invalidUpload);
      expect(result.success).toBe(false);
    });
  });

  describe('insertApiConnectionSchema', () => {
    it('should accept valid API connection', () => {
      const validConnection = {
        userId: 'user-123',
        provider: 'keepa',
      };

      const result = insertApiConnectionSchema.safeParse(validConnection);
      expect(result.success).toBe(true);
    });

    it('should accept API connection with all fields', () => {
      const validConnection = {
        userId: 'user-123',
        provider: 'keepa',
        apiKey: 'test-api-key-123',
        isActive: true,
        lastTested: new Date(),
      };

      const result = insertApiConnectionSchema.safeParse(validConnection);
      expect(result.success).toBe(true);
    });

    it('should handle all valid API providers', () => {
      const providers = Object.values(API_PROVIDERS);

      providers.forEach(provider => {
        const connection = {
          userId: 'user-123',
          provider,
        };

        const result = insertApiConnectionSchema.safeParse(connection);
        expect(result.success).toBe(true);
      });
    });

    it('should reject API connection missing provider', () => {
      const invalidConnection = {
        userId: 'user-123',
      };

      const result = insertApiConnectionSchema.safeParse(invalidConnection);
      expect(result.success).toBe(false);
    });
  });

  describe('insertMarketplaceListingSchema', () => {
    it('should accept valid marketplace listing', () => {
      const validListing = {
        userId: 'user-123',
        itemId: 'item-123',
        askingPrice: 49.99,
        condition: 'new',
      };

      const result = insertMarketplaceListingSchema.safeParse(validListing);
      expect(result.success).toBe(true);
    });

    it('should accept listing with all optional fields', () => {
      const validListing = {
        userId: 'user-123',
        itemId: 'item-123',
        askingPrice: 49.99,
        condition: 'new',
        description: 'Brand new product, never opened',
        status: 'active',
        soldAt: new Date(),
      };

      const result = insertMarketplaceListingSchema.safeParse(validListing);
      expect(result.success).toBe(true);
    });

    it('should handle all valid listing statuses', () => {
      const statuses = Object.values(LISTING_STATUSES);

      statuses.forEach(status => {
        const listing = {
          userId: 'user-123',
          itemId: 'item-123',
          askingPrice: 49.99,
          condition: 'new',
          status,
        };

        const result = insertMarketplaceListingSchema.safeParse(listing);
        expect(result.success).toBe(true);
      });
    });

    it('should reject listing missing askingPrice', () => {
      const invalidListing = {
        userId: 'user-123',
        itemId: 'item-123',
        condition: 'new',
      };

      const result = insertMarketplaceListingSchema.safeParse(invalidListing);
      expect(result.success).toBe(false);
    });
  });

  describe('insertTaxProfileSchema', () => {
    it('should accept valid tax profile with required fields', () => {
      const validProfile = {
        userId: 'user-123',
      };

      const result = insertTaxProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should accept tax profile with all optional fields', () => {
      const validProfile = {
        userId: 'user-123',
        filingStatus: 'single',
        state: 'CA',
        estimatedTaxRate: 28,
        selfEmploymentTaxRate: 15.3,
        includeStateTax: true,
        stateTaxRate: 9.3,
        reminderEnabled: true,
        businessName: 'My Business LLC',
        businessAddress: '123 Business St',
      };

      const result = insertTaxProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should handle all valid filing statuses', () => {
      const statuses = Object.values(FILING_STATUSES);

      statuses.forEach(filingStatus => {
        const profile = {
          userId: 'user-123',
          filingStatus,
        };

        const result = insertTaxProfileSchema.safeParse(profile);
        expect(result.success).toBe(true);
      });
    });

    it('should reject tax profile missing userId', () => {
      const invalidProfile = {
        filingStatus: 'single',
      };

      const result = insertTaxProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('insertWaitlistSignupSchema', () => {
    it('should accept valid waitlist signup', () => {
      const validSignup = {
        email: 'user@example.com',
        platform: 'amazon_vine',
      };

      const result = insertWaitlistSignupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });

    it('should accept waitlist signup with interested features', () => {
      const validSignup = {
        email: 'user@example.com',
        platform: 'amazon_vine',
        interestedFeatures: 'inventory tracking, tax calculations',
      };

      const result = insertWaitlistSignupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });

    it('should handle all valid platforms', () => {
      const platforms = Object.values(PLATFORMS);

      platforms.forEach(platform => {
        const signup = {
          email: 'user@example.com',
          platform,
        };

        const result = insertWaitlistSignupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });

    it('should reject waitlist signup missing email', () => {
      const invalidSignup = {
        platform: 'amazon_vine',
      };

      const result = insertWaitlistSignupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
    });

    it('should reject waitlist signup missing platform', () => {
      const invalidSignup = {
        email: 'user@example.com',
      };

      const result = insertWaitlistSignupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
    });
  });
});
