import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UploadRecord, VineItem } from "@shared/schema";
import { format } from "date-fns";

type ParsedItem = {
  asin: string;
  description: string;
  taxValue: number;
  orderDate: string | null;
  isValid: boolean;
  error?: string;
};

export default function UploadPage() {
  const { toast } = useToast();
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const { data: uploadHistory, isLoading: historyLoading } = useQuery<UploadRecord[]>({
    queryKey: ["/api/uploads"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (items: ParsedItem[]) => {
      const validItems = items.filter((item) => item.isValid);
      return apiRequest("POST", "/api/items/bulk", { items: validItems });
    },
    onSuccess: (data: any) => {
      let description = `${data.count} items imported successfully`;
      if (data.skipped > 0) {
        description += `. ${data.skipped} items skipped (duplicates or invalid data)`;
      }
      toast({
        title: "Upload complete",
        description,
      });
      setParsedItems([]);
      setFileName(null);
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const parseCSV = useCallback((content: string) => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
    const asinIdx = headers.findIndex((h) => h.includes("asin") || h === "product id");
    const descIdx = headers.findIndex((h) => h.includes("description") || h.includes("title") || h.includes("product"));
    const taxIdx = headers.findIndex((h) => h.includes("tax") || h.includes("value") || h.includes("price"));
    const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("ordered"));

    const items: ParsedItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const asin = asinIdx >= 0 ? values[asinIdx]?.trim().replace(/"/g, "") : "";
      const description = descIdx >= 0 ? values[descIdx]?.trim().replace(/"/g, "") : "";
      const taxStr = taxIdx >= 0 ? values[taxIdx]?.trim().replace(/[^0-9.]/g, "") : "0";
      const dateStr = dateIdx >= 0 ? values[dateIdx]?.trim().replace(/"/g, "") : null;

      const taxValue = parseFloat(taxStr) || 0;
      const isValid = asin.length > 0 && description.length > 0;

      items.push({
        asin,
        description,
        taxValue,
        orderDate: dateStr,
        isValid,
        error: !isValid ? "Missing ASIN or description" : undefined,
      });
    }

    return items;
  }, []);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const items = parseCSV(content);
        setParsedItems(items);

        if (items.length === 0) {
          toast({
            title: "No items found",
            description: "The CSV file appears to be empty or incorrectly formatted",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    },
    [parseCSV, toast]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const validCount = parsedItems.filter((item) => item.isValid).length;
  const invalidCount = parsedItems.length - validCount;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Upload Items</h1>
        <p className="text-muted-foreground">
          Import your Amazon Vine orders from CSV files
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upload CSV File</CardTitle>
          <CardDescription>
            Drag and drop or click to select your Amazon Vine order export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            data-testid="upload-dropzone"
          >
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              data-testid="input-file"
            />
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {isDragActive ? "Drop your file here" : "Drop CSV file here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports Amazon Vine CSV exports
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parsed Items Preview */}
      {parsedItems.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-medium">
                Preview: {fileName}
              </CardTitle>
              <CardDescription>
                {validCount} valid items, {invalidCount} with issues
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setParsedItems([]);
                  setFileName(null);
                }}
                data-testid="button-clear-preview"
              >
                Clear
              </Button>
              <Button
                onClick={() => uploadMutation.mutate(parsedItems)}
                disabled={validCount === 0 || uploadMutation.isPending}
                data-testid="button-import-items"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Import {validCount} Items</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead className="w-32">ASIN</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-right">Tax Value</TableHead>
                    <TableHead className="w-32">Order Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedItems.slice(0, 50).map((item, idx) => (
                    <TableRow key={idx} data-testid={`preview-row-${idx}`}>
                      <TableCell>
                        {item.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.asin || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.taxValue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.orderDate || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedItems.length > 50 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Showing 50 of {parsedItems.length} items
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !uploadHistory || uploadHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">
                No uploads yet
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {uploadHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-4"
                  data-testid={`upload-record-${record.id}`}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{record.filename}</span>
                      <span className="text-xs text-muted-foreground">
                        {record.uploadedAt
                          ? format(new Date(record.uploadedAt), "MMM d, yyyy 'at' h:mm a")
                          : "Unknown date"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {record.itemsImported} items
                    </Badge>
                    {record.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
