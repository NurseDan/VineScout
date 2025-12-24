import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ScanBarcode,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  MapPin,
  Calendar,
  Loader2,
  XCircle,
} from "lucide-react";
import type { VineItem, ScanLog } from "@shared/schema";
import { format, addDays, addMonths } from "date-fns";
import { Link } from "wouter";

export default function ScanPage() {
  const { toast } = useToast();
  const [scanInput, setScanInput] = useState("");
  const [lastScannedItem, setLastScannedItem] = useState<VineItem | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found" | "not_found">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: recentScans, isLoading: scansLoading } = useQuery<ScanLog[]>({
    queryKey: ["/api/scans/recent"],
  });

  const scanMutation = useMutation({
    mutationFn: async (asin: string) => {
      return apiRequest("POST", "/api/scan", { asin });
    },
    onSuccess: (data: any) => {
      if (data.item) {
        setLastScannedItem(data.item);
        setScanStatus("found");
        toast({
          title: "Item found",
          description: `${data.item.description.substring(0, 50)}...`,
        });
      } else {
        setLastScannedItem(null);
        setScanStatus("not_found");
        toast({
          title: "Item not found",
          description: `No item with ASIN ${scanInput} in your inventory`,
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/scans/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      setScanStatus("not_found");
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markReceivedMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/items/${id}/receive`, {});
    },
    onSuccess: (data: any) => {
      setLastScannedItem(data.item);
      toast({
        title: "Item marked as received",
        description: "Review clock started",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark received",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScan = () => {
    const asin = scanInput.trim().toUpperCase();
    if (!asin) return;

    setScanStatus("scanning");
    scanMutation.mutate(asin);
    setScanInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  // Focus input on mount for barcode scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Scan Item</h1>
        <p className="text-muted-foreground">
          Use your barcode scanner or enter ASIN manually
        </p>
      </div>

      {/* Scan Input Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Barcode Scanner</CardTitle>
          <CardDescription>
            Click the input field and scan a barcode, or type the ASIN manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            {/* Scanner Visual */}
            <div
              className={`flex h-40 w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                scanStatus === "scanning"
                  ? "border-primary bg-primary/5"
                  : scanStatus === "found"
                  ? "border-green-500 bg-green-500/5"
                  : scanStatus === "not_found"
                  ? "border-destructive bg-destructive/5"
                  : "border-muted-foreground/25"
              }`}
              data-testid="scan-zone"
            >
              {scanStatus === "scanning" ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              ) : scanStatus === "found" ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <span className="text-sm font-medium text-green-500">Item Found</span>
                </div>
              ) : scanStatus === "not_found" ? (
                <div className="flex flex-col items-center gap-3">
                  <XCircle className="h-12 w-12 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Not Found</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <ScanBarcode className="h-12 w-12 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ready to scan</span>
                </div>
              )}
            </div>

            {/* Input Field */}
            <div className="flex w-full max-w-md gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Enter ASIN or scan barcode..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="font-mono text-lg"
                autoComplete="off"
                data-testid="input-scan"
              />
              <Button
                onClick={handleScan}
                disabled={!scanInput.trim() || scanMutation.isPending}
                data-testid="button-scan"
              >
                {scanMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Scan"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Scanned Item */}
      {lastScannedItem && (
        <Card data-testid="scanned-item-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-medium">Scanned Item</CardTitle>
              <CardDescription className="font-mono">
                {lastScannedItem.asin}
              </CardDescription>
            </div>
            <StatusBadge status={lastScannedItem.status} />
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Description
                  </span>
                  <span className="text-sm" data-testid="scanned-description">
                    {lastScannedItem.description}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Tax Value
                  </span>
                  <span className="font-mono">
                    ${(lastScannedItem.taxValue || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Storage Location
                  </span>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">
                      {lastScannedItem.storageLocation || "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Order Date
                  </span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {lastScannedItem.orderDate
                        ? format(new Date(lastScannedItem.orderDate), "MMM d, yyyy")
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Received Date
                  </span>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {lastScannedItem.receivedDate
                        ? format(new Date(lastScannedItem.receivedDate), "MMM d, yyyy")
                        : "Not received"}
                    </span>
                  </div>
                </div>

                {lastScannedItem.reviewDueDate && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      Review Due
                    </span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(lastScannedItem.reviewDueDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
              {lastScannedItem.status === "ordered" && (
                <Button
                  onClick={() => markReceivedMutation.mutate(lastScannedItem.id)}
                  disabled={markReceivedMutation.isPending}
                  data-testid="button-mark-received"
                >
                  {markReceivedMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Mark Received
                </Button>
              )}
              <Link href={`/labels?asin=${lastScannedItem.asin}`}>
                <Button variant="outline" data-testid="button-print-label">
                  <Tag className="mr-2 h-4 w-4" />
                  Print Label
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Scans</CardTitle>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !recentScans || recentScans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <ScanBarcode className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">
                No scans yet
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentScans.slice(0, 10).map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3"
                  data-testid={`scan-log-${scan.id}`}
                >
                  <div className="flex items-center gap-3">
                    <ScanBarcode className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm">{scan.asin}</span>
                      <span className="text-xs text-muted-foreground">
                        {scan.action === "received"
                          ? "Marked received"
                          : scan.action === "label_print"
                          ? "Label printed"
                          : "Looked up"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {scan.scannedAt
                      ? format(new Date(scan.scannedAt), "MMM d, h:mm a")
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ordered: { label: "Ordered", className: "bg-blue-500/10 text-blue-500" },
    shipped: { label: "Shipped", className: "bg-purple-500/10 text-purple-500" },
    received: { label: "Received", className: "bg-amber-500/10 text-amber-500" },
    reviewing: { label: "Reviewing", className: "bg-orange-500/10 text-orange-500" },
    reviewed: { label: "Reviewed", className: "bg-green-500/10 text-green-500" },
    sellable: { label: "Sellable", className: "bg-emerald-500/10 text-emerald-500" },
  };

  const s = config[status] || config.ordered;

  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}
