"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Library,
  BarChart3,
  MessageSquarePlus,
  Bot,
  Radar,
  Settings,
  TreePine,
  Menu,
  Bookmark,
  ChevronDown,
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
  { label: "Market Intel", href: "/market-intel", icon: Radar },
  { label: "Chat", href: "/chat", icon: Bot },
];

const contentSubItems = [
  { label: "Content", href: "/content", icon: Library },
  { label: "Requests", href: "/requests", icon: MessageSquarePlus },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

// All top-level nav entries for the animated pill
const topNavEntries = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Content", href: "/content", icon: Library, id: "content", hasDropdown: true },
  { label: "Market Intel", href: "/market-intel", icon: Radar, id: "market-intel" },
  { label: "Chat", href: "/chat", icon: Bot, id: "chat" },
];

function DesktopNav({ pathname }: { pathname: string }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Determine which nav entry is currently active
  const activeId = topNavEntries.find((entry) => {
    if (entry.id === "content") {
      return isActive(pathname, "/content") || isActive(pathname, "/requests");
    }
    return isActive(pathname, entry.href);
  })?.id ?? null;

  // The highlighted item: hovered takes priority, otherwise active
  const highlightedId = hoveredId ?? activeId;

  return (
    <nav
      className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      onMouseLeave={() => setHoveredId(null)}
    >
      {topNavEntries.map((entry) => {
        const active = entry.id === activeId;
        const highlighted = entry.id === highlightedId;

        const linkEl = (
          <Link
            key={entry.id}
            href={entry.href}
            onMouseEnter={() => setHoveredId(entry.id)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              active
                ? "text-emerald-600"
                : hoveredId === entry.id
                  ? "text-accent-foreground"
                  : "text-muted-foreground"
            )}
          >
            {highlighted && (
              <motion.span
                layoutId="nav-pill"
                className={cn(
                  "absolute inset-0 rounded-md",
                  active && !hoveredId ? "bg-emerald-50" : hoveredId ? "bg-accent" : "bg-emerald-50"
                )}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <entry.icon className="size-4" />
              {entry.label}
              {entry.hasDropdown && <ChevronDown className="size-3 opacity-50" />}
            </span>
          </Link>
        );

        if (entry.hasDropdown) {
          return (
            <div key={entry.id} className="relative group">
              {linkEl}
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-0 top-full pt-1 z-50">
                <div className="rounded-lg border bg-popover p-1 shadow-md min-w-[160px]">
                  {contentSubItems.map((sub) => {
                    const subActive = isActive(pathname, sub.href);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          subActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <sub.icon className="size-4" />
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        return linkEl;
      })}
    </nav>
  );
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
      <header className="relative z-50 flex h-14 shrink-0 items-center border-b bg-background px-4 md:px-6">
        {/* Left: Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
          <TreePine className="size-5 text-emerald-600" />
          <span className="text-sm font-semibold tracking-tight hidden sm:inline">
            Treehouse Intelligence
          </span>
        </Link>

        {/* Center: Desktop nav links — absolutely centered */}
        <DesktopNav pathname={pathname} />

        {/* Spacer to push right items */}
        <div className="flex-1" />

        {/* Mobile: Hamburger menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
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
              {[...contentSubItems, ...navItems].map((item) => {
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

        {/* Right: User button — relative z-10 so it sits above the absolutely-centered nav */}
        <div className="relative z-10 flex items-center gap-4 shrink-0">
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
                label="Grading"
                labelIcon={<BarChart3 className="size-4" />}
                href="/grading"
              />
              <UserButton.Link
                label="My Bookmarks"
                labelIcon={<Bookmark className="size-4" />}
                href="/bookmarks"
              />
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
