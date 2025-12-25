import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  Package,
  Eye,
  Tag,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShoppingCart,
  Truck,
  Star,
  Ruler,
  Scale,
  Edit2,
  Save,
  X,
} from "lucide-react";
import type { VineItem, ITEM_STATUSES } from "@shared/schema";
import { format, differenceInDays, addDays, addMonths } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ordered: { label: "Ordered", color: "bg-blue-500/10 text-blue-500", icon: ShoppingCart },
  shipped: { label: "Shipped", color: "bg-purple-500/10 text-purple-500", icon: Truck },
  received: { label: "Received", color: "bg-amber-500/10 text-amber-500", icon: Package },
  reviewing: { label: "Reviewing", color: "bg-orange-500/10 text-orange-500", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-green-500/10 text-green-500", icon: Star },
  sellable: { label: "Sellable", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
};

export default function InventoryPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<VineItem | null>(null);

  const { data: items, isLoading } = useQuery<VineItem[]>({
    queryKey: ["/api/items"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/items/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const filteredItems = (items || []).filter((item) => {
    const matchesSearch =
      item.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <InventorySkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-muted-foreground">
          Manage all your Amazon Vine items
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ASIN or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="sellable">Sellable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg font-medium">
            {filteredItems.length} Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <div className="flex flex-col gap-1">
                <span className="font-medium">No items found</span>
                <span className="text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Upload a CSV to get started"}
                </span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">ASIN</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-28">Order Date</TableHead>
                    <TableHead className="w-28">Received</TableHead>
                    <TableHead className="w-28">Review Due</TableHead>
                    <TableHead className="w-28">Storage</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <InventoryRow
                      key={item.id}
                      item={item}
                      onView={() => setSelectedItem(item)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdateStatus={(status) => {
          if (selectedItem) {
            updateStatusMutation.mutate({ id: selectedItem.id, status });
            setSelectedItem(null);
          }
        }}
      />
    </div>
  );
}

function InventoryRow({
  item,
  onView,
}: {
  item: VineItem;
  onView: () => void;
}) {
  const status = statusConfig[item.status] || statusConfig.ordered;
  const StatusIcon = status.icon;

  const reviewDue = item.reviewDueDate ? new Date(item.reviewDueDate) : null;
  const daysUntilReview = reviewDue ? differenceInDays(reviewDue, new Date()) : null;

  return (
    <TableRow data-testid={`item-row-${item.id}`}>
      <TableCell className="font-mono text-sm">{item.asin}</TableCell>
      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`gap-1 ${status.color}`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {item.orderDate ? format(new Date(item.orderDate), "MMM d, yyyy") : "-"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {item.receivedDate ? format(new Date(item.receivedDate), "MMM d, yyyy") : "-"}
      </TableCell>
      <TableCell>
        {reviewDue ? (
          <div className="flex items-center gap-1">
            {daysUntilReview !== null && daysUntilReview < 0 ? (
              <AlertCircle className="h-3 w-3 text-destructive" />
            ) : daysUntilReview !== null && daysUntilReview <= 3 ? (
              <Clock className="h-3 w-3 text-amber-500" />
            ) : null}
            <span className="text-sm">{format(reviewDue, "MMM d")}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {item.storageLocation || "-"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onView}
            data-testid={`button-view-${item.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ItemDetailModal({
  item,
  open,
  onClose,
  onUpdateStatus,
}: {
  item: VineItem | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
}) {
  const { toast } = useToast();
  const [editingDimensions, setEditingDimensions] = useState(false);
  const [dimensions, setDimensions] = useState({
    lengthIn: "",
    widthIn: "",
    heightIn: "",
    weightLb: "",
  });

  const updateDimensionsMutation = useMutation({
    mutationFn: async (data: { lengthIn: number | null; widthIn: number | null; heightIn: number | null; weightLb: number | null }) => {
      return apiRequest("PATCH", `/api/items/${item?.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Dimensions updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setEditingDimensions(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update dimensions", description: error.message, variant: "destructive" });
    },
  });

  const handleEditDimensions = () => {
    if (item) {
      setDimensions({
        lengthIn: item.lengthIn?.toString() || "",
        widthIn: item.widthIn?.toString() || "",
        heightIn: item.heightIn?.toString() || "",
        weightLb: item.weightLb?.toString() || "",
      });
      setEditingDimensions(true);
    }
  };

  const handleSaveDimensions = () => {
    updateDimensionsMutation.mutate({
      lengthIn: dimensions.lengthIn ? parseFloat(dimensions.lengthIn) : null,
      widthIn: dimensions.widthIn ? parseFloat(dimensions.widthIn) : null,
      heightIn: dimensions.heightIn ? parseFloat(dimensions.heightIn) : null,
      weightLb: dimensions.weightLb ? parseFloat(dimensions.weightLb) : null,
    });
  };

  if (!item) return null;

  const status = statusConfig[item.status] || statusConfig.ordered;
  const StatusIcon = status.icon;

  const orderDate = item.orderDate ? new Date(item.orderDate) : null;
  const receivedDate = item.receivedDate ? new Date(item.receivedDate) : null;
  const reviewDueDate = item.reviewDueDate ? new Date(item.reviewDueDate) : null;
  const sellableDate = item.sellableDate ? new Date(item.sellableDate) : null;

  const hasDimensions = item.lengthIn || item.widthIn || item.heightIn;
  const dimensionString = hasDimensions
    ? `${item.lengthIn || 0}" x ${item.widthIn || 0}" x ${item.heightIn || 0}"`
    : "Not set";

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Item Details
          </DialogTitle>
          <DialogDescription>
            View item information, timeline, and quick actions
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 sm:grid-cols-2">
          {/* Left Column - Product Info */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                ASIN
              </span>
              <span className="font-mono text-lg" data-testid="detail-asin">
                {item.asin}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </span>
              <span className="text-sm" data-testid="detail-description">
                {item.description}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Tax Value
              </span>
              <span className="font-mono" data-testid="detail-tax-value">
                ${(item.taxValue || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Storage Location
              </span>
              <span className="font-mono" data-testid="detail-storage">
                {item.storageLocation || "Not assigned"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <Badge variant="outline" className={`w-fit gap-1 ${status.color}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Right Column - Timeline & Dimensions */}
          <div className="flex flex-col gap-4">
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Timeline
            </span>
            <div className="flex flex-col gap-3">
              <TimelineItem
                label="Ordered"
                date={orderDate}
                completed={!!orderDate}
              />
              <TimelineItem
                label="Received"
                date={receivedDate}
                completed={!!receivedDate}
              />
              <TimelineItem
                label="Review Due"
                date={reviewDueDate}
                completed={item.status === "reviewed" || item.status === "sellable"}
                warning={
                  reviewDueDate &&
                  differenceInDays(reviewDueDate, new Date()) <= 3 &&
                  item.status !== "reviewed" &&
                  item.status !== "sellable"
                }
              />
              <TimelineItem
                label="Can Sell"
                date={sellableDate}
                completed={item.status === "sellable"}
              />
            </div>

            {/* Dimensions Section */}
            <div className="mt-2 border-t pt-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  Dimensions
                </span>
                {!editingDimensions && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditDimensions}
                    data-testid="button-edit-dimensions"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {editingDimensions ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Length (in)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="L"
                        value={dimensions.lengthIn}
                        onChange={(e) => setDimensions({ ...dimensions, lengthIn: e.target.value })}
                        data-testid="input-length"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Width (in)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="W"
                        value={dimensions.widthIn}
                        onChange={(e) => setDimensions({ ...dimensions, widthIn: e.target.value })}
                        data-testid="input-width"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Height (in)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="H"
                        value={dimensions.heightIn}
                        onChange={(e) => setDimensions({ ...dimensions, heightIn: e.target.value })}
                        data-testid="input-height"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Weight (lb)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Weight"
                      value={dimensions.weightLb}
                      onChange={(e) => setDimensions({ ...dimensions, weightLb: e.target.value })}
                      data-testid="input-weight"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveDimensions}
                      disabled={updateDimensionsMutation.isPending}
                      data-testid="button-save-dimensions"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingDimensions(false)}
                      data-testid="button-cancel-dimensions"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm" data-testid="detail-dimensions">
                      {dimensionString}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm" data-testid="detail-weight">
                      {item.weightLb ? `${item.weightLb} lb` : "Not set"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="text-sm font-medium text-muted-foreground">Quick Actions:</span>
          {item.status === "ordered" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus("received")}
              data-testid="button-mark-received"
            >
              Mark Received
            </Button>
          )}
          {item.status === "received" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus("reviewing")}
              data-testid="button-start-review"
            >
              Start Review
            </Button>
          )}
          {(item.status === "received" || item.status === "reviewing") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus("reviewed")}
              data-testid="button-mark-reviewed"
            >
              Mark Reviewed
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimelineItem({
  label,
  date,
  completed,
  warning,
}: {
  label: string;
  date: Date | null;
  completed: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          completed
            ? "bg-green-500/10 text-green-500"
            : warning
            ? "bg-amber-500/10 text-amber-500"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : warning ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {date ? format(date, "MMM d, yyyy") : "Pending"}
        </span>
      </div>
    </div>
  );
}

function InventorySkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-96" />
    </div>
  );
}
