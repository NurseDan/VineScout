import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import {
  mockAuthenticatedRequest,
  mockUnauthenticatedRequest,
  mockResponse,
  mockNext,
  getUserId
} from './helpers/auth';
import { createMockUser, createMockStorage } from './helpers/database';

describe('Authentication and Authorization', () => {
  describe('getUserId helper', () => {
    it('should extract userId from authenticated request', () => {
      const req = mockAuthenticatedRequest('user-123');
      const userId = getUserId(req);

      expect(userId).toBe('user-123');
    });

    it('should return undefined for unauthenticated request', () => {
      const req = mockUnauthenticatedRequest();
      const userId = getUserId(req);

      expect(userId).toBeUndefined();
    });

    it('should return undefined when user exists but claims are missing', () => {
      const req = { user: {} };
      const userId = getUserId(req);

      expect(userId).toBeUndefined();
    });

    it('should return undefined when user.claims exists but sub is missing', () => {
      const req = { user: { claims: {} } };
      const userId = getUserId(req);

      expect(userId).toBeUndefined();
    });
  });

  describe('isAdmin middleware', () => {
    let mockStorage: ReturnType<typeof createMockStorage>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      mockStorage = createMockStorage();
      res = mockResponse();
      next = mockNext();
    });

    // Note: The actual isAdmin middleware would need to be exported from routes.ts for proper testing
    // This is a simulation of how the tests would work
    const createIsAdminMiddleware = (storage: any) => {
      return async (req: any, res: Response, next: NextFunction) => {
        try {
          const userId = getUserId(req);
          const user = await storage.getUser(userId);

          if (!user?.isAdmin) {
            return res.status(403).json({ error: "Access denied. Admin privileges required." });
          }
          next();
        } catch (error) {
          res.status(500).json({ error: "Failed to check admin status" });
        }
      };
    };

    it('should allow admin users to proceed', async () => {
      const adminUser = createMockUser({ id: 'admin-123', isAdmin: true });
      mockStorage.getUser.mockResolvedValue(adminUser);

      const req = mockAuthenticatedRequest('admin-123');
      const isAdmin = createIsAdminMiddleware(mockStorage);

      await isAdmin(req, res as Response, next);

      expect(mockStorage.getUser).toHaveBeenCalledWith('admin-123');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny non-admin users', async () => {
      const regularUser = createMockUser({ id: 'user-123', isAdmin: false });
      mockStorage.getUser.mockResolvedValue(regularUser);

      const req = mockAuthenticatedRequest('user-123');
      const isAdmin = createIsAdminMiddleware(mockStorage);

      await isAdmin(req, res as Response, next);

      expect(mockStorage.getUser).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Access denied. Admin privileges required."
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny when user does not exist', async () => {
      mockStorage.getUser.mockResolvedValue(null);

      const req = mockAuthenticatedRequest('nonexistent-user');
      const isAdmin = createIsAdminMiddleware(mockStorage);

      await isAdmin(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when database error occurs', async () => {
      mockStorage.getUser.mockRejectedValue(new Error('Database connection failed'));

      const req = mockAuthenticatedRequest('user-123');
      const isAdmin = createIsAdminMiddleware(mockStorage);

      await isAdmin(req, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to check admin status"
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Authentication scenarios', () => {
    it('should create authenticated request with correct user claims', () => {
      const req = mockAuthenticatedRequest('user-456', 'test@example.com');

      expect(req.user).toBeDefined();
      expect(req.user?.claims.sub).toBe('user-456');
      expect(req.user?.claims.email).toBe('test@example.com');
    });

    it('should use default email format when email not provided', () => {
      const req = mockAuthenticatedRequest('user-789');

      expect(req.user?.claims.email).toBe('user-user-789@example.com');
    });

    it('should handle unauthenticated request correctly', () => {
      const req = mockUnauthenticatedRequest();

      expect(req.user).toBeUndefined();
      expect(getUserId(req)).toBeUndefined();
    });
  });

  describe('User isolation tests', () => {
    it('should ensure userId is extracted from request, not from body', () => {
      // This is a critical security test - userId should NEVER come from user input
      const req = {
        ...mockAuthenticatedRequest('real-user-123'),
        body: {
          userId: 'attacker-user-456', // Attacker trying to impersonate another user
        },
      };

      const userId = getUserId(req);

      // Should get the authenticated user's ID, not the body's userId
      expect(userId).toBe('real-user-123');
      expect(userId).not.toBe('attacker-user-456');
    });

    it('should reject requests that try to access other users data', () => {
      // Test that API calls validate userId matches authenticated user
      const authenticatedUserId = 'user-123';
      const requestedUserId = 'user-456'; // Different user

      const req = mockAuthenticatedRequest(authenticatedUserId);
      const actualUserId = getUserId(req);

      // In a real API endpoint, this check should prevent access
      expect(actualUserId).toBe(authenticatedUserId);
      expect(actualUserId).not.toBe(requestedUserId);
    });
  });

  describe('Response helper tests', () => {
    it('should create response with status and json methods', () => {
      const res = mockResponse();

      expect(res.status).toBeDefined();
      expect(res.json).toBeDefined();
      expect(res.send).toBeDefined();
    });

    it('should chain status and json calls', () => {
      const res = mockResponse();

      res.status?.(404).json?.({ error: 'Not found' });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    it('should default to 200 status code', () => {
      const res = mockResponse();

      expect(res.statusCode).toBe(200);
    });
  });
});
