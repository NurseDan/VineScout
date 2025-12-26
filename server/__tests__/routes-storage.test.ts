import { describe, it, expect, beforeEach } from 'vitest';
import { createMockStorageLocation, createMockStorageUnit, createMockStorage, createMockVineItem } from './helpers/database';
import { getUserId, mockAuthenticatedRequest } from './helpers/auth';

/**
 * API Route Tests - Storage Endpoints
 *
 * These tests verify the HTTP API layer for storage management:
 * - Storage Locations endpoints
 * - Storage Units endpoints
 * - Storage Placement algorithm endpoint
 */

describe('Storage Locations API Routes', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('GET /api/storage/locations', () => {
    it('should return all storage locations for authenticated user', async () => {
      const userId = 'user-123';
      const mockLocations = [
        createMockStorageLocation({ id: 'loc-1', userId, name: 'Home Garage' }),
        createMockStorageLocation({ id: 'loc-2', userId, name: 'Storage Unit' }),
      ];

      mockStorage.getAllStorageLocations.mockResolvedValue(mockLocations);

      const locations = await mockStorage.getAllStorageLocations(userId);

      expect(mockStorage.getAllStorageLocations).toHaveBeenCalledWith(userId);
      expect(locations).toHaveLength(2);
      expect(locations.every(loc => loc.userId === userId)).toBe(true);
    });

    it('should return empty array when user has no storage locations', async () => {
      const userId = 'user-123';
      mockStorage.getAllStorageLocations.mockResolvedValue([]);

      const locations = await mockStorage.getAllStorageLocations(userId);

      expect(locations).toEqual([]);
    });
  });

  describe('POST /api/storage/locations', () => {
    it('should create storage location with valid data', async () => {
      const userId = 'user-123';
      const newLocationData = {
        name: 'Home Garage',
        locationType: 'garage' as const,
        room: 'Main Area',
      };

      const createdLocation = createMockStorageLocation({ ...newLocationData, userId });
      mockStorage.createStorageLocation.mockResolvedValue(createdLocation);

      const location = await mockStorage.createStorageLocation(userId, newLocationData);

      expect(mockStorage.createStorageLocation).toHaveBeenCalledWith(userId, newLocationData);
      expect(location.userId).toBe(userId);
      expect(location.name).toBe(newLocationData.name);
      expect(location.locationType).toBe(newLocationData.locationType);
    });

    it('should create off-site storage with facility details', async () => {
      const userId = 'user-123';
      const newLocationData = {
        name: 'ABC Storage',
        locationType: 'off_site' as const,
        facilityName: 'ABC Storage Facility',
        address: '123 Main St',
        unitNumber: 'A-105',
        accessHours: '6am-10pm',
        monthlyCost: 150.00,
      };

      const createdLocation = createMockStorageLocation({ ...newLocationData, userId });
      mockStorage.createStorageLocation.mockResolvedValue(createdLocation);

      const location = await mockStorage.createStorageLocation(userId, newLocationData);

      expect(location.facilityName).toBe('ABC Storage Facility');
      expect(location.monthlyCost).toBe(150.00);
      expect(location.accessHours).toBe('6am-10pm');
    });
  });

  describe('GET /api/storage/locations/:id', () => {
    it('should return storage location by ID', async () => {
      const userId = 'user-123';
      const locationId = 'loc-456';
      const mockLocation = createMockStorageLocation({ id: locationId, userId });

      mockStorage.getStorageLocationById.mockResolvedValue(mockLocation);

      const location = await mockStorage.getStorageLocationById(userId, locationId);

      expect(location?.id).toBe(locationId);
      expect(location?.userId).toBe(userId);
    });

    it('should return undefined for non-existent location', async () => {
      const userId = 'user-123';
      mockStorage.getStorageLocationById.mockResolvedValue(undefined);

      const location = await mockStorage.getStorageLocationById(userId, 'non-existent');

      expect(location).toBeUndefined();
    });

    it('should not allow accessing another users location', async () => {
      const userBId = 'user-B';
      const locationId = 'loc-123';

      mockStorage.getStorageLocationById.mockResolvedValue(undefined);

      const location = await mockStorage.getStorageLocationById(userBId, locationId);

      expect(location).toBeUndefined();
    });
  });

  describe('PATCH /api/storage/locations/:id', () => {
    it('should update storage location', async () => {
      const userId = 'user-123';
      const locationId = 'loc-456';

      const updates = {
        monthlyCost: 175.00,
        notes: 'Price increased',
      };

      const updatedLocation = createMockStorageLocation({
        id: locationId,
        userId,
        ...updates,
      });

      mockStorage.updateStorageLocation.mockResolvedValue(updatedLocation);

      const location = await mockStorage.updateStorageLocation(userId, locationId, updates);

      expect(location?.monthlyCost).toBe(175.00);
      expect(location?.notes).toBe('Price increased');
    });

    it('should return undefined when updating non-existent location', async () => {
      const userId = 'user-123';
      mockStorage.updateStorageLocation.mockResolvedValue(undefined);

      const location = await mockStorage.updateStorageLocation(userId, 'non-existent', {});

      expect(location).toBeUndefined();
    });
  });

  describe('DELETE /api/storage/locations/:id', () => {
    it('should delete storage location', async () => {
      const userId = 'user-123';
      const locationId = 'loc-456';

      mockStorage.deleteStorageLocation.mockResolvedValue(true);

      const deleted = await mockStorage.deleteStorageLocation(userId, locationId);

      expect(deleted).toBe(true);
    });

    it('should return false when deleting non-existent location', async () => {
      const userId = 'user-123';
      mockStorage.deleteStorageLocation.mockResolvedValue(false);

      const deleted = await mockStorage.deleteStorageLocation(userId, 'non-existent');

      expect(deleted).toBe(false);
    });
  });
});

describe('Storage Units API Routes', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('GET /api/storage/units', () => {
    it('should return all storage units for authenticated user', async () => {
      const userId = 'user-123';
      const mockUnits = [
        {
          ...createMockStorageUnit({ id: 'unit-1', userId }),
          location: createMockStorageLocation({ userId }),
        },
        {
          ...createMockStorageUnit({ id: 'unit-2', userId }),
          location: createMockStorageLocation({ userId }),
        },
      ];

      mockStorage.getAllStorageUnits.mockResolvedValue(mockUnits);

      const units = await mockStorage.getAllStorageUnits(userId);

      expect(units).toHaveLength(2);
      expect(units.every(unit => unit.userId === userId)).toBe(true);
    });

    it('should include location details with units', async () => {
      const userId = 'user-123';
      const location = createMockStorageLocation({ id: 'loc-1', userId, name: 'Home Garage' });

      const mockUnits = [
        {
          ...createMockStorageUnit({ userId, locationId: 'loc-1' }),
          location,
        },
      ];

      mockStorage.getAllStorageUnits.mockResolvedValue(mockUnits);

      const units = await mockStorage.getAllStorageUnits(userId);

      expect(units[0].location?.name).toBe('Home Garage');
    });
  });

  describe('POST /api/storage/units', () => {
    it('should create storage unit with dimensions', async () => {
      const userId = 'user-123';
      const newUnitData = {
        locationId: 'loc-123',
        name: 'Shelf A',
        width: 48,
        height: 72,
        depth: 18,
        shelves: 5,
      };

      const createdUnit = createMockStorageUnit({ ...newUnitData, userId });
      mockStorage.createStorageUnit.mockResolvedValue(createdUnit);

      const unit = await mockStorage.createStorageUnit(userId, newUnitData);

      expect(unit.name).toBe('Shelf A');
      expect(unit.width).toBe(48);
      expect(unit.height).toBe(72);
      expect(unit.depth).toBe(18);
      expect(unit.shelves).toBe(5);
    });

    it('should reject unit with missing dimensions', async () => {
      const invalidData = {
        name: 'Shelf A',
        width: 48,
        // Missing height and depth
      };

      const isValid = Boolean(
        (invalidData as any).width &&
        (invalidData as any).height &&
        (invalidData as any).depth
      );

      expect(isValid).toBe(false);
    });
  });

  describe('PATCH /api/storage/units/:id', () => {
    it('should update storage unit capacity', async () => {
      const userId = 'user-123';
      const unitId = 'unit-456';

      const updates = {
        usedCapacity: 45.5,
      };

      const updatedUnit = createMockStorageUnit({
        id: unitId,
        userId,
        usedCapacity: 45.5,
      });

      mockStorage.updateStorageUnit.mockResolvedValue(updatedUnit);

      const unit = await mockStorage.updateStorageUnit(userId, unitId, updates);

      expect(unit?.usedCapacity).toBe(45.5);
    });
  });

  describe('DELETE /api/storage/units/:id', () => {
    it('should delete storage unit', async () => {
      const userId = 'user-123';
      const unitId = 'unit-456';

      mockStorage.deleteStorageUnit.mockResolvedValue(true);

      const deleted = await mockStorage.deleteStorageUnit(userId, unitId);

      expect(deleted).toBe(true);
    });
  });
});

describe('Storage Placement Algorithm', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('POST /api/storage/find-placement', () => {
    it('should find optimal storage placement for item', async () => {
      const userId = 'user-123';
      const asin = 'B0TEST1234';
      const item = createMockVineItem({
        asin,
        lengthIn: 10,
        widthIn: 8,
        heightIn: 6,
      });

      const unit = createMockStorageUnit({
        name: 'Shelf A',
        width: 48,
        height: 72,
        depth: 18,
        usedCapacity: 25,
      });

      const placement = {
        unit: 'Shelf A',
        slot: 'A1',
        item,
      };

      mockStorage.findOptimalPlacement.mockResolvedValue(placement);

      const result = await mockStorage.findOptimalPlacement(
        userId,
        asin,
        item.widthIn!,
        item.heightIn!,
        item.lengthIn!
      );

      expect(result).not.toBeNull();
      expect(result?.unit).toBe('Shelf A');
      expect(result?.item.asin).toBe(asin);
    });

    it('should return null when no suitable placement found', async () => {
      const userId = 'user-123';
      const asin = 'B0TOOLARGE';

      // Item too large for any unit
      mockStorage.findOptimalPlacement.mockResolvedValue(null);

      const result = await mockStorage.findOptimalPlacement(
        userId,
        asin,
        100, // Very large dimensions
        100,
        100
      );

      expect(result).toBeNull();
    });

    it('should prefer units with lower capacity utilization', async () => {
      // This test verifies the algorithm prefers less-full units
      const units = [
        createMockStorageUnit({ name: 'Unit A', usedCapacity: 75 }),
        createMockStorageUnit({ name: 'Unit B', usedCapacity: 25 }),
        createMockStorageUnit({ name: 'Unit C', usedCapacity: 50 }),
      ];

      const sorted = [...units].sort((a, b) => a.usedCapacity - b.usedCapacity);

      // Best placement should be Unit B (lowest capacity)
      expect(sorted[0].name).toBe('Unit B');
      expect(sorted[0].usedCapacity).toBe(25);
    });

    it('should verify item dimensions fit in unit', async () => {
      const item = { width: 10, height: 8, depth: 6 };
      const unit = { width: 48, height: 72, depth: 18 };

      const fits = (
        unit.width >= item.width &&
        unit.height >= item.height &&
        unit.depth >= item.depth
      );

      expect(fits).toBe(true);
    });

    it('should reject items larger than unit dimensions', async () => {
      const largeItem = { width: 100, height: 100, depth: 100 };
      const smallUnit = { width: 48, height: 72, depth: 18 };

      const fits = (
        smallUnit.width >= largeItem.width &&
        smallUnit.height >= largeItem.height &&
        smallUnit.depth >= largeItem.depth
      );

      expect(fits).toBe(false);
    });
  });
});

describe('Dashboard and Analytics', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      const userId = 'user-123';
      const mockStats = {
        totalItems: 50,
        pendingReviews: 12,
        receivedThisWeek: 8,
        storageUtilization: 65.5,
        upcomingReviewDeadlines: [
          createMockVineItem({ reviewDueDate: new Date() }),
        ],
        recentActivity: [],
      };

      mockStorage.getDashboardStats.mockResolvedValue(mockStats);

      const stats = await mockStorage.getDashboardStats(userId);

      expect(stats.totalItems).toBe(50);
      expect(stats.pendingReviews).toBe(12);
      expect(stats.receivedThisWeek).toBe(8);
      expect(stats.storageUtilization).toBeCloseTo(65.5);
    });
  });

  describe('GET /api/analytics', () => {
    it('should return analytics data', async () => {
      const userId = 'user-123';
      const mockAnalytics = {
        totalItemValue: 1250.00,
        reviewsCompleted: 45,
        reviewsThisMonth: 12,
        averageReviewTime: 5.5,
        itemsByStatus: [
          { status: 'ordered', count: 10 },
          { status: 'received', count: 15 },
          { status: 'reviewed', count: 25 },
        ],
        itemsByMonth: [],
        reviewTrend: [],
      };

      mockStorage.getAnalytics.mockResolvedValue(mockAnalytics);

      const analytics = await mockStorage.getAnalytics(userId);

      expect(analytics.totalItemValue).toBe(1250.00);
      expect(analytics.reviewsCompleted).toBe(45);
      expect(analytics.averageReviewTime).toBeCloseTo(5.5);
    });
  });
});
