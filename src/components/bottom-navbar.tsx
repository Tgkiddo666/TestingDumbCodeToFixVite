"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Table2,
  SlidersHorizontal,
  FileCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tables", label: "Tables", icon: Table2 },
  { href: "/presets", label: "Presets", icon: SlidersHorizontal },
  { href: "/conversion", label: "Convert", icon: FileCog },
];

export function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-10 flex items-center justify-around">
      {navItems.map((item) => (
        <Link href={item.href} key={item.href} className="flex-1">
          <div
            className={cn(
              "flex flex-col items-center justify-center h-full gap-1 p-2 rounded-md",
              pathname === item.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </div>
        </Link>
      ))}
    </nav>
  );
}
