import type { VineItem, StorageLocation, StorageUnit, User } from '@shared/schema';

/**
 * Create a mock vine item for testing
 */
export function createMockVineItem(overrides: Partial<VineItem> = {}): VineItem {
  return {
    id: 'test-item-id',
    userId: 'test-user-id',
    asin: 'B0TEST1234',
    description: 'Test Product Description',
    taxValue: 25.99,
    orderDate: new Date('2024-01-01'),
    trackingNumber: 'TRACK123456',
    receivedDate: null,
    reviewDueDate: new Date('2024-02-01'),
    reviewCompletedDate: null,
    sellableDate: null,
    status: 'ordered',
    storageLocation: null,
    imageUrl: null,
    notes: null,
    lengthIn: 10,
    widthIn: 8,
    heightIn: 6,
    weightLb: 2.5,
    ...overrides,
  };
}

/**
 * Create a mock storage location for testing
 */
export function createMockStorageLocation(overrides: Partial<StorageLocation> = {}): StorageLocation {
  return {
    id: 'test-location-id',
    userId: 'test-user-id',
    name: 'Home - Garage',
    locationType: 'garage',
    facilityName: null,
    address: null,
    unitNumber: null,
    accessHours: null,
    monthlyCost: null,
    room: 'Main Area',
    notes: null,
    ...overrides,
  };
}

/**
 * Create a mock storage unit for testing
 */
export function createMockStorageUnit(overrides: Partial<StorageUnit> = {}): StorageUnit {
  return {
    id: 'test-unit-id',
    userId: 'test-user-id',
    locationId: 'test-location-id',
    name: 'Shelf A',
    width: 48,
    height: 72,
    depth: 18,
    shelves: 5,
    usedCapacity: 0,
    ...overrides,
  };
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    isAdmin: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionPlan: null,
    subscriptionCurrentPeriodEnd: null,
    gmailAccessToken: null,
    gmailRefreshToken: null,
    gmailTokenExpiry: null,
    ...overrides,
  };
}

/**
 * Mock storage interface for testing
 */
export function createMockStorage() {
  return {
    // Items
    getAllItems: vi.fn(),
    getItemById: vi.fn(),
    getItemByAsin: vi.fn(),
    createItem: vi.fn(),
    createItemsBulk: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    markItemReceived: vi.fn(),

    // Storage Locations
    getAllStorageLocations: vi.fn(),
    getStorageLocationById: vi.fn(),
    createStorageLocation: vi.fn(),
    updateStorageLocation: vi.fn(),
    deleteStorageLocation: vi.fn(),

    // Storage Units
    getAllStorageUnits: vi.fn(),
    getStorageUnitById: vi.fn(),
    createStorageUnit: vi.fn(),
    updateStorageUnit: vi.fn(),
    deleteStorageUnit: vi.fn(),

    // Users
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUserStripeInfo: vi.fn(),

    // Dashboard & Analytics
    getDashboardStats: vi.fn(),
    getAnalytics: vi.fn(),

    // Other
    findOptimalPlacement: vi.fn(),
    getApiConnections: vi.fn(),
    getApiConnectionByProvider: vi.fn(),
    createApiConnection: vi.fn(),
    updateApiConnection: vi.fn(),
    deleteApiConnection: vi.fn(),
    getRecentScans: vi.fn(),
    createScanLog: vi.fn(),
    getAllUploadRecords: vi.fn(),
    createUploadRecord: vi.fn(),
    getMarketplaceListings: vi.fn(),
    getMarketplaceListingById: vi.fn(),
    createMarketplaceListing: vi.fn(),
    updateMarketplaceListing: vi.fn(),
    deleteMarketplaceListing: vi.fn(),
    getTaxProfile: vi.fn(),
    createTaxProfile: vi.fn(),
    updateTaxProfile: vi.fn(),
    getTaxSummary: vi.fn(),
    getQuarterlyEstimate: vi.fn(),
    getStripeSubscription: vi.fn(),
    updateStripeSubscription: vi.fn(),
    getAllWaitlistSignups: vi.fn(),
    createWaitlistSignup: vi.fn(),
  };
}
