"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/grade-badge";
import { BookmarkButton } from "@/components/bookmark-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Clock } from "lucide-react";

type ContentType = "track" | "course" | "stage" | "video" | "practice" | "workshop" | "bonus";
type Priority = "low" | "medium" | "high";

const typeBadgeColor: Record<ContentType, string> = {
  track: "bg-purple-100 text-purple-800 border-purple-200",
  course: "bg-indigo-100 text-indigo-800 border-indigo-200",
  workshop: "bg-amber-100 text-amber-800 border-amber-200",
  stage: "bg-sky-100 text-sky-800 border-sky-200",
  video: "bg-pink-100 text-pink-800 border-pink-200",
  practice: "bg-teal-100 text-teal-800 border-teal-200",
  bonus: "bg-rose-100 text-rose-800 border-rose-200",
};

const priorityConfig: Record<Priority, { label: string; dotClass: string; borderClass: string }> = {
  high: { label: "High", dotClass: "bg-red-500", borderClass: "border-l-red-500" },
  medium: { label: "Medium", dotClass: "bg-amber-500", borderClass: "border-l-amber-500" },
  low: { label: "Low", dotClass: "bg-blue-500", borderClass: "border-l-blue-500" },
};

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

function BookmarkCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="size-7 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookmarksPage() {
  const bookmarks = useQuery(api.bookmarks.getMyBookmarks);

  const grouped = bookmarks
    ? {
        high: bookmarks.filter((b) => b.priority === "high"),
        medium: bookmarks.filter((b) => b.priority === "medium"),
        low: bookmarks.filter((b) => b.priority === "low"),
      }
    : null;

  const totalCount = bookmarks?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Bookmarks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Content you've flagged for updating or refreshing.
        </p>
      </div>

      {/* Loading state */}
      {bookmarks === undefined && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BookmarkCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {bookmarks && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bookmark className="size-10 text-muted-foreground/40 mb-3" />
          <h2 className="text-lg font-semibold">No bookmarks yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Bookmark content items from the{" "}
            <Link href="/content" className="text-emerald-600 hover:underline">
              Content
            </Link>{" "}
            page to flag them for updating.
          </p>
        </div>
      )}

      {/* Grouped bookmark cards */}
      {grouped &&
        totalCount > 0 &&
        (["high", "medium", "low"] as const).map((priority) => {
          const items = grouped[priority];
          if (items.length === 0) return null;
          const config = priorityConfig[priority];
          return (
            <section key={priority}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`size-2.5 rounded-full ${config.dotClass}`} />
                <h2 className="text-sm font-semibold">{config.label} Priority</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card
                    key={item._id}
                    className={`border-l-4 ${config.borderClass} transition-shadow hover:shadow-md`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Link
                            href={`/content/${item.contentId}`}
                            className="font-medium text-sm hover:text-emerald-600 transition-colors line-clamp-2 block"
                          >
                            {item.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={typeBadgeColor[item.type as ContentType] ?? ""}
                            >
                              {item.type}
                            </Badge>
                            {item.grade && (
                              <GradeBadge
                                grade={item.grade}
                                score={item.overallScore ?? undefined}
                                size="sm"
                              />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            Bookmarked {formatRelativeDate(item.createdAt)}
                          </p>
                        </div>
                        <BookmarkButton contentId={item.contentId} size="sm" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
