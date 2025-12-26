# VineScout Testing Guide

This document provides an overview of the testing infrastructure and best practices for VineScout.

## Test Statistics

- **Total Tests**: 164 passing tests
- **Test Files**: 6 test files
- **Coverage Areas**:
  - Schema Validation (41 tests)
  - Storage Layer (33 tests)
  - API Routes - Items (26 tests)
  - API Routes - Storage (24 tests)
  - Stripe Integration (24 tests)
  - Authentication & Authorization (16 tests)

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Test Files

```
VineScout/
├── shared/
│   └── schema.test.ts           # Zod schema validation tests
├── server/
│   └── __tests__/
│       ├── auth.test.ts         # Authentication & authorization tests
│       ├── storage.test.ts      # Database layer unit tests
│       ├── routes-items.test.ts # Items API endpoint tests
│       ├── routes-storage.test.ts # Storage API endpoint tests
│       ├── stripe.test.ts       # Stripe payment integration tests
│       └── helpers/
│           ├── auth.ts          # Auth testing utilities
│           └── database.ts      # Database mocking utilities
└── client/src/
    └── test/
        └── setup.ts             # React testing setup
```

### Test Categories

#### 1. Schema Validation Tests (`shared/schema.test.ts`)

Tests all Zod validation schemas to ensure data integrity:

- ✅ `insertVineItemSchema` - Item creation validation
- ✅ `insertStorageLocationSchema` - Storage location validation
- ✅ `insertStorageUnitSchema` - Storage unit validation
- ✅ `insertStorageSlotSchema` - Storage slot validation
- ✅ `insertScanLogSchema` - Scan log validation
- ✅ `insertUploadRecordSchema` - Upload record validation
- ✅ `insertApiConnectionSchema` - API connection validation
- ✅ `insertMarketplaceListingSchema` - Marketplace listing validation
- ✅ `insertTaxProfileSchema` - Tax profile validation
- ✅ `insertWaitlistSignupSchema` - Waitlist signup validation

**Key Test Areas:**
- Required field validation
- Optional field handling
- Enum value validation
- Data type validation

#### 2. Authentication & Authorization Tests (`server/__tests__/auth.test.ts`)

Critical security tests:

- ✅ `getUserId()` helper function
- ✅ `isAdmin` middleware authorization
- ✅ User isolation (preventing cross-user data access)
- ✅ Request authentication validation
- ✅ Admin privilege verification

**Security Focus:**
- Ensures userId comes from authentication, not request body
- Prevents users from accessing other users' data
- Validates admin-only endpoint protection

#### 3. Storage Layer Tests (`server/__tests__/storage.test.ts`)

Database abstraction layer tests:

**User Isolation Tests:**
- ✅ Items isolation by userId
- ✅ Storage locations isolation
- ✅ Storage units isolation
- ✅ Cross-user access prevention

**CRUD Operation Tests:**
- ✅ Create, read, update, delete operations
- ✅ Bulk item creation
- ✅ Mark item as received
- ✅ Update tracking

**Complex Query Tests:**
- ✅ Dashboard statistics calculations
- ✅ Analytics aggregations
- ✅ Storage placement algorithm
- ✅ Review deadline tracking

#### 4. Items API Route Tests (`server/__tests__/routes-items.test.ts`)

API endpoint integration tests:

- ✅ `GET /api/items` - List all items
- ✅ `POST /api/items` - Create new item
- ✅ `GET /api/items/:id` - Get single item
- ✅ `PATCH /api/items/:id` - Update item
- ✅ `DELETE /api/items/:id` - Delete item
- ✅ `POST /api/items/bulk` - Bulk import
- ✅ `POST /api/items/:id/receive` - Mark as received

**Test Coverage:**
- Request validation
- User isolation
- Error handling
- Concurrent updates

#### 5. Storage API Route Tests (`server/__tests__/routes-storage.test.ts`)

Storage management endpoint tests:

**Storage Locations:**
- ✅ `GET /api/storage/locations`
- ✅ `POST /api/storage/locations`
- ✅ `GET /api/storage/locations/:id`
- ✅ `PATCH /api/storage/locations/:id`
- ✅ `DELETE /api/storage/locations/:id`

**Storage Units:**
- ✅ `GET /api/storage/units`
- ✅ `POST /api/storage/units`
- ✅ `PATCH /api/storage/units/:id`
- ✅ `DELETE /api/storage/units/:id`

**Special Features:**
- ✅ `POST /api/storage/find-placement` - Optimal storage placement
- ✅ `GET /api/dashboard/stats` - Dashboard statistics
- ✅ `GET /api/analytics` - Analytics data

#### 6. Stripe Integration Tests (`server/__tests__/stripe.test.ts`)

Payment processing tests:

**Customer Management:**
- ✅ Create Stripe customer
- ✅ Store customer ID
- ✅ Reuse existing customer

**Checkout:**
- ✅ Create checkout session
- ✅ Handle payment errors
- ✅ Validate parameters

**Subscriptions:**
- ✅ Get subscription status
- ✅ Handle cancellation
- ✅ Billing portal access

**Webhooks:**
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ Signature verification

**Premium Features:**
- ✅ Feature gating logic
- ✅ Subscription status checks

## Testing Utilities

### Auth Helpers (`server/__tests__/helpers/auth.ts`)

```typescript
// Create authenticated request
const req = mockAuthenticatedRequest('user-123', 'user@example.com');

// Create admin request
const req = mockAdminRequest('admin-id');

// Create unauthenticated request
const req = mockUnauthenticatedRequest();

// Create mock response
const res = mockResponse();

// Create mock next function
const next = mockNext();

// Extract userId from request
const userId = getUserId(req);
```

### Database Helpers (`server/__tests__/helpers/database.ts`)

```typescript
// Create mock items
const item = createMockVineItem({ asin: 'B0TEST1234' });

// Create mock storage location
const location = createMockStorageLocation({ name: 'Garage' });

// Create mock storage unit
const unit = createMockStorageUnit({ width: 48, height: 72 });

// Create mock user
const user = createMockUser({ isAdmin: true });

// Create mock storage interface
const mockStorage = createMockStorage();
mockStorage.getAllItems.mockResolvedValue([item]);
```

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Specific Functionality', () => {
    it('should do something specific', () => {
      // Arrange: Set up test data
      const input = {};

      // Act: Perform the action
      const result = someFunction(input);

      // Assert: Verify the result
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Best Practices

1. **Test Organization**
   - Group related tests with `describe()` blocks
   - Use clear, descriptive test names
   - Follow "Arrange, Act, Assert" pattern

2. **User Isolation**
   - Always test that users can only access their own data
   - Test cross-user access attempts are blocked
   - Verify userId comes from authentication, not user input

3. **Error Handling**
   - Test both success and failure scenarios
   - Test edge cases (null, undefined, empty arrays)
   - Test validation errors

4. **Mocking**
   - Mock external services (Stripe, OpenAI, Gmail)
   - Mock database calls for unit tests
   - Use `vi.fn()` for spy functions

5. **Security Testing**
   - Test authentication requirements
   - Test authorization (admin vs regular user)
   - Test input validation
   - Test against common vulnerabilities (SQL injection, XSS)

## Test Coverage Goals

### Current Coverage

- ✅ **Schema Validation**: 100% (all schemas tested)
- ✅ **Authentication**: High (core auth flows covered)
- ✅ **User Isolation**: High (all CRUD operations tested)
- ✅ **API Routes**: High (all major endpoints covered)
- ✅ **Stripe Integration**: High (core payment flows covered)

### Areas for Future Expansion

- 🔄 React component tests
- 🔄 E2E workflow tests
- 🔄 AI assistant function tests
- 🔄 Gmail integration tests
- 🔄 File upload/parsing tests
- 🔄 WebSocket tests

## CI/CD Integration

Tests should run automatically:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Debugging Tests

```bash
# Run specific test file
npx vitest run server/__tests__/auth.test.ts

# Run tests matching pattern
npx vitest run -t "should create item"

# Run with verbose output
npx vitest run --reporter=verbose

# Run with UI for interactive debugging
npm run test:ui
```

## Common Issues

### Issue: "Module not found" errors

**Solution**: Check `vitest.config.ts` path aliases match your imports.

### Issue: "Database connection" errors in tests

**Solution**: Tests should use mocked storage, not real database. Check that `createMockStorage()` is being used.

### Issue: "Timeout" errors

**Solution**: Increase timeout in test or fix slow async operations:
```typescript
it('slow test', async () => {
  // ...
}, { timeout: 10000 }); // 10 second timeout
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated**: 2025-12-26
**Test Framework**: Vitest v4.0.16
**Total Tests**: 164
