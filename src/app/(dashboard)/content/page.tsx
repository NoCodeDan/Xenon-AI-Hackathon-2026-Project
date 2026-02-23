"use client";

import React, { useMemo, useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GradeBadge } from "@/components/grade-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Clock, PanelLeftOpen, PanelLeftClose, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TREEHOUSE_TOPICS,
  CATEGORY_OPTIONS,
  topicBadgeColor,
  topicLabel,
  DEFAULT_BADGE_COLOR,
} from "@/lib/topics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentType = "track" | "course" | "stage" | "video" | "practice" | "workshop" | "bonus";
type GradeLetter = "A" | "B" | "C" | "D" | "F";
type SortKey = "title" | "type" | "grade" | "score" | "updatedAt" | "topic" | "level" | "duration";
type SortDir = "asc" | "desc";
type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

const TYPE_TABS: { value: ContentType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "track", label: "Tracks" },
  { value: "course", label: "Courses" },
  { value: "workshop", label: "Workshops" },
  { value: "practice", label: "Practice" },
  { value: "stage", label: "Stages" },
  { value: "video", label: "Videos" },
  { value: "bonus", label: "Bonus" },
];

const GRADE_OPTIONS: { value: GradeLetter | "all"; label: string }[] = [
  { value: "all", label: "All Grades" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "F", label: "F" },
];

const typeBadgeColor: Record<ContentType, string> = {
  track: "bg-purple-100 text-purple-800 border-purple-200",
  course: "bg-indigo-100 text-indigo-800 border-indigo-200",
  workshop: "bg-amber-100 text-amber-800 border-amber-200",
  stage: "bg-sky-100 text-sky-800 border-sky-200",
  video: "bg-pink-100 text-pink-800 border-pink-200",
  practice: "bg-teal-100 text-teal-800 border-teal-200",
  bonus: "bg-rose-100 text-rose-800 border-rose-200",
};

const GRADE_BAR_COLORS: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-emerald-400",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

const skillLevelColor: Record<SkillLevel, string> = {
  Beginner: "bg-green-100 text-green-800 border-green-200",
  Intermediate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Advanced: "bg-red-100 text-red-800 border-red-200",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Helper: format relative time
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
// Loading skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="px-4">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Tabs skeleton */}
      <Skeleton className="h-9 w-full max-w-lg" />
      {/* Filter skeletons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full sm:w-72" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="border-b px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 border-b px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

function SummaryCards({
  stats,
  gradeDistribution,
}: {
  stats: { total: number; typeCounts: Record<string, number> } | undefined;
  gradeDistribution: Record<string, number> | undefined;
}) {
  const total = stats?.total ?? 0;
  const dist = gradeDistribution ?? {};
  const gradeTotal = Object.values(dist).reduce((s, n) => s + n, 0);
  const fCount = dist["F"] ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total items */}
      <Card className="py-4">
        <CardContent className="px-4">
          <p className="text-xs font-medium text-muted-foreground">Total Items</p>
          <p className="text-2xl font-bold tabular-nums">
            {stats ? total.toLocaleString() : <Skeleton className="inline-block h-7 w-16" />}
          </p>
        </CardContent>
      </Card>

      {/* Grade distribution mini-bar */}
      <Card className="py-4">
        <CardContent className="px-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Grade Distribution</p>
          {gradeDistribution ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {(["A", "B", "C", "D", "F"] as const).map((g) => {
                  const count = dist[g] ?? 0;
                  if (count === 0) return null;
                  const pct = (count / gradeTotal) * 100;
                  return (
                    <div
                      key={g}
                      className={`${GRADE_BAR_COLORS[g]} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${g}: ${count}`}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                {(["A", "B", "C", "D", "F"] as const).map((g) => (
                  <span key={g} className="tabular-nums">
                    <span className={`inline-block mr-0.5 size-2 rounded-full ${GRADE_BAR_COLORS[g]}`} />
                    {g}: {(dist[g] ?? 0).toLocaleString()}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <Skeleton className="h-3 w-full rounded-full" />
          )}
        </CardContent>
      </Card>

      {/* Needs attention */}
      <Card className="py-4">
        <CardContent className="px-4">
          <p className="text-xs font-medium text-muted-foreground">Needs Attention</p>
          <p className="text-2xl font-bold tabular-nums">
            {gradeDistribution ? (
              <span className={fCount > 0 ? "text-red-600" : "text-emerald-600"}>
                {fCount.toLocaleString()}
              </span>
            ) : (
              <Skeleton className="inline-block h-7 w-16" />
            )}
          </p>
          <p className="text-xs text-muted-foreground">F-grade items</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort icon component
// ---------------------------------------------------------------------------

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
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
// Inner content (needs Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

function ContentTableInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-param-based filter state
  const searchTerm = searchParams.get("q") ?? "";
  const typeFilter = (searchParams.get("type") ?? "all") as ContentType | "all";
  const gradeFilter = (searchParams.get("grade") ?? "all") as GradeLetter | "all";
  const categoryFilter = searchParams.get("category") ?? "all";

  // Client-side sort state
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Convex queries — stats + distribution (lightweight)
  const stats = useQuery(api.content.getContentStats);
  const gradeDistribution = useQuery(api.grades.getDistribution);

  // Paginated query — args change auto-resets cursor
  const paginatedArgs = useMemo(() => {
    const args: { type?: ContentType; grade?: string } = {};
    if (typeFilter !== "all") args.type = typeFilter;
    if (gradeFilter !== "all") args.grade = gradeFilter;
    return args;
  }, [typeFilter, gradeFilter]);

  const {
    results: paginatedResults,
    status: paginationStatus,
    loadMore,
    isLoading: isPaginatedLoading,
  } = usePaginatedQuery(
    api.content.getContentPaginated,
    paginatedArgs,
    { initialNumItems: 50 }
  );

  // Search results (when actively searching)
  const searchResults = useQuery(
    api.content.search,
    searchTerm.length >= 2
      ? {
          searchTerm,
          ...(typeFilter !== "all" ? { type: typeFilter } : {}),
        }
      : "skip"
  );

  // ------ URL parameter helpers ------

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.replace(`/content?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // ------ Toggle sort ------

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

  // ------ Derive filtered + sorted rows ------

  const isSearching = searchTerm.length >= 2;

  const rows = useMemo(() => {
    // When searching, use search results
    if (isSearching) {
      if (!searchResults) return undefined;

      let base = searchResults.map((item) => {
        // Enrich search results with grade info from paginated results if available
        const match = paginatedResults.find((a) => a._id === item._id);
        if (match) return match;
        return { ...item, latestGrade: null as any, topicName: null, category: null };
      });

      // Grade filter (client-side on search results)
      if (gradeFilter !== "all") {
        base = base.filter((item) => item.latestGrade?.grade === gradeFilter);
      }

      // Category filter
      if (categoryFilter !== "all") {
        base = base.filter((item) => item.category === categoryFilter);
      }

      return base;
    }

    // Not searching — use paginated results
    if (isPaginatedLoading && paginatedResults.length === 0) return undefined;

    let base = [...paginatedResults];

    // Category filter (client-side)
    if (categoryFilter !== "all") {
      base = base.filter((item) => item.category === categoryFilter);
    }

    // Client-side search fallback for short queries (1 char)
    if (searchTerm.length === 1) {
      const lowerQ = searchTerm.toLowerCase();
      base = base.filter((item) => item.title.toLowerCase().includes(lowerQ));
    }

    // Sort
    const sorted = base.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "grade":
          cmp = (a.latestGrade?.grade ?? "Z").localeCompare(
            b.latestGrade?.grade ?? "Z"
          );
          break;
        case "score":
          cmp =
            (a.latestGrade?.overallScore ?? -1) -
            (b.latestGrade?.overallScore ?? -1);
          break;
        case "updatedAt":
          cmp = a.updatedAt - b.updatedAt;
          break;
        case "topic":
          cmp = (a.topicName ?? "zzz").localeCompare(b.topicName ?? "zzz");
          break;
        case "level":
          cmp = (a.skillLevel ?? "zzz").localeCompare(b.skillLevel ?? "zzz");
          break;
        case "duration":
          cmp = (a.estimatedMinutes ?? -1) - (b.estimatedMinutes ?? -1);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [paginatedResults, searchResults, searchTerm, isSearching, gradeFilter, categoryFilter, sortKey, sortDir, isPaginatedLoading]);

  // ------ Loading state ------

  if (rows === undefined) {
    return <PageSkeleton />;
  }

  // ------ Render ------

  return (
    <div className="space-y-4">
      {/* Summary stats cards */}
      <SummaryCards stats={stats} gradeDistribution={gradeDistribution} />

      {/* Type tabs */}
      <Tabs
        value={typeFilter}
        onValueChange={(v) => updateParam("type", v)}
      >
        <TabsList>
          {TYPE_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? stats?.total
                : stats?.typeCounts[tab.value];
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                    {count.toLocaleString()}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => updateParam("q", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grade filter */}
        <Select
          value={gradeFilter}
          onValueChange={(v) => updateParam("grade", v)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            {GRADE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Topic filter */}
        <Select
          value={categoryFilter}
          onValueChange={(v) => updateParam("category", v)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Topics" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Results count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {rows.length} item{rows.length !== 1 && "s"}
        </span>
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
                onClick={() => toggleSort("topic")}
              >
                Topic
                <SortIcon column="topic" sortKey={sortKey} sortDir={sortDir} />
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
                onClick={() => toggleSort("level")}
              >
                Level
                <SortIcon column="level" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("duration")}
              >
                Duration
                <SortIcon column="duration" sortKey={sortKey} sortDir={sortDir} />
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
                onClick={() => toggleSort("score")}
              >
                Score
                <SortIcon column="score" sortKey={sortKey} sortDir={sortDir} />
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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-muted-foreground"
                >
                  No content items found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item._id} className="group">
                  <TableCell className="max-w-xs truncate font-medium">
                    <Link
                      href={`/content/${item._id}`}
                      className="hover:underline"
                    >
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {item.topicName ? (
                      <Badge
                        variant="outline"
                        className={topicBadgeColor[item.category ?? ""] ?? DEFAULT_BADGE_COLOR}
                      >
                        {item.topicName}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={typeBadgeColor[item.type as ContentType] ?? ""}
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.skillLevel ? (
                      <Badge
                        variant="outline"
                        className={skillLevelColor[item.skillLevel as SkillLevel] ?? ""}
                      >
                        {item.skillLevel}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {item.estimatedMinutes ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="size-3" />
                        {formatDuration(item.estimatedMinutes)}
                      </span>
                    ) : (
                      <span className="text-xs">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.latestGrade ? (
                      <GradeBadge
                        grade={item.latestGrade.grade}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {item.latestGrade
                      ? item.latestGrade.overallScore.toFixed(1)
                      : "--"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDate(item.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/content/${item._id}`}
                      className="text-sm text-emerald-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load more / status */}
      {!isSearching && (
        <div className="flex justify-center py-2">
          {paginationStatus === "CanLoadMore" && (
            <Button
              variant="outline"
              onClick={() => loadMore(50)}
            >
              Load More
            </Button>
          )}
          {paginationStatus === "LoadingMore" && (
            <Button variant="outline" disabled>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </Button>
          )}
          {paginationStatus === "Exhausted" && paginatedResults.length > 0 && (
            <p className="text-sm text-muted-foreground">
              All {paginatedResults.length.toLocaleString()} items loaded
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topics Sidebar
// ---------------------------------------------------------------------------

function TopicsSidebar({
  activeTopic,
  onSelectTopic,
  isOpen,
  onToggle,
}: {
  activeTopic: string;
  onSelectTopic: (slug: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-background transition-all duration-200 shrink-0",
        isOpen ? "w-56" : "w-0 overflow-hidden border-r-0"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Library className="size-4" />
          Topics
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onToggle}
        >
          <PanelLeftClose className="size-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2 px-2">
          <button
            onClick={() => onSelectTopic("all")}
            className={cn(
              "w-full text-left rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTopic === "all"
                ? "bg-emerald-50 text-emerald-600"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            All Topics
          </button>
          {TREEHOUSE_TOPICS.map((topic) => (
            <button
              key={topic.slug}
              onClick={() => onSelectTopic(topic.slug)}
              className={cn(
                "w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors",
                activeTopic === topic.slug
                  ? "bg-emerald-50 text-emerald-600 font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Exported page component (wraps inner with Suspense for useSearchParams)
// ---------------------------------------------------------------------------

function ContentPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const categoryFilter = searchParams.get("category") ?? "all";

  const updateCategory = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug === "all") {
        params.delete("category");
      } else {
        params.set("category", slug);
      }
      router.replace(`/content?${params.toString()}`, { scroll: false });
      setMobileSheetOpen(false);
    },
    [router, searchParams]
  );

  // Disable parent main scroll/padding so sidebar fills height
  const containerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = containerRef.current?.closest("main");
    if (!main) return;
    const prevOverflow = main.style.overflow;
    const prevPadding = main.style.padding;
    main.style.overflow = "hidden";
    main.style.padding = "0";
    return () => {
      main.style.overflow = prevOverflow;
      main.style.padding = prevPadding;
    };
  }, []);

  return (
    <div ref={containerRef} className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Desktop sidebar */}
      <TopicsSidebar
        activeTopic={categoryFilter}
        onSelectTopic={updateCategory}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Sidebar toggle (when collapsed) + mobile toggle */}
        <div className="flex items-center gap-2 mb-4">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex size-8"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
              <span className="sr-only">Open sidebar</span>
            </Button>
          )}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden gap-2">
                <Library className="size-4" />
                Topics
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Topics</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-2 px-4 py-4">
                <Library className="size-5 text-emerald-600" />
                <span className="font-semibold">Topics</span>
              </div>
              <div className="border-t" />
              <ScrollArea className="flex-1">
                <div className="py-2 px-2">
                  <button
                    onClick={() => updateCategory("all")}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      categoryFilter === "all"
                        ? "bg-emerald-50 text-emerald-600"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    All Topics
                  </button>
                  {TREEHOUSE_TOPICS.map((topic) => (
                    <button
                      key={topic.slug}
                      onClick={() => updateCategory(topic.slug)}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                        categoryFilter === topic.slug
                          ? "bg-emerald-50 text-emerald-600 font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        <Suspense fallback={<PageSkeleton />}>
          <ContentTableInner />
        </Suspense>
      </div>
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContentPageInner />
    </Suspense>
  );
}
