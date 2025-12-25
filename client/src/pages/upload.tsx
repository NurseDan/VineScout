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
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
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

    // Detect delimiter: tab or comma
    // Amazon Vine exports use tabs, standard CSV uses commas
    const firstDataLine = lines.find((line, idx) => idx > 0 && line.trim().length > 0);
    const isTabDelimited = lines[0].includes("\t") || (firstDataLine && firstDataLine.includes("\t"));
    const delimiter = isTabDelimited ? "\t" : ",";

    // Find the header row - Amazon Vine exports may have a title row before headers
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes("asin") || line.includes("product") || line.includes("order")) {
        headerRowIdx = i;
        break;
      }
    }

    const headerLine = lines[headerRowIdx];
    const headers = headerLine.toLowerCase().split(delimiter).map((h) => h.trim().replace(/"/g, ""));
    
    // Map common Amazon Vine column names
    const asinIdx = headers.findIndex((h) => h === "asin" || h.includes("asin") || h === "product id");
    const descIdx = headers.findIndex((h) => 
      h === "product name" || h === "product" || h.includes("name") || 
      h.includes("description") || h.includes("title")
    );
    const taxIdx = headers.findIndex((h) => 
      h === "estimated tax value" || h.includes("tax value") || 
      h.includes("etv") || h.includes("value") || h.includes("price")
    );
    const dateIdx = headers.findIndex((h) => 
      h === "order date" || h === "ordered" || 
      (h.includes("order") && h.includes("date"))
    );

    const items: ParsedItem[] = [];

    for (let i = headerRowIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      // Parse line based on delimiter
      const values = isTabDelimited 
        ? line.split("\t").map(v => v.trim().replace(/"/g, ""))
        : parseCSVLine(line);
      
      if (values.length === 0) continue;

      const asin = asinIdx >= 0 ? values[asinIdx]?.trim().replace(/"/g, "") || "" : "";
      const description = descIdx >= 0 ? values[descIdx]?.trim().replace(/"/g, "") || "" : "";
      const taxStr = taxIdx >= 0 ? values[taxIdx]?.trim().replace(/[^0-9.]/g, "") || "0" : "0";
      const dateStr = dateIdx >= 0 ? values[dateIdx]?.trim().replace(/"/g, "") || null : null;

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

  const parseExcel = useCallback((file: File): Promise<ParsedItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

          if (rows.length < 2) {
            resolve([]);
            return;
          }

          // Find header row (may have title row first)
          let headerRowIdx = 0;
          const headerLine = (rows[0] as any[]).join(" ").toLowerCase();
          if (!headerLine.includes("asin") && rows.length > 1) {
            headerRowIdx = 1;
          }

          const headers = (rows[headerRowIdx] as any[])
            .map((h) => (h ? String(h).toLowerCase().trim() : ""));

          const asinIdx = headers.findIndex((h) => h === "asin" || h.includes("asin"));
          const descIdx = headers.findIndex((h) =>
            h === "product name" || h === "product" || h.includes("name") ||
            h.includes("description") || h.includes("title")
          );
          const taxIdx = headers.findIndex((h) =>
            h === "estimated tax value" || h.includes("tax value") ||
            h.includes("etv") || h.includes("value") || h.includes("price")
          );
          const dateIdx = headers.findIndex((h) =>
            h === "order date" || h === "ordered" ||
            (h.includes("order") && h.includes("date"))
          );

          const items: ParsedItem[] = [];

          for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (!row || row.length === 0) continue;

            const asin = asinIdx >= 0 ? String(row[asinIdx] || "").trim() : "";
            const description = descIdx >= 0 ? String(row[descIdx] || "").trim() : "";
            const taxStr = taxIdx >= 0 ? String(row[taxIdx] || "0").replace(/[^0-9.]/g, "") : "0";
            const dateStr = dateIdx >= 0 ? String(row[dateIdx] || "").trim() : null;

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

          resolve(items);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const parsePDF = useCallback((file: File): Promise<ParsedItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          
          // Set up PDF.js worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          
          const pdf = await pdfjsLib.getDocument({ data }).promise;
          let fullText = "";

          // Extract text from all pages
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
          }

          // Parse as CSV since PDFs often contain tabular data in text form
          const items = parseCSV(fullText);
          resolve(items);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }, [parseCSV]);

  const handleFile = useCallback(
    async (file: File) => {
      const isCSV = file.name.endsWith(".csv");
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const isPDF = file.name.endsWith(".pdf");

      if (!isCSV && !isExcel && !isPDF) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel (.xlsx, .xls), or PDF file",
          variant: "destructive",
        });
        return;
      }

      setFileName(file.name);

      try {
        let items: ParsedItem[] = [];

        if (isCSV) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            const parsed = parseCSV(content);
            setParsedItems(parsed);
            if (parsed.length === 0) {
              toast({
                title: "No items found",
                description: "The file appears to be empty or incorrectly formatted",
                variant: "destructive",
              });
            }
          };
          reader.readAsText(file);
        } else if (isExcel) {
          items = await parseExcel(file);
          setParsedItems(items);
          if (items.length === 0) {
            toast({
              title: "No items found",
              description: "The Excel file appears to be empty or incorrectly formatted",
              variant: "destructive",
            });
          }
        } else if (isPDF) {
          items = await parsePDF(file);
          setParsedItems(items);
          if (items.length === 0) {
            toast({
              title: "No items found",
              description: "The PDF file appears to be empty or incorrectly formatted",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        toast({
          title: "File parsing error",
          description: `Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
      }
    },
    [parseCSV, parseExcel, parsePDF, toast]
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
          <CardTitle className="text-lg font-medium">Upload Inventory File</CardTitle>
          <CardDescription>
            Drag and drop or click to select your Amazon Vine order export (CSV, Excel, or PDF)
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
              accept=".csv,.xlsx,.xls,.pdf"
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
                {isDragActive ? "Drop your file here" : "Drop your file here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports CSV, Excel (.xlsx, .xls), and PDF files
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
