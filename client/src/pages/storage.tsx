import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Warehouse,
  Plus,
  Ruler,
  Box,
  Grid3X3,
  Trash2,
  Edit2,
  ArrowRight,
  MapPin,
  Package,
  Loader2,
} from "lucide-react";
import type { StorageUnit, VineItem } from "@shared/schema";

const storageUnitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  width: z.coerce.number().min(1, "Width must be positive"),
  height: z.coerce.number().min(1, "Height must be positive"),
  depth: z.coerce.number().min(1, "Depth must be positive"),
  shelves: z.coerce.number().min(1, "At least 1 shelf required").max(20),
});

type StorageUnitFormData = z.infer<typeof storageUnitSchema>;

const packageDimensionsSchema = z.object({
  width: z.coerce.number().min(0.1, "Width must be positive"),
  height: z.coerce.number().min(0.1, "Height must be positive"),
  depth: z.coerce.number().min(0.1, "Depth must be positive"),
  asin: z.string().min(1, "ASIN is required"),
});

type PackageDimensionsFormData = z.infer<typeof packageDimensionsSchema>;

export default function StoragePage() {
  const { toast } = useToast();
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [placementResult, setPlacementResult] = useState<{
    unit: string;
    slot: string;
    item: VineItem;
  } | null>(null);

  const { data: storageUnits, isLoading } = useQuery<StorageUnit[]>({
    queryKey: ["/api/storage/units"],
  });

  const addUnitMutation = useMutation({
    mutationFn: async (data: StorageUnitFormData) => {
      return apiRequest("POST", "/api/storage/units", data);
    },
    onSuccess: () => {
      toast({ title: "Storage unit added successfully" });
      setAddUnitOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/storage/units"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add storage unit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/storage/units/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Storage unit deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/storage/units"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const findPlacementMutation = useMutation({
    mutationFn: async (data: PackageDimensionsFormData) => {
      return apiRequest("POST", "/api/storage/find-placement", data);
    },
    onSuccess: (data: any) => {
      if (data.placement) {
        setPlacementResult(data.placement);
        toast({ title: "Placement found", description: `Recommended: ${data.placement.unit} - ${data.placement.slot}` });
      } else {
        toast({
          title: "No suitable placement found",
          description: "All storage units are full or package is too large",
          variant: "destructive",
        });
      }
      setMeasureOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Placement search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignPlacementMutation = useMutation({
    mutationFn: async ({ itemId, location }: { itemId: string; location: string }) => {
      return apiRequest("PATCH", `/api/items/${itemId}`, { storageLocation: location });
    },
    onSuccess: () => {
      toast({ title: "Storage location assigned" });
      setPlacementResult(null);
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <StorageSkeleton />;
  }

  const totalCapacity = (storageUnits || []).reduce((sum, u) => sum + 100, 0);
  const usedCapacity = (storageUnits || []).reduce(
    (sum, u) => sum + (u.usedCapacity || 0),
    0
  );
  const avgUtilization =
    storageUnits && storageUnits.length > 0
      ? usedCapacity / storageUnits.length
      : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Storage Manager</h1>
        <p className="text-muted-foreground">
          Configure your physical storage and find optimal placement for packages
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Storage Units
                </span>
                <span className="font-mono text-2xl font-semibold">
                  {storageUnits?.length || 0}
                </span>
              </div>
              <Warehouse className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Average Utilization
                </span>
                <span className="font-mono text-lg font-semibold">
                  {Math.round(avgUtilization)}%
                </span>
              </div>
              <Progress value={avgUtilization} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-center pt-6">
            <Dialog open={measureOpen} onOpenChange={setMeasureOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2" data-testid="button-measure-package">
                  <Ruler className="h-4 w-4" />
                  Measure Package
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Package Dimensions</DialogTitle>
                  <DialogDescription>
                    Enter the package dimensions to find optimal storage placement
                  </DialogDescription>
                </DialogHeader>
                <PackageDimensionsForm
                  onSubmit={(data) => findPlacementMutation.mutate(data)}
                  isPending={findPlacementMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Placement Result */}
      {placementResult && (
        <Card className="border-primary">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <MapPin className="h-5 w-5 text-primary" />
              Recommended Placement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <Box className="h-8 w-8 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold">
                    {placementResult.unit} - Slot {placementResult.slot}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {placementResult.item.description.substring(0, 60)}...
                  </span>
                </div>
              </div>
              <Button
                onClick={() =>
                  assignPlacementMutation.mutate({
                    itemId: placementResult.item.id,
                    location: `${placementResult.unit}-${placementResult.slot}`,
                  })
                }
                disabled={assignPlacementMutation.isPending}
                data-testid="button-assign-placement"
              >
                {assignPlacementMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Assign Location
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Units Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg font-medium">Storage Units</CardTitle>
          <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-unit">
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Storage Unit</DialogTitle>
                <DialogDescription>
                  Define the dimensions and configuration of your storage unit
                </DialogDescription>
              </DialogHeader>
              <StorageUnitForm
                onSubmit={(data) => addUnitMutation.mutate(data)}
                isPending={addUnitMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!storageUnits || storageUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Warehouse className="h-12 w-12 text-muted-foreground/50" />
              <div className="flex flex-col gap-1">
                <span className="font-medium">No storage units configured</span>
                <span className="text-sm text-muted-foreground">
                  Add your shelving units to start organizing
                </span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storageUnits.map((unit) => (
                <StorageUnitCard
                  key={unit.id}
                  unit={unit}
                  onDelete={() => deleteUnitMutation.mutate(unit.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StorageUnitCard({
  unit,
  onDelete,
}: {
  unit: StorageUnit;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-visible" data-testid={`storage-unit-${unit.id}`}>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Grid3X3 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">{unit.name}</span>
                <span className="text-xs text-muted-foreground">
                  {unit.shelves} {unit.shelves === 1 ? "shelf" : "shelves"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-muted-foreground"
              data-testid={`button-delete-unit-${unit.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="font-mono">
                {unit.width}" x {unit.height}" x {unit.depth}"
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-mono">{Math.round(unit.usedCapacity || 0)}%</span>
              </div>
              <Progress value={unit.usedCapacity || 0} className="h-1.5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StorageUnitForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: StorageUnitFormData) => void;
  isPending: boolean;
}) {
  const form = useForm<StorageUnitFormData>({
    resolver: zodResolver(storageUnitSchema),
    defaultValues: {
      name: "",
      width: 48,
      height: 72,
      depth: 18,
      shelves: 4,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Shelf A, Rack 1" {...field} data-testid="input-unit-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Width (in)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} data-testid="input-unit-width" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height (in)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} data-testid="input-unit-height" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="depth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Depth (in)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} data-testid="input-unit-depth" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="shelves"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Shelves</FormLabel>
              <FormControl>
                <Input type="number" {...field} data-testid="input-unit-shelves" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} data-testid="button-submit-unit">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Storage Unit"
          )}
        </Button>
      </form>
    </Form>
  );
}

function PackageDimensionsForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: PackageDimensionsFormData) => void;
  isPending: boolean;
}) {
  const form = useForm<PackageDimensionsFormData>({
    resolver: zodResolver(packageDimensionsSchema),
    defaultValues: {
      width: 0,
      height: 0,
      depth: 0,
      asin: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="asin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item ASIN</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter ASIN..."
                  className="font-mono"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  data-testid="input-package-asin"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Width (in)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} data-testid="input-package-width" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height (in)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} data-testid="input-package-height" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="depth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Depth (in)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} data-testid="input-package-depth" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending} data-testid="button-find-placement">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finding...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Find Placement
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

function StorageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
