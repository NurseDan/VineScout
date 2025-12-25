import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DollarSign,
  Receipt,
  Calendar,
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronDown,
  Settings,
  Check,
  Clock,
  Building2,
  FileText,
  Loader2,
} from "lucide-react";
import type { TaxSummary, TaxProfile, QuarterlyTaxEstimate } from "@shared/schema";

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }, { value: "DC", label: "District of Columbia" },
];

const FILING_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married_joint", label: "Married Filing Jointly" },
  { value: "married_separate", label: "Married Filing Separately" },
  { value: "head_of_household", label: "Head of Household" },
  { value: "qualifying_widow", label: "Qualifying Widow(er)" },
];

const taxProfileSchema = z.object({
  filingStatus: z.string().default("single"),
  state: z.string().optional(),
  estimatedTaxRate: z.coerce.number().min(0).max(100).default(25),
  selfEmploymentTaxRate: z.coerce.number().default(15.3),
  includeStateTax: z.boolean().default(false),
  stateTaxRate: z.coerce.number().min(0).max(100).default(5),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
});

type TaxProfileFormData = z.infer<typeof taxProfileSchema>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function TaxPage() {
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery<TaxSummary>({
    queryKey: ["/api/tax/summary"],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<TaxProfile | null>({
    queryKey: ["/api/tax/profile"],
  });

  const form = useForm<TaxProfileFormData>({
    resolver: zodResolver(taxProfileSchema),
    defaultValues: {
      filingStatus: "single",
      state: "",
      estimatedTaxRate: 25,
      selfEmploymentTaxRate: 15.3,
      includeStateTax: false,
      stateTaxRate: 5,
      businessName: "",
      businessAddress: "",
    },
  });

  const includeStateTax = form.watch("includeStateTax");

  const saveProfileMutation = useMutation({
    mutationFn: async (data: TaxProfileFormData) => {
      const response = await apiRequest("POST", "/api/tax/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tax/summary"] });
      toast({
        title: "Settings saved",
        description: "Your tax profile has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save tax profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaxProfileFormData) => {
    saveProfileMutation.mutate(data);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/tax/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax-report-${new Date().getFullYear()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not download tax report.",
        variant: "destructive",
      });
    }
  };

  // Sync profile data to form when loaded
  useEffect(() => {
    if (profile && !form.formState.isDirty) {
      form.reset({
        filingStatus: profile.filingStatus || "single",
        state: profile.state || "",
        estimatedTaxRate: profile.estimatedTaxRate || 25,
        selfEmploymentTaxRate: profile.selfEmploymentTaxRate || 15.3,
        includeStateTax: profile.includeStateTax || false,
        stateTaxRate: profile.stateTaxRate || 5,
        businessName: profile.businessName || "",
        businessAddress: profile.businessAddress || "",
      });
    }
  }, [profile, form]);

  if (summaryLoading || profileLoading) {
    return <TaxSkeleton />;
  }

  const safeSummary = summary || {
    yearToDate: {
      totalIncome: 0,
      federalTax: 0,
      selfEmploymentTax: 0,
      stateTax: 0,
      totalTax: 0,
      itemCount: 0,
    },
    quarters: [],
    nextPaymentDue: null,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-tax-title">Tax Center</h1>
          <p className="text-muted-foreground">
            Manage your estimated quarterly tax payments for Vine income
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')} data-testid="button-export-json">
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <Alert data-testid="alert-disclaimer">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Disclaimer</AlertTitle>
        <AlertDescription>
          This tax information is provided for informational purposes only and should not be considered tax advice. 
          Please consult a qualified tax professional for guidance on your specific tax situation.
        </AlertDescription>
      </Alert>

      {safeSummary.nextPaymentDue && (
        <NextPaymentCard nextPayment={safeSummary.nextPaymentDue} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="YTD Vine Income"
          value={formatCurrency(safeSummary.yearToDate.totalIncome)}
          icon={DollarSign}
          description={`${safeSummary.yearToDate.itemCount} items received`}
          testId="stat-ytd-income"
        />
        <StatCard
          title="Est. Federal Tax"
          value={formatCurrency(safeSummary.yearToDate.federalTax)}
          icon={Receipt}
          description={`${profile?.estimatedTaxRate || 25}% rate`}
          testId="stat-federal-tax"
        />
        <StatCard
          title="Est. SE Tax"
          value={formatCurrency(safeSummary.yearToDate.selfEmploymentTax)}
          icon={Building2}
          description="15.3% fixed rate"
          testId="stat-se-tax"
        />
        <StatCard
          title="Total Tax Liability"
          value={formatCurrency(safeSummary.yearToDate.totalTax)}
          icon={FileText}
          description={profile?.includeStateTax ? "Includes state tax" : "Federal + SE tax"}
          testId="stat-total-tax"
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">Quarterly Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {safeSummary.quarters.map((quarter) => (
            <QuarterCard key={`q${quarter.quarter}-${quarter.year}`} quarter={quarter} />
          ))}
        </div>
      </div>

      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">Tax Profile Settings</CardTitle>
                    <CardDescription>Configure your tax rates and preferences</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="filingStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Filing Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-filing-status">
                                <SelectValue placeholder="Select filing status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FILING_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="estimatedTaxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Federal Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              {...field}
                              data-testid="input-federal-rate"
                            />
                          </FormControl>
                          <FormDescription>Your estimated marginal tax rate</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="selfEmploymentTaxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Self-Employment Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              disabled
                              {...field}
                              data-testid="input-se-rate"
                            />
                          </FormControl>
                          <FormDescription>Fixed IRS rate for self-employment</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <FormField
                      control={form.control}
                      name="includeStateTax"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <FormLabel>Include State Tax</FormLabel>
                            <FormDescription>
                              Enable to include state tax in estimates
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-include-state-tax"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {includeStateTax && (
                      <FormField
                        control={form.control}
                        name="stateTaxRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State Tax Rate (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                {...field}
                                data-testid="input-state-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your business name"
                              {...field}
                              data-testid="input-business-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Address (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your business address"
                            className="resize-none"
                            {...field}
                            data-testid="input-business-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={saveProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {saveProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function NextPaymentCard({ nextPayment }: { nextPayment: QuarterlyTaxEstimate }) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20" data-testid="card-next-payment">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-lg text-amber-900 dark:text-amber-100">Next Payment Due</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100" data-testid="text-next-payment-amount">
              {formatCurrency(nextPayment.totalTax)}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Q{nextPayment.quarter} {nextPayment.year} - Due {nextPayment.dueDate}
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Pay directly to the IRS - we'll track it for you
            </p>
          </div>
          <Button
            asChild
            className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            data-testid="button-irs-pay"
          >
            <a
              href="https://www.irs.gov/payments/direct-pay"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pay via IRS Direct Pay
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuarterCard({ quarter }: { quarter: QuarterlyTaxEstimate }) {
  const isPast = quarter.isPaid;

  return (
    <Card data-testid={`card-quarter-${quarter.quarter}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Q{quarter.quarter} {quarter.year}</CardTitle>
          {isPast ? (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Past
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Upcoming
            </Badge>
          )}
        </div>
        <CardDescription>{quarter.dueDate}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Income</span>
          <span className="font-mono" data-testid={`text-q${quarter.quarter}-income`}>
            {formatCurrency(quarter.totalIncome)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Federal</span>
          <span className="font-mono">{formatCurrency(quarter.federalTax)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">SE Tax</span>
          <span className="font-mono">{formatCurrency(quarter.selfEmploymentTax)}</span>
        </div>
        {quarter.stateTax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">State</span>
            <span className="font-mono">{formatCurrency(quarter.stateTax)}</span>
          </div>
        )}
        <div className="border-t pt-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Total Tax</span>
            <span className="font-mono" data-testid={`text-q${quarter.quarter}-total`}>
              {formatCurrency(quarter.totalTax)}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {quarter.itemCount} items received
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  testId,
}: {
  title: string;
  value: string;
  icon: typeof DollarSign;
  description: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function TaxSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-32" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
