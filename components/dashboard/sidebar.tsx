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
  BarChart3,
  Settings,
  HelpCircle,
  CreditCard,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Documents", href: "/dashboard/documents", icon: FileText },
  { name: "Chat AI", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Billing & Usage", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Help", href: "/dashboard/help", icon: HelpCircle },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200">
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-slate-200 h-20 flex items-center">
          <div className="flex items-center space-x-2">
            <img src="/logo/logo.svg" alt="DocuMind Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold text-slate-900">DocuMind</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-700 hover:bg-slate-100"
                  }
                `}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar>
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
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
