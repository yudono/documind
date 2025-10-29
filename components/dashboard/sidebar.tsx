"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  MessageSquare,
  LogOut,
  Home,
  Settings,
  HelpCircle,
  CreditCard,
  Shield,
  Trash2,
  Box,
} from "lucide-react";
import { useEffect, useState } from "react";
import N8nIcon from "../icons/n8n";
import WhatsappIcon from "../icons/whatsapp";
import FormIcon from "../icons/form";
import OdooIcon from "../icons/odoo";
import SapIcon from "../icons/sap";
import DriveIcon from "../icons/drive";

interface INavigationItem {
  name: string;
  href: string;
  icon: any;
}

interface INavigationGroup {
  group: string;
  items: INavigationItem[];
}

const PLUGIN_NAV_ITEMS: Record<string, INavigationItem> = {
  n8n: { name: "n8n automation", href: "/dashboard/n8n", icon: N8nIcon },
  whatsapp: {
    name: "Whatsapp gateway",
    href: "/dashboard/whatsapp",
    icon: WhatsappIcon,
  },
  odoo: { name: "Odoo Connector", href: "/dashboard/odoo", icon: OdooIcon },
  sap: { name: "Sap Connector", href: "/dashboard/sap", icon: SapIcon },
  drive: {
    name: "Drive Integration",
    href: "/dashboard/drive",
    icon: DriveIcon,
  },
  forms: { name: "Form Integration", href: "/dashboard/forms", icon: FormIcon },
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pluginItems, setPluginItems] = useState<INavigationItem[]>([]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const userData = await response.json();
            setIsAdmin(userData.role === "admin");
          }
        } catch (error) {
          console.error("Error checking admin role:", error);
        }
      }
    };

    checkAdminRole();
  }, [session]);

  useEffect(() => {
    const loadUserPlugins = async () => {
      try {
        const res = await fetch("/api/plugins");
        if (!res.ok) return;
        const data = await res.json();
        const activeItems: INavigationItem[] = (data.plugins || [])
          .filter((p: any) => p.effectiveActive)
          .map((p: any) => PLUGIN_NAV_ITEMS[p.slug])
          .filter(Boolean);
        setPluginItems(activeItems);
      } catch (e) {
        console.error("Failed to load user plugins", e);
      }
    };
    loadUserPlugins();
  }, []);

  const baseNavigation: INavigationGroup[] = [
    {
      group: "General",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: Home },
        { name: "My Documents", href: "/dashboard/documents", icon: FileText },
        { name: "Chat AI", href: "/dashboard/chat", icon: MessageSquare },
        { name: "Plugin", href: "/dashboard/plugin", icon: Box },
        { name: "Trash", href: "/dashboard/trash", icon: Trash2 },
        {
          name: "Billing & Usage",
          href: "/dashboard/billing",
          icon: CreditCard,
        },
      ],
    },
    {
      group: "Plugin",
      items: pluginItems,
    },
    {
      group: "Setting",
      items: [
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
        { name: "Help", href: "/dashboard/help", icon: HelpCircle },
      ],
    },
  ];

  const adminNavigation = [
    {
      group: "Admin",
      items: [{ name: "Admin Panel", href: "/admin/credits", icon: Shield }],
    },
  ];

  const allNavigation = isAdmin
    ? [...baseNavigation, ...adminNavigation]
    : baseNavigation;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 glass border-r border-border">
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border h-20 flex items-center">
          <div className="flex items-center space-x-2">
            <img src="/logo/logo.svg" alt="DocuMind Logo" className="h-8 w-8" />
            <h1 className="text-xl font-display font-bold text-foreground">
              DocuMind
            </h1>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-6 h-[calc(100vh-206px)] overflow-y-auto">
          {allNavigation.map((group) => (
            <div key={group.group}>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {group.group}
              </h2>
              {group.items.map((item) => {
                const isRootDashboard = item.href === "/dashboard";
                const isActive = isRootDashboard
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Button
                    key={item.name}
                    asChild
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`mb-1 w-full justify-start transition-all ${
                      isActive
                        ? "gradient-primary text-white border-0 shadow-lg hover:shadow-glow"
                        : "text-muted-foreground hover:bg-primary/10"
                    }`}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  </Button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar>
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
