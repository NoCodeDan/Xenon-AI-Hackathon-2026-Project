"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { GradeBadge } from "@/components/grade-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  ExternalLink,
  RefreshCcw,
  Pencil,
  Clock,
  ArrowRight,
} from "lucide-react";
import { BookmarkButton } from "@/components/bookmark-button";
import {
  topicBadgeColor,
  topicLabel,
  DEFAULT_BADGE_COLOR,
} from "@/lib/topics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentType = "track" | "course" | "stage" | "video" | "practice" | "workshop" | "bonus";
type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

const typeBadgeColor: Record<ContentType, string> = {
  track: "bg-purple-100 text-purple-800 border-purple-200",
  course: "bg-indigo-100 text-indigo-800 border-indigo-200",
  workshop: "bg-amber-100 text-amber-800 border-amber-200",
  stage: "bg-sky-100 text-sky-800 border-sky-200",
  video: "bg-pink-100 text-pink-800 border-pink-200",
  practice: "bg-teal-100 text-teal-800 border-teal-200",
  bonus: "bg-rose-100 text-rose-800 border-rose-200",
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

const gradeBarColors: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-emerald-400",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
// Score progress bar
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  value,
  max = 100,
  colorClass,
}: {
  label: string;
  value: number;
  max?: number;
  colorClass: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini sparkline (SVG)
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  width = 200,
  height = 40,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <span className="text-xs text-muted-foreground">
        Not enough data for sparkline
      </span>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polylinePoints = points.join(" ");

  // Gradient area
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest point dot */}
      {points.length > 0 && (
        <circle
          cx={width}
          cy={parseFloat(points[points.length - 1].split(",")[1])}
          r={3}
          fill="hsl(var(--primary))"
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Title area */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-96" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {/* Grade card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ContentDetailPage() {
  const params = useParams();
  const contentId = params.id as string;

  // Cast the string to a Convex Id type for the queries
  const id = contentId as Id<"contentItems">;

  // Data fetching
  const content = useQuery(api.content.getById, { id });
  const parents = useQuery(api.content.getParents, { childId: id, edgeType: "contains" });
  const children = useQuery(api.content.getChildren, { parentId: id, edgeType: "contains" });
  const latestGrade = useQuery(api.grades.getLatest, { contentId: id });
  const gradeHistory = useQuery(api.grades.getHistory, { contentId: id });

  // Loading state
  if (content === undefined) {
    return <DetailSkeleton />;
  }

  // Not found
  if (content === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-xl font-semibold">Content not found</h2>
        <p className="mt-2 text-muted-foreground">
          The content item you are looking for does not exist.
        </p>
        <Link href="/content">
          <Button variant="outline" className="mt-4">
            Back to Content
          </Button>
        </Link>
      </div>
    );
  }

  // Resolve the full freshness score document from the latest grade
  const latestScore =
    gradeHistory && gradeHistory.length > 0 ? gradeHistory[0] : null;

  // Sparkline data: scores ordered oldest-to-newest
  const sparklineData = gradeHistory
    ? [...gradeHistory].reverse().map((s) => s.overallScore)
    : [];

  const gradeColor =
    gradeBarColors[latestGrade?.grade ?? ""] ?? "bg-gray-400";

  return (
    <div className="space-y-6">
      {/* ---- Breadcrumb ---- */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/content" className="hover:text-foreground transition-colors">
          Content
        </Link>
        {parents &&
          parents
            .filter((p) => p.content !== null)
            .map((p) => (
              <React.Fragment key={p.edge._id}>
                <ChevronRight className="size-3.5 shrink-0" />
                <Link
                  href={`/content/${p.content!._id}`}
                  className="hover:text-foreground transition-colors"
                >
                  {p.content!.title}
                </Link>
              </React.Fragment>
            ))}
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="font-medium text-foreground truncate max-w-xs">
          {content.title}
        </span>
      </nav>

      {/* ---- Header ---- */}
      <div className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {content.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  typeBadgeColor[content.type as ContentType] ?? ""
                }
              >
                {content.type}
              </Badge>
              {content.topics?.map((topic: any) => (
                <Badge
                  key={topic._id}
                  variant="outline"
                  className={topicBadgeColor[topic.domain] ?? DEFAULT_BADGE_COLOR}
                >
                  {topic.name}
                </Badge>
              ))}
              {content.skillLevel && (
                <Badge
                  variant="outline"
                  className={skillLevelColor[content.skillLevel as SkillLevel] ?? ""}
                >
                  {content.skillLevel}
                </Badge>
              )}
              {content.estimatedMinutes && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2.5 py-0.5">
                  <Clock className="size-3" />
                  {formatDuration(content.estimatedMinutes)}
                </span>
              )}
              {latestGrade && (
                <GradeBadge
                  grade={latestGrade.grade}
                  score={latestGrade.overallScore}
                />
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                Updated {formatRelativeDate(content.updatedAt)}
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 shrink-0">
            <BookmarkButton contentId={id} />
            <Button variant="outline" size="sm" disabled>
              <RefreshCcw className="size-3.5" />
              Re-grade
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/content/${content._id}/edit`}>
                <Pencil className="size-3.5" />
                Edit
              </Link>
            </Button>
          </div>
        </div>

        {content.description && (
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            {content.description}
          </p>
        )}

        {content.url && (
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            View original content
          </a>
        )}
      </div>

      {/* ---- Grade Breakdown + History ---- */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grade breakdown card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Grade Breakdown</CardTitle>
            <CardDescription>
              Freshness score components and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestScore ? (
              <div className="space-y-6">
                {/* Overall score large display */}
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-20 items-center justify-center rounded-2xl text-3xl font-bold text-white ${gradeColor}`}
                    >
                      {latestScore.grade}
                    </span>
                    <span className="mt-1.5 text-xs text-muted-foreground">
                      Grade
                    </span>
                  </div>
                  <div>
                    <div className="text-4xl font-bold tabular-nums">
                      {latestScore.overallScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Overall freshness score
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Confidence: {(latestScore.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Score bars */}
                <div className="space-y-4">
                  <ScoreBar
                    label="Recency"
                    value={latestScore.recencyScore}
                    colorClass="bg-emerald-500"
                  />
                  <ScoreBar
                    label="Alignment"
                    value={latestScore.alignmentScore}
                    colorClass="bg-emerald-500"
                  />
                  <ScoreBar
                    label="Demand"
                    value={latestScore.demandScore}
                    colorClass="bg-violet-500"
                  />
                </div>

                {/* Velocity multiplier */}
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <span className="text-sm text-muted-foreground">
                    Velocity Multiplier
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    {latestScore.velocityMultiplier.toFixed(2)}x
                  </span>
                </div>

                {/* Outdated topics */}
                {latestScore.outdatedTopics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-orange-700">
                      Outdated Topics
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {latestScore.outdatedTopics.map((topic) => (
                        <Badge
                          key={topic}
                          variant="outline"
                          className="border-orange-200 bg-orange-50 text-orange-700"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing topics */}
                {latestScore.missingTopics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-700">
                      Missing Topics
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {latestScore.missingTopics.map((topic) => (
                        <Badge
                          key={topic}
                          variant="outline"
                          className="border-red-200 bg-red-50 text-red-700"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended action */}
                {latestScore.recommendedAction && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <h4 className="text-sm font-medium">Recommended Action</h4>
                    <p className="text-sm text-muted-foreground">
                      {latestScore.recommendedAction}
                    </p>
                  </div>
                )}

                {/* Graded against snapshot audit link */}
                <div className="pt-2 border-t">
                  <Link
                    href={`/topics?snapshot=${latestScore.topicSnapshotId}`}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Graded against snapshot {String(latestScore.topicSnapshotId).slice(-8)}
                    <ExternalLink className="size-3" />
                  </Link>
                  <span className="ml-3 text-xs text-muted-foreground">
                    {formatDate(latestScore.createdAt)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <p className="text-sm">No grade available yet.</p>
                <p className="mt-1 text-xs">
                  This content item has not been graded.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade history sparkline card */}
        <Card>
          <CardHeader>
            <CardTitle>Score History</CardTitle>
            <CardDescription>
              {gradeHistory
                ? `${gradeHistory.length} grading${gradeHistory.length !== 1 ? "s" : ""} recorded`
                : "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gradeHistory === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : sparklineData.length >= 2 ? (
              <div className="space-y-4">
                <Sparkline data={sparklineData} width={240} height={60} />
                {/* History list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {gradeHistory.slice(0, 10).map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <GradeBadge grade={entry.grade} size="sm" />
                        <span className="tabular-nums font-medium">
                          {entry.overallScore.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(entry.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : sparklineData.length === 1 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                <p>Only one grading recorded.</p>
                <p className="mt-1 tabular-nums font-medium text-foreground text-lg">
                  {sparklineData[0].toFixed(1)}
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No grading history yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Children content list ---- */}
      {children && children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Contains {children.length} item{children.length !== 1 && "s"}
            </CardTitle>
            <CardDescription>
              Child content items within this {content.type}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {children.map(({ edge, content: child }) => {
                if (!child) return null;
                return (
                  <Link
                    key={edge._id}
                    href={`/content/${child._id}`}
                    className="flex items-center justify-between py-3 group hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                        {edge.order}
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium truncate block">
                          {child.title}
                        </span>
                        {child.description && (
                          <span className="text-xs text-muted-foreground truncate block max-w-md">
                            {child.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Badge
                        variant="outline"
                        className={typeBadgeColor[child.type as ContentType] ?? ""}
                      >
                        {child.type}
                      </Badge>
                      <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
