import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Warehouse,
  Plus,
  Ruler,
  Box,
  Grid3X3,
  Trash2,
  ArrowRight,
  MapPin,
  Loader2,
  Home,
  Car,
  Building2,
  Clock,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import type { StorageUnit, StorageLocation, StorageUnitWithLocation, VineItem } from "@shared/schema";

const LOCATION_TYPES = {
  HOME: "home",
  GARAGE: "garage",
  OFF_SITE: "off_site",
} as const;

const locationTypeLabels: Record<string, string> = {
  home: "Home",
  garage: "Garage",
  off_site: "Off-Site Facility",
};

const locationTypeIcons: Record<string, typeof Home> = {
  home: Home,
  garage: Car,
  off_site: Building2,
};

const storageLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  locationType: z.enum(["home", "garage", "off_site"]),
  facilityName: z.string().optional(),
  address: z.string().optional(),
  unitNumber: z.string().optional(),
  accessHours: z.string().optional(),
  monthlyCost: z.coerce.number().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
});

type StorageLocationFormData = z.infer<typeof storageLocationSchema>;

const storageUnitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  locationId: z.string().optional(),
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
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [selectedLocationType, setSelectedLocationType] = useState<string>("home");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [placementResult, setPlacementResult] = useState<{
    unit: string;
    slot: string;
    item: VineItem;
  } | null>(null);

  const { data: storageLocations, isLoading: locationsLoading } = useQuery<StorageLocation[]>({
    queryKey: ["/api/storage/locations"],
  });

  const { data: storageUnits, isLoading: unitsLoading } = useQuery<StorageUnitWithLocation[]>({
    queryKey: ["/api/storage/units"],
  });

  const isLoading = locationsLoading || unitsLoading;

  const addLocationMutation = useMutation({
    mutationFn: async (data: StorageLocationFormData) => {
      return apiRequest("POST", "/api/storage/locations", data);
    },
    onSuccess: () => {
      toast({ title: "Storage location added successfully" });
      setAddLocationOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/storage/locations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add storage location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/storage/locations/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Storage location deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/storage/locations"] });
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

  const homeLocations = storageLocations?.filter(l => l.locationType === "home") || [];
  const garageLocations = storageLocations?.filter(l => l.locationType === "garage") || [];
  const offSiteLocations = storageLocations?.filter(l => l.locationType === "off_site") || [];

  const getUnitsForLocation = (locationId: string) => {
    return storageUnits?.filter(u => u.locationId === locationId) || [];
  };

  const unassignedUnits = storageUnits?.filter(u => !u.locationId) || [];

  const totalUnits = storageUnits?.length || 0;
  const avgUtilization = storageUnits && storageUnits.length > 0
    ? storageUnits.reduce((sum, u) => sum + (u.usedCapacity || 0), 0) / storageUnits.length
    : 0;

  const totalMonthlyCost = offSiteLocations.reduce((sum, l) => sum + (l.monthlyCost || 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Storage Manager</h1>
        <p className="text-muted-foreground">
          Organize your storage across home, garage, and off-site facilities
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Locations
                </span>
                <span className="font-mono text-2xl font-semibold">
                  {storageLocations?.length || 0}
                </span>
              </div>
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Storage Units
                </span>
                <span className="font-mono text-2xl font-semibold">
                  {totalUnits}
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
                  Avg Utilization
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
                  Find Placement
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="home" data-testid="tab-home">
                <Home className="mr-1 h-4 w-4" />
                Home ({homeLocations.length})
              </TabsTrigger>
              <TabsTrigger value="garage" data-testid="tab-garage">
                <Car className="mr-1 h-4 w-4" />
                Garage ({garageLocations.length})
              </TabsTrigger>
              <TabsTrigger value="off_site" data-testid="tab-offsite">
                <Building2 className="mr-1 h-4 w-4" />
                Off-Site ({offSiteLocations.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Dialog open={addLocationOpen} onOpenChange={setAddLocationOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="button-add-location">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Storage Location</DialogTitle>
                    <DialogDescription>
                      Create a new storage location for your inventory
                    </DialogDescription>
                  </DialogHeader>
                  <StorageLocationForm
                    onSubmit={(data) => addLocationMutation.mutate(data)}
                    isPending={addLocationMutation.isPending}
                    selectedType={selectedLocationType}
                    onTypeChange={setSelectedLocationType}
                  />
                </DialogContent>
              </Dialog>

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
                    locations={storageLocations || []}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="all" className="mt-4">
            <div className="flex flex-col gap-6">
              {homeLocations.length > 0 && (
                <LocationSection
                  title="Home Storage"
                  icon={Home}
                  locations={homeLocations}
                  units={storageUnits || []}
                  onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
                  onDeleteUnit={(id) => deleteUnitMutation.mutate(id)}
                />
              )}
              {garageLocations.length > 0 && (
                <LocationSection
                  title="Garage Storage"
                  icon={Car}
                  locations={garageLocations}
                  units={storageUnits || []}
                  onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
                  onDeleteUnit={(id) => deleteUnitMutation.mutate(id)}
                />
              )}
              {offSiteLocations.length > 0 && (
                <LocationSection
                  title="Off-Site Facilities"
                  icon={Building2}
                  locations={offSiteLocations}
                  units={storageUnits || []}
                  onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
                  onDeleteUnit={(id) => deleteUnitMutation.mutate(id)}
                  showCost
                />
              )}
              {unassignedUnits.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg font-medium">
                      <Warehouse className="h-5 w-5" />
                      Unassigned Units
                    </CardTitle>
                    <CardDescription>
                      Storage units not assigned to any location
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {unassignedUnits.map((unit) => (
                        <StorageUnitCard
                          key={unit.id}
                          unit={unit}
                          onDelete={() => deleteUnitMutation.mutate(unit.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {!storageLocations?.length && !unassignedUnits.length && (
                <EmptyState />
              )}
            </div>
          </TabsContent>

          <TabsContent value="home" className="mt-4">
            <LocationSection
              title="Home Storage"
              icon={Home}
              locations={homeLocations}
              units={storageUnits || []}
              onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
              onDeleteUnit={(id) => deleteUnitMutation.mutate(id)}
              emptyMessage="No home storage locations configured"
            />
          </TabsContent>

          <TabsContent value="garage" className="mt-4">
            <LocationSection
              title="Garage Storage"
              icon={Car}
              locations={garageLocations}
              units={storageUnits || []}
              onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
              onDeleteUnit={(id) => deleteUnitMutation.mutate(id)}
              emptyMessage="No garage storage locations configured"
            />
          </TabsContent>

          <TabsContent value="off_site" className="mt-4">
            <div className="flex flex-col gap-4">
              {totalMonthlyCost > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Monthly Cost</span>
                    </div>
                    <span className="font-mono text-lg font-semibold">${totalMonthlyCost.toFixed(2)}/mo</span>
                  </CardContent>
                </Card>
              )}
              <LocationSection
                title="Off-Site Facilities"
                icon={Building2}
                locations={offSiteLocations}
                units={storageUnits || []}
                onDeleteLocation={(id) => deleteLocationMutation.mutate(id)}
                onDeleteUnit={(id) => deleteUnitMutation.mutate(id)}
                showCost
                emptyMessage="No off-site storage facilities configured"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LocationSection({
  title,
  icon: Icon,
  locations,
  units,
  onDeleteLocation,
  onDeleteUnit,
  showCost,
  emptyMessage,
}: {
  title: string;
  icon: typeof Home;
  locations: StorageLocation[];
  units: StorageUnitWithLocation[];
  onDeleteLocation: (id: string) => void;
  onDeleteUnit: (id: string) => void;
  showCost?: boolean;
  emptyMessage?: string;
}) {
  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Icon className="h-12 w-12 text-muted-foreground/50" />
          <div className="flex flex-col gap-1">
            <span className="font-medium">{emptyMessage || "No locations configured"}</span>
            <span className="text-sm text-muted-foreground">
              Add a location to start organizing your storage
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {locations.map((location) => {
        const locationUnits = units.filter(u => u.locationId === location.id);
        return (
          <Card key={location.id} data-testid={`location-${location.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-lg font-medium">{location.name}</CardTitle>
                    {location.room && (
                      <span className="text-sm text-muted-foreground">{location.room}</span>
                    )}
                    {location.facilityName && (
                      <span className="text-sm text-muted-foreground">{location.facilityName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showCost && location.monthlyCost && (
                    <Badge variant="secondary">
                      <DollarSign className="mr-1 h-3 w-3" />
                      {location.monthlyCost}/mo
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {locationUnits.length} {locationUnits.length === 1 ? "unit" : "units"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteLocation(location.id)}
                    className="text-muted-foreground"
                    data-testid={`button-delete-location-${location.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(location.address || location.accessHours) && (
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {location.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {location.address}
                      {location.unitNumber && ` (Unit ${location.unitNumber})`}
                    </span>
                  )}
                  {location.accessHours && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {location.accessHours}
                    </span>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {locationUnits.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-center text-sm text-muted-foreground">
                  No storage units in this location
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {locationUnits.map((unit) => (
                    <StorageUnitCard
                      key={unit.id}
                      unit={unit}
                      onDelete={() => onDeleteUnit(unit.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StorageUnitCard({
  unit,
  onDelete,
}: {
  unit: StorageUnitWithLocation;
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

function StorageLocationForm({
  onSubmit,
  isPending,
  selectedType,
  onTypeChange,
}: {
  onSubmit: (data: StorageLocationFormData) => void;
  isPending: boolean;
  selectedType: string;
  onTypeChange: (type: string) => void;
}) {
  const form = useForm<StorageLocationFormData>({
    resolver: zodResolver(storageLocationSchema),
    defaultValues: {
      name: "",
      locationType: "home",
      facilityName: "",
      address: "",
      unitNumber: "",
      accessHours: "",
      monthlyCost: undefined,
      room: "",
      notes: "",
    },
  });

  const locationType = form.watch("locationType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="locationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Type</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  onTypeChange(value);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-location-type">
                    <SelectValue placeholder="Select location type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="home">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Home
                    </div>
                  </SelectItem>
                  <SelectItem value="garage">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Garage
                    </div>
                  </SelectItem>
                  <SelectItem value="off_site">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Off-Site Facility
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name</FormLabel>
              <FormControl>
                <Input
                  placeholder={locationType === "off_site" ? "e.g., Public Storage Unit" : "e.g., Master Bedroom Closet"}
                  {...field}
                  data-testid="input-location-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {(locationType === "home" || locationType === "garage") && (
          <FormField
            control={form.control}
            name="room"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Room / Area</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Basement, Guest Room"
                    {...field}
                    data-testid="input-location-room"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {locationType === "off_site" && (
          <>
            <FormField
              control={form.control}
              name="facilityName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Public Storage, U-Haul"
                      {...field}
                      data-testid="input-facility-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Storage Lane, City, State"
                      {...field}
                      data-testid="input-location-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., A-123"
                        {...field}
                        data-testid="input-unit-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-monthly-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accessHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Hours</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 6am - 10pm Daily"
                      {...field}
                      data-testid="input-access-hours"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes..."
                  className="resize-none"
                  {...field}
                  data-testid="input-location-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} data-testid="button-submit-location">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Location"
          )}
        </Button>
      </form>
    </Form>
  );
}

function StorageUnitForm({
  onSubmit,
  isPending,
  locations,
}: {
  onSubmit: (data: StorageUnitFormData) => void;
  isPending: boolean;
  locations: StorageLocation[];
}) {
  const form = useForm<StorageUnitFormData>({
    resolver: zodResolver(storageUnitSchema),
    defaultValues: {
      name: "",
      locationId: "",
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
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-unit-location">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">No location</SelectItem>
                  {locations.map((loc) => {
                    const Icon = locationTypeIcons[loc.locationType] || Warehouse;
                    return (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {loc.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Warehouse className="h-12 w-12 text-muted-foreground/50" />
        <div className="flex flex-col gap-1">
          <span className="font-medium">No storage configured</span>
          <span className="text-sm text-muted-foreground">
            Add a location and storage units to start organizing your inventory
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StorageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96" />
    </div>
  );
}
