"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCw,
  PlayCircle,
  RefreshCw,
  Loader2,
  FileWarning,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GradeBadge } from "@/components/grade-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_COLORS: Record<string, string> = {
  A: "#059669", // emerald-600
  B: "#10b981", // emerald-500
  C: "#34d399", // emerald-400
  D: "#6ee7b7", // emerald-300
  F: "#a7f3d0", // emerald-200
};

const GRADE_ORDER = ["A", "B", "C", "D", "F"] as const;

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  grading: {
    label: "Grading",
    icon: Loader2,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  graded: {
    label: "Graded",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentItem = {
  _id: Id<"contentItems">;
  title: string;
  type: string;
  gradingStatus: "pending" | "grading" | "graded" | "failed";
  lastGradingError?: string;
  updatedAt: number;
  createdAt: number;
  latestGrade: {
    grade: string;
    overallScore: number;
    updatedAt: number;
  } | null;
};

type SortKey = "title" | "type" | "status" | "grade" | "updatedAt";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helper: Format relative date
// ---------------------------------------------------------------------------

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function GradingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats banner skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Banner
// ---------------------------------------------------------------------------

function StatsBanner({
  items,
}: {
  items: ContentItem[];
}) {
  const stats = useMemo(() => {
    const graded = items.filter((i) => i.gradingStatus === "graded").length;
    const pending = items.filter((i) => i.gradingStatus === "pending").length;
    const failed = items.filter((i) => i.gradingStatus === "failed").length;
    const inProgress = items.filter((i) => i.gradingStatus === "grading").length;
    return { graded, pending, failed, inProgress, total: items.length };
  }, [items]);

  const statCards = [
    {
      label: "Total Items",
      value: stats.total,
      icon: FileWarning,
      className: "text-foreground",
    },
    {
      label: "Graded",
      value: stats.graded,
      icon: CheckCircle2,
      className: "text-emerald-600",
    },
    {
      label: "Pending",
      value: stats.pending + stats.inProgress,
      icon: Clock,
      className: "text-amber-600",
    },
    {
      label: "Failed",
      value: stats.failed,
      icon: AlertCircle,
      className: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("rounded-lg bg-muted p-2.5", stat.className)}>
              <stat.icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grade Distribution Mini Chart
// ---------------------------------------------------------------------------

function GradeDistributionMini({ items }: { items: ContentItem[] }) {
  const distribution = useQuery(api.grades.getDistribution);

  if (distribution === undefined) {
    return <Skeleton className="h-48 w-full" />;
  }

  const chartData = GRADE_ORDER.map((grade) => ({
    grade,
    count: (distribution as Record<string, number>)[grade] ?? 0,
    fill: GRADE_COLORS[grade],
  }));

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No graded items yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barCategoryGap="20%">
        <XAxis dataKey="grade" tick={{ fontSize: 14, fontWeight: 600 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.grade} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Status Badge Component
// ---------------------------------------------------------------------------

function GradingStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    icon: Clock,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 text-xs font-medium", config.className)}>
      <Icon className={cn("size-3", status === "grading" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Sort icon component
// ---------------------------------------------------------------------------

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (column !== sortKey) {
    return <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground/50" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 inline size-3.5" />
  ) : (
    <ArrowDown className="ml-1 inline size-3.5" />
  );
}

// ---------------------------------------------------------------------------
// Queue Tab: Table of items grouped by status
// ---------------------------------------------------------------------------

function QueueTab({ items }: { items: ContentItem[] }) {
  const setGradingStatus = useMutation(api.content.setGradingStatus);

  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const handleRetry = useCallback(
    async (id: Id<"contentItems">, title: string) => {
      setRetrying((prev) => new Set(prev).add(id));
      try {
        await setGradingStatus({
          id,
          gradingStatus: "pending",
        });
        toast.success(`"${title}" has been re-queued for grading.`);
      } catch {
        toast.error(`Failed to re-queue "${title}".`);
      } finally {
        setRetrying((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [setGradingStatus]
  );

  const filtered = useMemo(() => {
    let base = items;
    if (statusFilter !== "all") {
      base = base.filter((item) => item.gradingStatus === statusFilter);
    }

    return [...base].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "status": {
          const order = { failed: 0, pending: 1, grading: 2, graded: 3 };
          cmp =
            (order[a.gradingStatus] ?? 99) - (order[b.gradingStatus] ?? 99);
          break;
        }
        case "grade":
          cmp = (a.latestGrade?.grade ?? "Z").localeCompare(
            b.latestGrade?.grade ?? "Z"
          );
          break;
        case "updatedAt":
          cmp = a.updatedAt - b.updatedAt;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, statusFilter, sortKey, sortDir]);

  // Status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.gradingStatus] = (counts[item.gradingStatus] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "failed", label: "Failed" },
          { key: "pending", label: "Pending" },
          { key: "grading", label: "In Progress" },
          { key: "graded", label: "Graded" },
        ].map((opt) => (
          <Button
            key={opt.key}
            variant={statusFilter === opt.key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(opt.key)}
          >
            {opt.label}
            {(statusCounts[opt.key] ?? 0) > 0 && (
              <Badge
                variant={statusFilter === opt.key ? "secondary" : "outline"}
                className="ml-1.5 text-xs"
              >
                {statusCounts[opt.key]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("title")}
              >
                Title
                <SortIcon column="title" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("type")}
              >
                Type
                <SortIcon column="type" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("status")}
              >
                Status
                <SortIcon column="status" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("grade")}
              >
                Grade
                <SortIcon column="grade" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("updatedAt")}
              >
                Updated
                <SortIcon column="updatedAt" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  No items found for this filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium">{item.title}</p>
                    {item.gradingStatus === "failed" && item.lastGradingError && (
                      <p className="mt-0.5 truncate text-xs text-red-600">
                        {item.lastGradingError}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <GradingStatusBadge status={item.gradingStatus} />
                  </TableCell>
                  <TableCell>
                    {item.latestGrade ? (
                      <GradeBadge
                        grade={item.latestGrade.grade}
                        score={item.latestGrade.overallScore}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDate(item.updatedAt)}
                  </TableCell>
                  <TableCell>
                    {item.gradingStatus === "failed" && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRetry(item._id, item.title)}
                        disabled={retrying.has(item._id)}
                      >
                        {retrying.has(item._id) ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <RotateCw className="size-3" />
                        )}
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

function HistoryTab({ items }: { items: ContentItem[] }) {
  const graded = useMemo(
    () =>
      items
        .filter((i) => i.gradingStatus === "graded" && i.latestGrade)
        .sort((a, b) => {
          const aTime = a.latestGrade?.updatedAt ?? 0;
          const bTime = b.latestGrade?.updatedAt ?? 0;
          return bTime - aTime;
        })
        .slice(0, 50),
    [items]
  );

  if (graded.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="size-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium">No grading history</p>
          <p className="text-sm text-muted-foreground">
            Items will appear here after they have been graded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Showing the {graded.length} most recently graded items.
      </p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Graded At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {graded.map((item) => (
              <TableRow key={item._id}>
                <TableCell className="max-w-xs truncate font-medium">
                  {item.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.latestGrade && (
                    <GradeBadge grade={item.latestGrade.grade} size="sm" />
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {item.latestGrade?.overallScore.toFixed(1) ?? "--"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.latestGrade
                    ? formatRelativeDate(item.latestGrade.updatedAt)
                    : "--"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------

function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grading Configuration</CardTitle>
          <CardDescription>
            Configure how content items are evaluated for freshness.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Grading settings will be available in a future update.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Currently using default scoring weights: Recency (40%), Alignment
              (35%), Demand (25%) with velocity multiplier.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading Schedule</CardTitle>
          <CardDescription>
            Automated re-grading runs on a configurable schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Scheduling configuration coming soon. Currently grading must be
              triggered manually.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function GradingPage() {
  const allItems = useQuery(api.content.getWithGrades);
  const [gradingAll, setGradingAll] = useState(false);
  const [regrading, setRegrading] = useState(false);

  const items: ContentItem[] = useMemo(() => {
    if (!allItems) return [];
    return allItems.map((item) => ({
      _id: item._id,
      title: item.title,
      type: item.type,
      gradingStatus: item.gradingStatus,
      lastGradingError: item.lastGradingError,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      latestGrade: item.latestGrade
        ? {
            grade: item.latestGrade.grade,
            overallScore: item.latestGrade.overallScore,
            updatedAt: item.latestGrade.updatedAt,
          }
        : null,
    }));
  }, [allItems]);

  const handleGradeAll = useCallback(() => {
    setGradingAll(true);
    // Placeholder: Actual grading actions are internal actions that run server-side
    setTimeout(() => {
      setGradingAll(false);
      const pendingCount = items.filter(
        (i) => i.gradingStatus === "pending"
      ).length;
      toast.info(
        `Grade All requested for ${pendingCount} pending item${pendingCount !== 1 ? "s" : ""}. Grading is triggered server-side.`
      );
    }, 1500);
  }, [items]);

  const handleRollingRegrade = useCallback(() => {
    setRegrading(true);
    // Placeholder: Rolling regrade is an internal action
    setTimeout(() => {
      setRegrading(false);
      toast.info(
        "Rolling regrade requested. This will process items server-side in the background."
      );
    }, 1500);
  }, []);

  if (allItems === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grading</h1>
          <p className="text-muted-foreground">
            Manage content freshness scoring and grading.
          </p>
        </div>
        <GradingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grading</h1>
          <p className="text-muted-foreground">
            Manage content freshness scoring and grading.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGradeAll}
            disabled={gradingAll}
          >
            {gradingAll ? (
              <Loader2 className="animate-spin" />
            ) : (
              <PlayCircle />
            )}
            {gradingAll ? "Queuing..." : "Grade All Pending"}
          </Button>
          <Button
            variant="outline"
            onClick={handleRollingRegrade}
            disabled={regrading}
          >
            {regrading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            {regrading ? "Queuing..." : "Rolling Regrade"}
          </Button>
        </div>
      </div>

      {/* Stats Banner */}
      <StatsBanner items={items} />

      {/* Tabbed Content */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Queue table - takes 2/3 width */}
            <div className="lg:col-span-2">
              <QueueTab items={items} />
            </div>

            {/* Grade distribution sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade Distribution</CardTitle>
                <CardDescription>
                  Current distribution of content grades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GradeDistributionMini items={items} />

                {/* Grade legend */}
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {GRADE_ORDER.map((grade) => (
                    <div key={grade} className="flex items-center gap-1.5">
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: GRADE_COLORS[grade] }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {grade}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab items={items} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
