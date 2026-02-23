"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RequireRoleProps {
  role: "admin" | "editor" | "viewer";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view this page. Contact an
            administrator if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function RequireRole({ role, children, fallback }: RequireRoleProps) {
  const { isAdmin, isEditor, isViewer, isLoading } = useRole();

  if (isLoading) return <LoadingSkeleton />;

  const hasAccess =
    role === "admin" ? isAdmin : role === "editor" ? isEditor : isViewer;

  if (!hasAccess) return fallback ?? <AccessDenied />;
  return <>{children}</>;
}
