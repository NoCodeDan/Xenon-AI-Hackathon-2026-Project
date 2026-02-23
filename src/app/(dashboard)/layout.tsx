"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Library,
  Tag,
  BarChart3,
  MessageSquarePlus,
  Bot,
  Settings,
  TreePine,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Content", href: "/content", icon: Library },
  { label: "Topics", href: "/topics", icon: Tag },
  { label: "Grading", href: "/grading", icon: BarChart3 },
  { label: "Requests", href: "/requests", icon: MessageSquarePlus },
  { label: "Chat", href: "/chat", icon: Bot },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Horizontal top nav bar */}
      <header className="flex h-14 shrink-0 items-center border-b bg-background px-4 md:px-6">
        {/* Left: Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-6 shrink-0">
          <TreePine className="size-5 text-emerald-600" />
          <span className="text-sm font-semibold tracking-tight hidden sm:inline">
            Treehouse Intelligence
          </span>
        </Link>

        {/* Center: Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile: Hamburger menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-auto">
              <Menu className="size-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-2.5 px-6 py-5">
              <TreePine className="size-6 text-emerald-600 shrink-0" />
              <span className="text-base font-semibold tracking-tight">
                Treehouse Intelligence
              </span>
            </div>
            <div className="border-t" />
            <nav className="flex flex-col gap-1 px-3 py-4">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-emerald-50 text-emerald-600"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Right: User button */}
        <div className="ml-auto flex items-center gap-4 shrink-0">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          >
            <UserButton.MenuItems>
              <UserButton.Link
                label="Settings"
                labelIcon={<Settings className="size-4" />}
                href="/settings"
              />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </header>

      {/* Page content — full width below nav */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
