import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { subMonths, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingBag, Plus, Edit, Trash2, CheckCircle, DollarSign, Package, AlertCircle, Crown } from "lucide-react";
import type { MarketplaceListingWithItem, VineItem } from "@shared/schema";
import { ITEM_STATUSES } from "@shared/schema";

const listingFormSchema = z.object({
  itemId: z.string().min(1, "Please select an item"),
  askingPrice: z.coerce.number().positive("Price must be positive"),
  description: z.string().optional(),
  condition: z.enum(["new", "like_new", "good", "fair"]),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

function ListingCard({ listing, isOwner, onEdit, onDelete, onMarkSold }: { 
  listing: MarketplaceListingWithItem; 
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkSold?: () => void;
}) {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 dark:text-green-400",
    sold: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cancelled: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  };

  const conditionLabels: Record<string, string> = {
    new: "New",
    like_new: "Like New",
    good: "Good",
    fair: "Fair",
  };

  return (
    <Card data-testid={`card-listing-${listing.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{listing.item.description}</CardTitle>
            <CardDescription className="text-xs">ASIN: {listing.item.asin}</CardDescription>
          </div>
          <Badge className={statusColors[listing.status] || ""}>
            {listing.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xl font-semibold">
            <DollarSign className="h-5 w-5" />
            {listing.askingPrice.toFixed(2)}
          </div>
          <Badge variant="outline">{conditionLabels[listing.condition] || listing.condition}</Badge>
        </div>

        {listing.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
        )}

        <div className="text-xs text-muted-foreground">
          Listed: {listing.createdAt ? format(new Date(listing.createdAt), "MMM d, yyyy") : "N/A"}
        </div>

        {isOwner && listing.status === "active" && (
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onEdit} data-testid={`button-edit-listing-${listing.id}`}>
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={onMarkSold} data-testid={`button-sold-listing-${listing.id}`}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Sold
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} data-testid={`button-delete-listing-${listing.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListingsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateListingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const { data: items = [], isLoading: itemsLoading } = useQuery<VineItem[]>({
    queryKey: ["/api/items"],
  });

  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription"],
  });

  const isPremium = !!(subscription as any)?.subscription;

  const sixMonthsAgo = subMonths(new Date(), 6);
  const eligibleItems = items.filter((item) => {
    const orderDate = item.orderDate ? new Date(item.orderDate) : new Date();
    const isOldEnough = orderDate <= sixMonthsAgo;
    const isSellable = item.status === ITEM_STATUSES.SELLABLE;
    return isOldEnough || isSellable;
  });

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      itemId: "",
      askingPrice: 0,
      description: "",
      condition: "new",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ListingFormValues) => {
      return await apiRequest("POST", "/api/marketplace", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Listing created", description: "Your item is now listed on the marketplace." });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error?.upgradeRequired) {
        toast({
          title: "Premium Required",
          description: "Only premium members can list items for sale.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to create listing",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: ListingFormValues) => {
    createMutation.mutate(data);
  };

  if (!isPremium) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Premium Feature
            </DialogTitle>
            <DialogDescription>
              Listing items on the marketplace is a premium feature. Upgrade your account to start selling your aged Vine items.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button asChild>
              <a href="/membership" data-testid="link-upgrade">Upgrade Now</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>List an Item</DialogTitle>
          <DialogDescription>
            Create a new marketplace listing for your eligible items.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Item</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-item">
                        <SelectValue placeholder="Choose an eligible item..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {itemsLoading ? (
                        <SelectItem value="_loading" disabled>Loading...</SelectItem>
                      ) : eligibleItems.length === 0 ? (
                        <SelectItem value="_none" disabled>No eligible items</SelectItem>
                      ) : (
                        eligibleItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.description.substring(0, 40)}... ({item.asin})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="askingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asking Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="29.99"
                      {...field}
                      data-testid="input-price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="like_new">Like New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details about the item..."
                      {...field}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-listing">
                {createMutation.isPending ? "Creating..." : "Create Listing"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketplacePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: allListings = [], isLoading: allLoading } = useQuery<MarketplaceListingWithItem[]>({
    queryKey: ["/api/marketplace"],
  });

  const { data: myListings = [], isLoading: myLoading } = useQuery<MarketplaceListingWithItem[]>({
    queryKey: ["/api/marketplace/my-listings"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return await apiRequest("DELETE", `/api/marketplace/${listingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Listing deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete listing", variant: "destructive" });
    },
  });

  const markSoldMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return await apiRequest("POST", `/api/marketplace/${listingId}/sold`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Marked as sold", description: "Congratulations on the sale!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update listing", variant: "destructive" });
    },
  });

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse and sell your aged Vine inventory items
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-list-item">
          <Plus className="h-4 w-4 mr-2" />
          List Item
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse" data-testid="tab-browse">
            <Package className="h-4 w-4 mr-2" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="my-listings" data-testid="tab-my-listings">
            <ShoppingBag className="h-4 w-4 mr-2" />
            My Listings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          {allLoading ? (
            <ListingsSkeleton />
          ) : allListings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No listings yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                  Be the first to list an item on the marketplace!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-listings" className="mt-6">
          {myLoading ? (
            <ListingsSkeleton />
          ) : myListings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No listings yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                  Start selling by listing your eligible Vine items.
                </p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Listing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  isOwner={true}
                  onDelete={() => deleteMutation.mutate(listing.id)}
                  onMarkSold={() => markSoldMutation.mutate(listing.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateListingDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
