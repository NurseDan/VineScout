import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { TrendingUp, DollarSign, CheckCircle, Clock, Download } from "lucide-react";
import type { AnalyticsData } from "@shared/schema";

const COLORS = ['hsl(210, 85%, 35%)', 'hsl(180, 70%, 32%)', 'hsl(30, 80%, 38%)', 'hsl(280, 65%, 40%)', 'hsl(150, 60%, 35%)', 'hsl(0, 72%, 35%)'];

const STATUS_LABELS: Record<string, string> = {
  ordered: "Ordered",
  shipped: "Shipped",
  received: "Received",
  reviewing: "Reviewing",
  reviewed: "Reviewed",
  sellable: "Sellable",
};

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  const handleExportCSV = () => {
    window.location.href = "/api/export/items?format=csv";
  };

  const handleExportJSON = () => {
    window.location.href = "/api/export/items?format=json";
  };

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const safeAnalytics = analytics || {
    totalItemValue: 0,
    reviewsCompleted: 0,
    reviewsThisMonth: 0,
    averageReviewTime: 0,
    itemsByStatus: [],
    itemsByMonth: [],
    reviewTrend: [],
  };

  const statusData = safeAnalytics.itemsByStatus.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    status: item.status,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your Vine performance and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON} data-testid="button-export-json">
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Item Value"
          value={`$${safeAnalytics.totalItemValue.toFixed(2)}`}
          icon={DollarSign}
          description="Combined tax value of all items"
          testId="stat-total-value"
        />
        <StatCard
          title="Reviews Completed"
          value={safeAnalytics.reviewsCompleted}
          icon={CheckCircle}
          description="Total reviews submitted"
          testId="stat-reviews-completed"
        />
        <StatCard
          title="Reviews This Month"
          value={safeAnalytics.reviewsThisMonth}
          icon={TrendingUp}
          description="Completed in current month"
          testId="stat-reviews-month"
        />
        <StatCard
          title="Avg Review Time"
          value={`${safeAnalytics.averageReviewTime.toFixed(1)} days`}
          icon={Clock}
          description="Average days to complete review"
          testId="stat-avg-time"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items by Month</CardTitle>
            <CardDescription>Order volume and value over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeAnalytics.itemsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" fill="hsl(210, 85%, 35%)" name="Items" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items by Status</CardTitle>
            <CardDescription>Current distribution of item statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No items to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Trend</CardTitle>
          <CardDescription>Completed vs pending reviews over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safeAnalytics.reviewTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="hsl(150, 60%, 35%)" 
                  strokeWidth={2}
                  name="Completed"
                  dot={{ fill: 'hsl(150, 60%, 35%)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="hsl(30, 80%, 38%)" 
                  strokeWidth={2}
                  name="Pending"
                  dot={{ fill: 'hsl(30, 80%, 38%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  testId 
}: { 
  title: string; 
  value: string | number; 
  icon: any;
  description: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
