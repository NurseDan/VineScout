import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Loader2, Trash2, RefreshCw, Mail, TrendingUp, CloudRain, Download, Search } from "lucide-react";
import type { ApiConnection } from "@shared/schema";

type ProviderConfig = {
  id: string;
  name: string;
  description: string;
  needsApiKey: boolean;
  icon: React.ReactNode;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "keepa",
    name: "Keepa",
    description: "Track Amazon product prices and sales rank history",
    needsApiKey: true,
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    id: "rainforest",
    name: "Rainforest API",
    description: "Real-time Amazon product data and search results",
    needsApiKey: true,
    icon: <CloudRain className="h-6 w-6" />,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Import Vine orders from Amazon email notifications",
    needsApiKey: false,
    icon: <Mail className="h-6 w-6" />,
  },
];

type GmailEmailItem = {
  asin: string;
  description: string;
  orderDate: string;
  emailId: string;
};

function GmailConnectionContent() {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: gmailStatus, isLoading: isLoadingStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/gmail/status"],
  });

  const { data: emails, isLoading: isSearching, refetch: searchEmails } = useQuery<GmailEmailItem[]>({
    queryKey: ["/api/gmail/search"],
    enabled: false,
  });

  const importMutation = useMutation({
    mutationFn: async (items: GmailEmailItem[]) => {
      const res = await apiRequest("POST", "/api/gmail/import", { items });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} items. ${data.skipped > 0 ? `${data.skipped} already existed.` : ""}`,
      });
      setSelectedItems(new Set());
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSearch = () => {
    searchEmails();
  };

  const handleToggleItem = (asin: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(asin)) {
        newSet.delete(asin);
      } else {
        newSet.add(asin);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (emails) {
      if (selectedItems.size === emails.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(emails.map((e) => e.asin)));
      }
    }
  };

  const handleImport = () => {
    if (emails) {
      const itemsToImport = emails.filter((e) => selectedItems.has(e.asin));
      importMutation.mutate(itemsToImport);
    }
  };

  if (isLoadingStatus) {
    return <Skeleton className="h-24 w-full" />;
  }

  const isConnected = gmailStatus?.connected;

  return (
    <div className="space-y-4">
      {isConnected ? (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Gmail is connected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleSearch}
              disabled={isSearching}
              data-testid="button-search-gmail"
            >
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search Vine Emails
            </Button>
          </div>
          {emails && emails.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Found {emails.length} items</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedItems.size === emails.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={selectedItems.size === 0 || importMutation.isPending}
                    data-testid="button-import-gmail"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Import {selectedItems.size} Items
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 space-y-1">
                  {emails.map((email) => (
                    <div
                      key={email.asin}
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                      data-testid={`item-gmail-${email.asin}`}
                    >
                      <Checkbox
                        checked={selectedItems.has(email.asin)}
                        onCheckedChange={() => handleToggleItem(email.asin)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email.asin}</p>
                        <p className="text-xs text-muted-foreground truncate">{email.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(email.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          {emails && emails.length === 0 && (
            <p className="text-sm text-muted-foreground">No Vine order emails found.</p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Gmail not configured</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Gmail integration requires per-user OAuth setup. This feature is coming in a future update.
          </p>
        </div>
      )}
    </div>
  );
}

function ConnectionCard({
  provider,
  connection,
  onSave,
  onDelete,
  onTest,
}: {
  provider: ProviderConfig;
  connection?: ApiConnection;
  onSave: (providerId: string, apiKey: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState(connection?.apiKey || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setApiKey(connection?.apiKey || "");
  }, [connection?.apiKey]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(provider.id, apiKey);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!connection) return;
    setIsDeleting(true);
    try {
      await onDelete(connection.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async () => {
    if (!connection) return;
    setIsTesting(true);
    try {
      await onTest(connection.id);
    } finally {
      setIsTesting(false);
    }
  };

  const isConnected = !!connection;
  const isActive = connection?.isActive;

  return (
    <Card data-testid={`card-connection-${provider.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {provider.icon}
          </div>
          <div>
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            <CardDescription className="text-sm">{provider.description}</CardDescription>
          </div>
        </div>
        <Badge
          variant={isConnected ? (isActive ? "default" : "secondary") : "outline"}
          data-testid={`badge-status-${provider.id}`}
        >
          {isConnected ? (isActive ? "Connected" : "Inactive") : "Not Connected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {provider.needsApiKey ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid={`input-apikey-${provider.id}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || !apiKey}
                data-testid={`button-save-${provider.id}`}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isConnected ? "Update" : "Save"}
              </Button>
              {isConnected && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting}
                    data-testid={`button-test-${provider.id}`}
                  >
                    {isTesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    data-testid={`button-delete-${provider.id}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <GmailConnectionContent />
        )}
        {connection?.lastTested && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isActive ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <XCircle className="h-3 w-3 text-red-500" />
            )}
            <span>
              Last tested: {new Date(connection.lastTested).toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ConnectionsPage() {
  const { toast } = useToast();

  const { data: connections, isLoading } = useQuery<ApiConnection[]>({
    queryKey: ["/api/connections"],
  });

  const createMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: string; apiKey: string }) => {
      const res = await apiRequest("POST", "/api/connections", { provider, apiKey });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Connection saved", description: "Your API connection has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, apiKey }: { id: string; apiKey: string }) => {
      const res = await apiRequest("PATCH", `/api/connections/${id}`, { apiKey });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Connection updated", description: "Your API connection has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Connection deleted", description: "Your API connection has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/connections/${id}/test`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      if (data.success) {
        toast({ title: "Connection successful", description: data.message });
      } else {
        toast({ title: "Connection failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = async (providerId: string, apiKey: string) => {
    const existing = connections?.find((c) => c.provider === providerId);
    if (existing) {
      await updateMutation.mutateAsync({ id: existing.id, apiKey });
    } else {
      await createMutation.mutateAsync({ provider: providerId, apiKey });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleTest = async (id: string) => {
    await testMutation.mutateAsync(id);
  };

  const getConnectionForProvider = (providerId: string) => {
    return connections?.find((c) => c.provider === providerId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">API Connections</h1>
          <p className="text-muted-foreground">
            Connect third-party services to enhance your Vine tracking
          </p>
        </div>
        <ConnectionsSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">API Connections</h1>
        <p className="text-muted-foreground">
          Connect third-party services to enhance your Vine tracking
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <ConnectionCard
            key={provider.id}
            provider={provider}
            connection={getConnectionForProvider(provider.id)}
            onSave={handleSave}
            onDelete={handleDelete}
            onTest={handleTest}
          />
        ))}
      </div>
    </div>
  );
}
