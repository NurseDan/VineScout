import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Printer,
  Search,
  Package,
  Calendar,
  MapPin,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import type { VineItem } from "@shared/schema";
import { format, addMonths } from "date-fns";

export default function LabelsPage() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const initialAsin = urlParams.get("asin") || "";

  const [searchQuery, setSearchQuery] = useState(initialAsin);
  const [selectedItem, setSelectedItem] = useState<VineItem | null>(null);
  const [labelSize, setLabelSize] = useState<"small" | "medium" | "large">("medium");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: items, isLoading } = useQuery<VineItem[]>({
    queryKey: ["/api/items"],
  });

  const filteredItems = (items || []).filter(
    (item) =>
      item.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select if exact ASIN match
  if (initialAsin && !selectedItem && items) {
    const match = items.find((i) => i.asin === initialAsin);
    if (match) {
      setSelectedItem(match);
    }
  }

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const labelHtml = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label</title>
          <style>
            @page { margin: 0; }
            body { 
              margin: 0; 
              padding: 8px;
              font-family: 'Inter', system-ui, sans-serif;
            }
            .label-container {
              width: ${labelSize === "small" ? "2in" : labelSize === "medium" ? "2.25in" : "4in"};
              padding: 8px;
              border: 1px solid #ccc;
              font-size: ${labelSize === "small" ? "8px" : labelSize === "medium" ? "9px" : "11px"};
            }
            .label-title {
              font-weight: 600;
              font-size: ${labelSize === "small" ? "9px" : labelSize === "medium" ? "10px" : "13px"};
              margin-bottom: 4px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .label-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .label-key {
              color: #666;
            }
            .label-value {
              font-family: monospace;
            }
            .label-asin {
              font-family: monospace;
              font-size: ${labelSize === "small" ? "10px" : labelSize === "medium" ? "12px" : "16px"};
              font-weight: 700;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .label-location {
              background: #000;
              color: #fff;
              padding: 4px 8px;
              font-weight: 600;
              font-size: ${labelSize === "small" ? "10px" : labelSize === "medium" ? "12px" : "14px"};
              text-align: center;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          ${labelHtml}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return <LabelsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Label Generator</h1>
        <p className="text-muted-foreground">
          Create and print labels for your Dymo label maker
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Item Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Select Item</CardTitle>
            <CardDescription>
              Search for an item to generate a label
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ASIN or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-label-search"
                />
              </div>

              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground">
                      No items found
                    </span>
                  </div>
                ) : (
                  filteredItems.slice(0, 20).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`flex items-center gap-3 rounded-md p-3 text-left transition-colors hover-elevate ${
                        selectedItem?.id === item.id
                          ? "bg-primary/10 ring-1 ring-primary"
                          : "bg-muted/50"
                      }`}
                      data-testid={`item-select-${item.id}`}
                    >
                      {selectedItem?.id === item.id && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
                          {item.description}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.asin}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Label Preview & Print */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-medium">Label Preview</CardTitle>
              <CardDescription>
                Preview and print your label
              </CardDescription>
            </div>
            <Select
              value={labelSize}
              onValueChange={(v) => setLabelSize(v as any)}
            >
              <SelectTrigger className="w-32" data-testid="select-label-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (2")</SelectItem>
                <SelectItem value="medium">Medium (2.25")</SelectItem>
                <SelectItem value="large">Large (4")</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {!selectedItem ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-12 text-center">
                <Tag className="h-12 w-12 text-muted-foreground/50" />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">No item selected</span>
                  <span className="text-sm text-muted-foreground">
                    Select an item to preview its label
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Visual Preview */}
                <div className="flex justify-center">
                  <div
                    ref={printRef}
                    className={`rounded border bg-white p-4 text-black shadow-sm ${
                      labelSize === "small"
                        ? "w-48"
                        : labelSize === "medium"
                        ? "w-56"
                        : "w-80"
                    }`}
                    data-testid="label-preview"
                  >
                    <div className="label-container">
                      <div className="label-asin">{selectedItem.asin}</div>
                      <div
                        className="label-title"
                        title={selectedItem.description}
                      >
                        {selectedItem.description.length > 40
                          ? selectedItem.description.substring(0, 40) + "..."
                          : selectedItem.description}
                      </div>
                      <div className="label-row">
                        <span className="label-key">Ordered:</span>
                        <span className="label-value">
                          {selectedItem.orderDate
                            ? format(new Date(selectedItem.orderDate), "MM/dd/yy")
                            : "N/A"}
                        </span>
                      </div>
                      <div className="label-row">
                        <span className="label-key">Received:</span>
                        <span className="label-value">
                          {selectedItem.receivedDate
                            ? format(new Date(selectedItem.receivedDate), "MM/dd/yy")
                            : "N/A"}
                        </span>
                      </div>
                      <div className="label-row">
                        <span className="label-key">Can Sell:</span>
                        <span className="label-value">
                          {selectedItem.receivedDate
                            ? format(
                                addMonths(new Date(selectedItem.receivedDate), 6),
                                "MM/dd/yy"
                              )
                            : "N/A"}
                        </span>
                      </div>
                      {selectedItem.storageLocation && (
                        <div className="label-location">
                          {selectedItem.storageLocation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Label Data Details */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{selectedItem.asin}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Order:{" "}
                      {selectedItem.orderDate
                        ? format(new Date(selectedItem.orderDate), "MMM d, yyyy")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Location: {selectedItem.storageLocation || "Not assigned"}
                    </span>
                  </div>
                </div>

                {/* Print Button */}
                <Button
                  onClick={handlePrint}
                  className="w-full"
                  data-testid="button-print-label"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Label
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LabelsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
