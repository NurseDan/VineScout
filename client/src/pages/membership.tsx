import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, Star, Zap, Crown, ExternalLink } from "lucide-react";
import { useLocation, useSearch } from "wouter";

type Price = {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
  metadata: Record<string, string> | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string> | null;
  prices: Price[];
};

type Subscription = {
  id: string;
  status: string;
  current_period_end: number;
};

const tierIcons: Record<string, typeof Star> = {
  free: Star,
  pro: Zap,
  business: Crown,
};

const tierFeatures: Record<string, string[]> = {
  free: [
    "Basic inventory tracking",
    "Up to 100 items",
    "Manual CSV import",
    "Basic analytics",
  ],
  pro: [
    "Unlimited inventory items",
    "Advanced analytics dashboard",
    "Email import from Gmail",
    "Barcode scanning",
    "Storage optimization",
    "Priority email support",
  ],
  business: [
    "Everything in Pro",
    "API access",
    "Team collaboration",
    "Custom integrations",
    "Dedicated support",
    "White-label options",
  ],
};

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function MembershipTierCard({ 
  product, 
  isCurrentPlan,
  onSubscribe,
  isSubscribing
}: { 
  product: Product;
  isCurrentPlan: boolean;
  onSubscribe: (priceId: string) => void;
  isSubscribing: boolean;
}) {
  const tierKey = product.metadata?.tier?.toLowerCase() || product.name.toLowerCase();
  const Icon = tierIcons[tierKey] || Star;
  const features = tierFeatures[tierKey] || [];
  const price = product.prices[0];
  const isFree = tierKey === 'free' || !price || price.unit_amount === 0;
  const isPopular = tierKey === 'pro';

  return (
    <Card className={`relative flex flex-col ${isPopular ? 'border-primary' : ''}`} data-testid={`card-tier-${tierKey}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
          Most Popular
        </Badge>
      )}
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6 text-center">
          {isFree ? (
            <div className="text-3xl font-bold">Free</div>
          ) : (
            <>
              <span className="text-3xl font-bold">
                {formatPrice(price.unit_amount, price.currency)}
              </span>
              {price.recurring && (
                <span className="text-muted-foreground">/{price.recurring.interval}</span>
              )}
            </>
          )}
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrentPlan ? (
          <Button className="w-full" variant="outline" disabled data-testid={`button-current-${tierKey}`}>
            Current Plan
          </Button>
        ) : isFree ? (
          <Button className="w-full" variant="outline" disabled data-testid={`button-free-${tierKey}`}>
            Free Forever
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={() => onSubscribe(price.id)}
            disabled={isSubscribing}
            data-testid={`button-subscribe-${tierKey}`}
          >
            {isSubscribing ? "Processing..." : "Subscribe"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function MembershipContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['/api/products'],
  });

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<{ subscription: Subscription | null }>({
    queryKey: ['/api/subscription'],
    enabled: !!user,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest('POST', '/api/checkout', { priceId });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/billing-portal', {});
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  if (success === 'true') {
    toast({
      title: "Success",
      description: "Thank you for subscribing! Your membership is now active.",
    });
  }

  if (canceled === 'true') {
    toast({
      title: "Canceled",
      description: "Checkout was canceled. No charges were made.",
    });
  }

  if (productsLoading || subscriptionLoading) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto mb-4 h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="text-center">
                <Skeleton className="mx-auto mb-4 h-12 w-12 rounded-full" />
                <Skeleton className="mx-auto mb-2 h-6 w-24" />
                <Skeleton className="mx-auto h-4 w-32" />
              </CardHeader>
              <CardContent className="flex-1">
                <Skeleton className="mx-auto mb-6 h-8 w-20" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-5 w-full" />
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const products = productsData?.data || [];
  const subscription = subscriptionData?.subscription;
  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status);

  const defaultTiers: Product[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      active: true,
      metadata: { tier: 'free' },
      prices: [],
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For power users who need more',
      active: true,
      metadata: { tier: 'pro' },
      prices: [{ id: 'price_pro', unit_amount: 999, currency: 'usd', recurring: { interval: 'month' }, active: true, metadata: null }],
    },
    {
      id: 'business',
      name: 'Business',
      description: 'For teams and enterprises',
      active: true,
      metadata: { tier: 'business' },
      prices: [{ id: 'price_business', unit_amount: 2999, currency: 'usd', recurring: { interval: 'month' }, active: true, metadata: null }],
    },
  ];

  const displayProducts = products.length > 0 ? products : defaultTiers;

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold" data-testid="text-membership-title">Membership Plans</h1>
        <p className="mt-2 text-muted-foreground">
          Choose the plan that's right for your Amazon Vine tracking needs
        </p>
      </div>

      {hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Your Current Subscription</CardTitle>
              <CardDescription>
                Status: <Badge variant="default" className="ml-2">{subscription.status}</Badge>
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-subscription"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {portalMutation.isPending ? "Opening..." : "Manage Subscription"}
            </Button>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {displayProducts.map((product) => (
          <MembershipTierCard
            key={product.id}
            product={product}
            isCurrentPlan={false}
            onSubscribe={(priceId) => checkoutMutation.mutate(priceId)}
            isSubscribing={checkoutMutation.isPending}
          />
        ))}
      </div>

      {products.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Products will be loaded once Stripe is configured. The plans above are for preview only.
        </p>
      )}
    </div>
  );
}

export default function MembershipPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold" data-testid="text-login-required">Sign In Required</h1>
        <p className="text-muted-foreground">Please sign in to view membership options.</p>
        <Button asChild data-testid="button-sign-in">
          <a href="/api/login">Sign In with Replit</a>
        </Button>
      </div>
    );
  }

  return <MembershipContent />;
}
