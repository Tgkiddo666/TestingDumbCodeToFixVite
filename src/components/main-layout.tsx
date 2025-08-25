
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { BottomNavbar } from "@/components/bottom-navbar";
import {
  LayoutDashboard,
  Table2,
  SlidersHorizontal,
  FileCog,
  Settings,
  Sigma,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import LoadingSpinner from "./loading-spinner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tables", label: "My Tables", icon: Table2 },
  { href: "/presets", label: "Presets", icon: SlidersHorizontal },
  { href: "/conversion", label: "Convert", icon: FileCog },
];

const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the auth check is complete and there's no user, redirect to login.
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // While loading, or if there's no user (and we're about to redirect),
  // show a spinner to prevent a flash of protected content.
  if (loading || !user) {
    return <LoadingSpinner />; 
  }

  // If loading is finished and there is a user, render the application.
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sigma className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold">Data Weaver</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {bottomNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center h-14 px-4 sm:px-8 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
           <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Sigma className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold">Data Weaver</h1>
          </Link>
           <div className="ml-auto">
             <UserNav />
           </div>
        </header>
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
        <BottomNavbar />
      </SidebarInset>
    </SidebarProvider>
  );
}
