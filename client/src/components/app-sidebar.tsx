import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Upload,
  Package,
  ScanBarcode,
  Warehouse,
  Tag,
  BarChart3,
  Link2,
  CreditCard,
  Brain,
  ShoppingBag,
  Shield,
  Receipt,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Upload Items",
    url: "/upload",
    icon: Upload,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Scan Item",
    url: "/scan",
    icon: ScanBarcode,
  },
  {
    title: "Storage Manager",
    url: "/storage",
    icon: Warehouse,
  },
  {
    title: "Labels",
    url: "/labels",
    icon: Tag,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Connections",
    url: "/connections",
    icon: Link2,
  },
  {
    title: "Marketplace",
    url: "/marketplace",
    icon: ShoppingBag,
  },
  {
    title: "AI Assistant",
    url: "/ai-assistant",
    icon: Brain,
  },
  {
    title: "Tax Center",
    url: "/tax",
    icon: Receipt,
  },
  {
    title: "Membership",
    url: "/membership",
    icon: CreditCard,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: isAdminData } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/auth/user/is-admin"],
  });

  const isAdmin = isAdminData?.isAdmin === true;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">ReviewTrack</span>
            <span className="text-xs text-muted-foreground">Inventory Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin"}
                    data-testid="nav-admin"
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          ReviewTrack
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
