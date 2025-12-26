import type { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';

/**
 * Mock authenticated request with user data
 */
export function mockAuthenticatedRequest(userId: string, email?: string): Partial<Request> {
  return {
    user: {
      claims: {
        sub: userId,
        email: email || `user-${userId}@example.com`,
      },
    },
  };
}

/**
 * Mock admin request
 */
export function mockAdminRequest(userId: string = 'admin-user-id'): Partial<Request> {
  return mockAuthenticatedRequest(userId, 'admin@example.com');
}

/**
 * Mock unauthenticated request
 */
export function mockUnauthenticatedRequest(): Partial<Request> {
  return {
    user: undefined,
  };
}

/**
 * Create a mock response object for testing
 */
export function mockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    statusCode: 200,
    body: undefined,
  };

  res.status = vi.fn().mockImplementation(function(code: number) {
    res.statusCode = code;
    return res as Response;
  });

  res.json = vi.fn().mockImplementation(function(data: any) {
    res.body = data;
    return res as Response;
  });

  res.send = vi.fn().mockImplementation(function(data: any) {
    res.body = data;
    return res as Response;
  });

  return res;
}

/**
 * Create a mock next function
 */
export function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

/**
 * Extract getUserId function for testing
 */
export function getUserId(req: any): string {
  return req.user?.claims?.sub;
}
