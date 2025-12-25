import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Package, ShoppingBag, CreditCard, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

type AdminStats = {
  totalUsers: number;
  totalItems: number;
  totalListings: number;
  activeSubscriptions: number;
};

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string | null;
  itemsCount: number;
};

type AdminUserDetail = AdminUser & {
  profileImageUrl: string | null;
  stripeCustomerId: string | null;
  updatedAt: string | null;
};

export default function AdminPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: isAdminData, isLoading: isAdminLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/auth/user/is-admin"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdminData?.isAdmin === true,
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdminData?.isAdmin === true,
  });

  const { data: userDetail, isLoading: userDetailLoading } = useQuery<AdminUserDetail>({
    queryKey: ["/api/admin/users", selectedUserId],
    enabled: !!selectedUserId && isAdminData?.isAdmin === true,
  });

  if (isAdminLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdminData?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center">
          You do not have permission to access the admin dashboard.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
    },
    {
      title: "Total Items",
      value: stats?.totalItems ?? 0,
      icon: Package,
    },
    {
      title: "Marketplace Listings",
      value: stats?.totalListings ?? 0,
      icon: ShoppingBag,
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions ?? 0,
      icon: CreditCard,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-admin-title">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and user management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedUserId(user.id)}
                    data-testid={`row-user-${user.id}`}
                  >
                    <TableCell>
                      {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={user.stripeSubscriptionId ? "default" : "secondary"}>
                        {user.stripeSubscriptionId ? "Active" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.itemsCount}</TableCell>
                    <TableCell>
                      {user.createdAt
                        ? format(new Date(user.createdAt), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!users || users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {userDetailLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : userDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium" data-testid="text-user-name">
                    {[userDetail.firstName, userDetail.lastName].filter(Boolean).join(" ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium" data-testid="text-user-email">{userDetail.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Items Count</p>
                  <p className="font-medium" data-testid="text-user-items">{userDetail.itemsCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subscription</p>
                  <Badge variant={userDetail.stripeSubscriptionId ? "default" : "secondary"}>
                    {userDetail.stripeSubscriptionId ? "Active" : "Free"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {userDetail.createdAt
                      ? format(new Date(userDetail.createdAt), "MMM d, yyyy 'at' h:mm a")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {userDetail.updatedAt
                      ? format(new Date(userDetail.updatedAt), "MMM d, yyyy 'at' h:mm a")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stripe Customer ID</p>
                  <p className="font-medium text-xs font-mono">
                    {userDetail.stripeCustomerId || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-medium text-xs font-mono">{userDetail.id}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedUserId(null)} data-testid="button-close-dialog">
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
