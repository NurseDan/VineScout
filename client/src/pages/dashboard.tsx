import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Package,
  ClipboardCheck,
  Inbox,
  WarehouseIcon,
  Upload,
  ScanBarcode,
  Ruler,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { DashboardStats } from "@shared/schema";
import { format, differenceInDays, isPast } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const safeStats = stats || {
    totalItems: 0,
    pendingReviews: 0,
    receivedThisWeek: 0,
    storageUtilization: 0,
    upcomingReviewDeadlines: [],
    recentActivity: [],
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your Amazon Vine items, reviews, and storage
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Items"
          value={safeStats.totalItems}
          icon={Package}
          testId="stat-total-items"
        />
        <StatCard
          title="Pending Reviews"
          value={safeStats.pendingReviews}
          icon={ClipboardCheck}
          variant={safeStats.pendingReviews > 0 ? "warning" : "default"}
          testId="stat-pending-reviews"
        />
        <StatCard
          title="Received This Week"
          value={safeStats.receivedThisWeek}
          icon={Inbox}
          testId="stat-received-week"
        />
        <StatCard
          title="Storage Used"
          value={`${Math.round(safeStats.storageUtilization)}%`}
          icon={WarehouseIcon}
          variant={safeStats.storageUtilization > 80 ? "warning" : "default"}
          testId="stat-storage-used"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href="/upload">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 py-6"
                data-testid="action-upload-csv"
              >
                <Upload className="h-6 w-6" />
                <span>Upload CSV</span>
              </Button>
            </Link>
            <Link href="/scan">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 py-6"
                data-testid="action-scan-item"
              >
                <ScanBarcode className="h-6 w-6" />
                <span>Scan Item</span>
              </Button>
            </Link>
            <Link href="/storage">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 py-6"
                data-testid="action-measure-package"
              >
                <Ruler className="h-6 w-6" />
                <span>Measure Package</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Review Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-lg font-medium">
              Upcoming Review Deadlines
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {safeStats.upcomingReviewDeadlines.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                message="No upcoming review deadlines"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {safeStats.upcomingReviewDeadlines.slice(0, 5).map((item) => (
                  <ReviewDeadlineItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {safeStats.recentActivity.length === 0 ? (
              <EmptyState icon={Clock} message="No recent activity" />
            ) : (
              <div className="flex flex-col gap-3">
                {safeStats.recentActivity.slice(0, 5).map((log) => (
                  <ActivityItem key={log.id} log={log} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  testId,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "warning";
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
            <span
              className={`font-mono text-2xl font-semibold ${
                variant === "warning" ? "text-amber-500" : ""
              }`}
            >
              {value}
            </span>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              variant === "warning"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewDeadlineItem({ item }: { item: any }) {
  const dueDate = item.reviewDueDate ? new Date(item.reviewDueDate) : null;
  const daysLeft = dueDate ? differenceInDays(dueDate, new Date()) : null;
  const isOverdue = dueDate ? isPast(dueDate) : false;

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3"
      data-testid={`deadline-item-${item.id}`}
    >
      <div className="flex flex-col gap-1 overflow-hidden">
        <span className="truncate text-sm font-medium">{item.description}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {item.asin}
        </span>
      </div>
      <Badge
        variant={isOverdue ? "destructive" : daysLeft && daysLeft <= 3 ? "secondary" : "outline"}
        className="shrink-0"
      >
        {isOverdue
          ? "Overdue"
          : daysLeft !== null
          ? `${daysLeft} days`
          : "No date"}
      </Badge>
    </div>
  );
}

function ActivityItem({ log }: { log: any }) {
  const actionLabels: Record<string, string> = {
    received: "Item received",
    lookup: "Item looked up",
    label_print: "Label printed",
  };

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3"
      data-testid={`activity-item-${log.id}`}
    >
      <div className="flex items-center gap-3">
        <ScanBarcode className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {actionLabels[log.action] || log.action}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {log.asin}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {log.scannedAt ? format(new Date(log.scannedAt), "MMM d, h:mm a") : ""}
      </span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/50" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
