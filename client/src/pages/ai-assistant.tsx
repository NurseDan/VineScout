import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { VineItem } from "@shared/schema";
import { 
  Brain, 
  Sparkles, 
  Warehouse, 
  Bell, 
  DollarSign,
  TrendingUp,
  Lightbulb,
  Crown,
  ArrowRight,
  Loader2,
  Package,
  AlertCircle,
  CheckCircle
} from "lucide-react";

type AnalysisResult = {
  totalItems: number;
  insights: string[];
  recommendations: string[];
  statusBreakdown: Record<string, number>;
};

type StorageSuggestion = {
  suggestedUnit: string | null;
  reasoning: string;
  alternativeLocations: string[];
};

type ReviewReminder = {
  subject: string;
  body: string;
  keyPoints: string[];
};

type PriceSuggestion = {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  reasoning: string;
  tips: string[];
};

function UpgradePrompt() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
          <CardDescription className="text-base">
            The AI Inventory Assistant is a premium feature. Upgrade your subscription to unlock powerful AI-driven insights for your Vine inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Inventory analysis with AI insights
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Smart storage location suggestions
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Review reminder generator
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              AI-powered pricing recommendations
            </li>
          </ul>
          <Link href="/membership">
            <Button className="w-full" data-testid="button-upgrade">
              Upgrade Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AIAssistantPage() {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [storageSuggestion, setStorageSuggestion] = useState<StorageSuggestion | null>(null);
  const [reviewReminder, setReviewReminder] = useState<ReviewReminder | null>(null);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery<{ subscription: any }>({
    queryKey: ["/api/subscription"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery<VineItem[]>({
    queryKey: ["/api/items"],
    enabled: !!subscription?.subscription,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/analyze", {});
      return res.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast({ title: "Analysis complete", description: "Your inventory has been analyzed." });
    },
    onError: (error: any) => {
      if (error?.upgradeRequired) {
        return;
      }
      toast({ title: "Error", description: "Failed to analyze inventory.", variant: "destructive" });
    },
  });

  const storageMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", "/api/ai/suggest-storage", { itemId });
      return res.json() as Promise<StorageSuggestion>;
    },
    onSuccess: (data) => {
      setStorageSuggestion(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to get storage suggestion.", variant: "destructive" });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", "/api/ai/review-reminder", { itemId });
      return res.json() as Promise<ReviewReminder>;
    },
    onSuccess: (data) => {
      setReviewReminder(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate reminder.", variant: "destructive" });
    },
  });

  const priceMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", "/api/ai/sell-price", { itemId });
      return res.json() as Promise<PriceSuggestion>;
    },
    onSuccess: (data) => {
      setPriceSuggestion(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to predict price.", variant: "destructive" });
    },
  });

  if (subscriptionLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!subscription?.subscription) {
    return <UpgradePrompt />;
  }

  const selectedItem = items?.find((i) => i.id === selectedItemId);
  const receivedItems = items?.filter((i) => i.status === "received" || i.status === "reviewing") || [];
  const sellableItems = items?.filter((i) => i.status === "sellable") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Inventory Assistant
          </h1>
          <p className="text-muted-foreground">
            Get AI-powered insights and recommendations for your Vine inventory
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Premium Feature
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Inventory Analysis
              </CardTitle>
              <CardDescription>
                Get AI insights about your entire inventory
              </CardDescription>
            </div>
            <Button 
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analyze
            </Button>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analysis.statusBreakdown).map(([status, count]) => (
                    <Badge key={status} variant="outline">
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Insights
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">-</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">-</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click Analyze to get AI-powered insights about your inventory.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Storage Suggestions
            </CardTitle>
            <CardDescription>
              Get AI recommendations for optimal storage locations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="flex-1" data-testid="select-item-storage">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.description.slice(0, 40)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => selectedItemId && storageMutation.mutate(selectedItemId)}
                disabled={!selectedItemId || storageMutation.isPending}
                data-testid="button-suggest-storage"
              >
                {storageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Suggest"
                )}
              </Button>
            </div>
            {storageSuggestion && (
              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                {storageSuggestion.suggestedUnit ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">Suggested: {storageSuggestion.suggestedUnit}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{storageSuggestion.reasoning}</p>
                    {storageSuggestion.alternativeLocations.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Alternatives: {storageSuggestion.alternativeLocations.join(", ")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>{storageSuggestion.reasoning}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Review Reminder Generator
            </CardTitle>
            <CardDescription>
              Generate helpful reminders for items needing review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select 
                value={selectedItemId} 
                onValueChange={(v) => {
                  setSelectedItemId(v);
                  setReviewReminder(null);
                }}
              >
                <SelectTrigger className="flex-1" data-testid="select-item-reminder">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {receivedItems.length > 0 ? (
                    receivedItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.description.slice(0, 40)}...
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled>No items pending review</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={() => selectedItemId && reminderMutation.mutate(selectedItemId)}
                disabled={!selectedItemId || reminderMutation.isPending}
                data-testid="button-generate-reminder"
              >
                {reminderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
            {reviewReminder && (
              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Subject</p>
                  <p className="font-medium">{reviewReminder.subject}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Message</p>
                  <p className="text-sm">{reviewReminder.body}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Key Points to Cover</p>
                  <ul className="text-sm space-y-1">
                    {reviewReminder.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">-</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Price Suggestions
            </CardTitle>
            <CardDescription>
              Get AI pricing recommendations for sellable items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select 
                value={selectedItemId} 
                onValueChange={(v) => {
                  setSelectedItemId(v);
                  setPriceSuggestion(null);
                }}
              >
                <SelectTrigger className="flex-1" data-testid="select-item-price">
                  <SelectValue placeholder="Select a sellable item" />
                </SelectTrigger>
                <SelectContent>
                  {sellableItems.length > 0 ? (
                    sellableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.description.slice(0, 40)}... (${item.taxValue})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled>No sellable items</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={() => selectedItemId && priceMutation.mutate(selectedItemId)}
                disabled={!selectedItemId || priceMutation.isPending}
                data-testid="button-predict-price"
              >
                {priceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Predict"
                )}
              </Button>
            </div>
            {priceSuggestion && (
              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Suggested Price</span>
                  <span className="text-2xl font-bold">${priceSuggestion.suggestedPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price Range</span>
                  <span>${priceSuggestion.priceRange.min.toFixed(2)} - ${priceSuggestion.priceRange.max.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{priceSuggestion.reasoning}</p>
                {priceSuggestion.tips.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Selling Tips</p>
                    <ul className="text-sm space-y-1">
                      {priceSuggestion.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500">-</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
