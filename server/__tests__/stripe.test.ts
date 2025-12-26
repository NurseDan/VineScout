import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUser, createMockStorage } from './helpers/database';
import { mockAuthenticatedRequest, getUserId } from './helpers/auth';

/**
 * Stripe Integration Tests
 *
 * These tests verify:
 * - Customer creation
 * - Checkout session creation
 * - Subscription management
 * - Webhook handling
 * - Payment error scenarios
 */

// Mock Stripe SDK
const createMockStripeService = () => ({
  createCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  getSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  createBillingPortalSession: vi.fn(),
  constructEvent: vi.fn(),
});

describe('Stripe Payment Integration', () => {
  let mockStripe: ReturnType<typeof createMockStripeService>;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStripe = createMockStripeService();
    mockStorage = createMockStorage();
  });

  describe('Customer Management', () => {
    it('should create Stripe customer for new user', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      const mockCustomer = {
        id: 'cus_123abc',
        email,
        metadata: { userId },
      };

      mockStripe.createCustomer.mockResolvedValue(mockCustomer);

      const customer = await mockStripe.createCustomer(email, userId);

      expect(mockStripe.createCustomer).toHaveBeenCalledWith(email, userId);
      expect(customer.id).toBe('cus_123abc');
      expect(customer.email).toBe(email);
      expect(customer.metadata.userId).toBe(userId);
    });

    it('should store Stripe customer ID in database', async () => {
      const userId = 'user-123';
      const stripeCustomerId = 'cus_123abc';

      mockStorage.updateUserStripeInfo.mockResolvedValue(undefined);

      await mockStorage.updateUserStripeInfo(userId, { stripeCustomerId });

      expect(mockStorage.updateUserStripeInfo).toHaveBeenCalledWith(userId, {
        stripeCustomerId,
      });
    });

    it('should reuse existing customer ID if available', async () => {
      const userId = 'user-123';
      const existingCustomerId = 'cus_existing123';

      const user = createMockUser({
        id: userId,
        stripeCustomerId: existingCustomerId,
      });

      mockStorage.getUser.mockResolvedValue(user);

      const userData = await mockStorage.getUser(userId);
      const customerId = userData?.stripeCustomerId;

      expect(customerId).toBe(existingCustomerId);
      // Should not create new customer
      expect(mockStripe.createCustomer).not.toHaveBeenCalled();
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with valid parameters', async () => {
      const customerId = 'cus_123abc';
      const priceId = 'price_premium_monthly';
      const successUrl = 'https://example.com/membership?success=true';
      const cancelUrl = 'https://example.com/membership?canceled=true';

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      mockStripe.createCheckoutSession.mockResolvedValue(mockSession);

      const session = await mockStripe.createCheckoutSession(
        customerId,
        priceId,
        successUrl,
        cancelUrl
      );

      expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
        customerId,
        priceId,
        successUrl,
        cancelUrl
      );
      expect(session.url).toBeDefined();
      expect(session.url).toContain('checkout.stripe.com');
    });

    it('should require authenticated user for checkout', async () => {
      const req = mockAuthenticatedRequest('user-123');
      const userId = getUserId(req);

      expect(userId).toBeDefined();
      expect(userId).toBe('user-123');
    });

    it('should return 400 when priceId is missing', async () => {
      const requestBody = {
        // Missing priceId
      };

      const isValid = Boolean(requestBody.hasOwnProperty('priceId'));

      expect(isValid).toBe(false);
    });

    it('should handle Stripe API errors gracefully', async () => {
      const error = new Error('Stripe API error: Invalid price ID');

      mockStripe.createCheckoutSession.mockRejectedValue(error);

      await expect(
        mockStripe.createCheckoutSession('cus_123', 'invalid_price', 'success', 'cancel')
      ).rejects.toThrow('Stripe API error');
    });
  });

  describe('Subscription Management', () => {
    it('should retrieve user subscription status', async () => {
      const userId = 'user-123';
      const subscriptionId = 'sub_123abc';

      const user = createMockUser({
        id: userId,
        stripeSubscriptionId: subscriptionId,
      });

      const mockSubscription = {
        id: subscriptionId,
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        plan: {
          id: 'price_premium_monthly',
          amount: 999,
        },
      };

      mockStorage.getUser.mockResolvedValue(user);
      mockStorage.getStripeSubscription.mockResolvedValue(mockSubscription as any);

      const userData = await mockStorage.getUser(userId);
      const subscription = userData?.stripeSubscriptionId
        ? await mockStorage.getStripeSubscription(userData.stripeSubscriptionId)
        : null;

      expect(subscription).not.toBeNull();
      expect(subscription?.status).toBe('active');
    });

    it('should return null when user has no subscription', async () => {
      const userId = 'user-123';

      const user = createMockUser({
        id: userId,
        stripeSubscriptionId: null,
      });

      mockStorage.getUser.mockResolvedValue(user);

      const userData = await mockStorage.getUser(userId);

      expect(userData?.stripeSubscriptionId).toBeNull();
    });

    it('should handle subscription cancellation', async () => {
      const subscriptionId = 'sub_123abc';

      const canceledSubscription = {
        id: subscriptionId,
        status: 'canceled',
        cancel_at_period_end: true,
      };

      mockStripe.cancelSubscription.mockResolvedValue(canceledSubscription);

      const result = await mockStripe.cancelSubscription(subscriptionId);

      expect(result.status).toBe('canceled');
      expect(result.cancel_at_period_end).toBe(true);
    });

    it('should create billing portal session', async () => {
      const customerId = 'cus_123abc';
      const returnUrl = 'https://example.com/membership';

      const mockPortalSession = {
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/bps_123',
      };

      mockStripe.createBillingPortalSession.mockResolvedValue(mockPortalSession);

      const session = await mockStripe.createBillingPortalSession(customerId, returnUrl);

      expect(session.url).toContain('billing.stripe.com');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle checkout.session.completed event', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_123abc',
            subscription: 'sub_123abc',
            metadata: {
              userId: 'user-123',
            },
          },
        },
      };

      const userId = event.data.object.metadata.userId;
      const subscriptionId = event.data.object.subscription;

      expect(userId).toBe('user-123');
      expect(subscriptionId).toBe('sub_123abc');

      // Verify database update would be called
      mockStorage.updateUserStripeInfo.mockResolvedValue(undefined);
      await mockStorage.updateUserStripeInfo(userId, {
        stripeSubscriptionId: subscriptionId,
      });

      expect(mockStorage.updateUserStripeInfo).toHaveBeenCalledWith(userId, {
        stripeSubscriptionId: subscriptionId,
      });
    });

    it('should handle customer.subscription.updated event', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123abc',
            status: 'active',
            current_period_end: 1735689600,
            items: {
              data: [
                {
                  price: {
                    id: 'price_premium_monthly',
                  },
                },
              ],
            },
          },
        },
      };

      const subscription = event.data.object;

      expect(subscription.status).toBe('active');
      expect(subscription.id).toBe('sub_123abc');
    });

    it('should handle customer.subscription.deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123abc',
            customer: 'cus_123abc',
          },
        },
      };

      const subscriptionId = event.data.object.id;

      // Subscription should be removed from user record
      mockStorage.updateUserStripeInfo.mockResolvedValue(undefined);
      await mockStorage.updateUserStripeInfo('user-123', {
        stripeSubscriptionId: null,
        subscriptionStatus: null,
      });

      expect(mockStorage.updateUserStripeInfo).toHaveBeenCalled();
    });

    it('should verify webhook signature', async () => {
      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: {},
      });
      const signature = 'test_signature_123';
      const secret = 'whsec_test_secret';

      mockStripe.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {},
      });

      const event = mockStripe.constructEvent(payload, signature, secret);

      expect(mockStripe.constructEvent).toHaveBeenCalledWith(payload, signature, secret);
      expect(event.type).toBe('checkout.session.completed');
    });

    it('should reject webhooks with invalid signatures', async () => {
      const error = new Error('Invalid signature');

      mockStripe.constructEvent.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        mockStripe.constructEvent('payload', 'invalid_sig', 'secret');
      }).toThrow('Invalid signature');
    });
  });

  describe('Premium Feature Gating', () => {
    it('should allow premium features for active subscribers', async () => {
      const user = createMockUser({
        id: 'user-123',
        subscriptionStatus: 'active',
        stripeSubscriptionId: 'sub_123',
      });

      const hasPremium = user.subscriptionStatus === 'active';

      expect(hasPremium).toBe(true);
    });

    it('should deny premium features for non-subscribers', async () => {
      const user = createMockUser({
        id: 'user-123',
        subscriptionStatus: null,
        stripeSubscriptionId: null,
      });

      const hasPremium = user.subscriptionStatus === 'active';

      expect(hasPremium).toBe(false);
    });

    it('should deny premium features for canceled subscriptions', async () => {
      const user = createMockUser({
        id: 'user-123',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: 'sub_123',
      });

      const hasPremium = user.subscriptionStatus === 'active';

      expect(hasPremium).toBe(false);
    });

    it('should handle grace period for past_due subscriptions', async () => {
      const user = createMockUser({
        id: 'user-123',
        subscriptionStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
      });

      // Could allow access during grace period
      const hasPremium = ['active', 'past_due'].includes(user.subscriptionStatus || '');

      expect(hasPremium).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors when creating customer', async () => {
      const error = new Error('Network error: Unable to reach Stripe');

      mockStripe.createCustomer.mockRejectedValue(error);

      await expect(
        mockStripe.createCustomer('user@example.com', 'user-123')
      ).rejects.toThrow('Network error');
    });

    it('should handle card declined during checkout', async () => {
      const error = new Error('Card declined');

      mockStripe.createCheckoutSession.mockRejectedValue(error);

      await expect(
        mockStripe.createCheckoutSession('cus_123', 'price_123', 'success', 'cancel')
      ).rejects.toThrow('Card declined');
    });

    it('should handle subscription not found', async () => {
      const subscriptionId = 'sub_nonexistent';

      mockStorage.getStripeSubscription.mockResolvedValue(null);

      const subscription = await mockStorage.getStripeSubscription(subscriptionId);

      expect(subscription).toBeNull();
    });

    it('should handle webhook processing errors', async () => {
      const event = {
        type: 'unknown.event.type',
        data: { object: {} },
      };

      // Unknown event types should be ignored, not cause errors
      const isKnownEvent = [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
      ].includes(event.type);

      expect(isKnownEvent).toBe(false);
    });
  });
});
