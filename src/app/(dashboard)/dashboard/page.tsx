"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GradeBadge } from "@/components/grade-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Library,
  Target,
  Award,
  Tag,
  MessageSquarePlus,
  ChevronRight,
  MessageCircle,
  Bot,
  User,
  Send,
  Plus,
  X,
  MoreHorizontal,
  SquarePen,
  Loader2,
  ExternalLink,
  Play,
  type LucideIcon,
} from "lucide-react";
import { FormattedContent } from "@/components/formatted-content";
import { LinkPreviews } from "@/components/link-preview";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function velocityLabel(velocity: number): { label: string; className: string } {
  if (velocity >= 0.7)
    return { label: "Rapid", className: "bg-emerald-200 text-emerald-900" };
  if (velocity >= 0.4)
    return { label: "Fast", className: "bg-emerald-100 text-emerald-800" };
  return { label: "Moderate", className: "bg-emerald-50 text-emerald-700" };
}


// ---------------------------------------------------------------------------
// ContentPreviewCards — batch-loaded content cards for chat messages
// ---------------------------------------------------------------------------

function ContentPreviewCards({ contentIds }: { contentIds: Id<"contentItems">[] }) {
  const batchData = useQuery(api.dashboard.getBatchWithGrades, { contentIds });

  if (batchData === undefined) {
    return (
      <div className="space-y-2 pl-1">
        {contentIds.slice(0, 5).map((cid) => (
          <div key={cid} className="rounded-xl border border-emerald-200/60 bg-white p-3 animate-pulse">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const items = batchData.filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="space-y-2 pl-1">
      {items.slice(0, 5).map((item) => (
        <div key={item._id} className="rounded-xl border border-emerald-200/60 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Play className="size-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium leading-tight">
                  {item.title}
                </span>
                {item.latestGrade && <GradeBadge grade={item.latestGrade.grade} size="sm" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                {item.type}
              </p>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <Link
                  href={`/content/${item._id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  View Details
                  <ExternalLink className="size-3" />
                </Link>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-600 hover:underline"
                  >
                    Watch on Treehouse
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {contentIds.length > 5 && (
        <p className="text-center text-xs text-muted-foreground">
          +{contentIds.length - 5} more results
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Atoms: StatCard, WidgetHeader, SuggestionLink
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  value,
  label,
  loading,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border bg-card p-5">
      <Icon className="h-5 w-5 text-emerald-600" />
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function WidgetHeader({
  title,
  description,
  href,
}: {
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
      {href && (
        <CardAction>
          <Link
            href={href}
            className="inline-flex items-center text-emerald-400 transition-colors hover:text-emerald-600"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </CardAction>
      )}
    </CardHeader>
  );
}

function SuggestionLink({
  question,
  onClick,
}: {
  question: string;
  onClick?: () => void;
}) {
  return (
    <CardFooter>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-600/70 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        <span>{question}</span>
      </button>
    </CardFooter>
  );
}

// ---------------------------------------------------------------------------
// SummaryStatsRow
// ---------------------------------------------------------------------------

function SummaryStatsRow() {
  const summary = useQuery(api.dashboard.getSummary);

  const loading = summary === undefined;

  const latest = summary?.latestSnapshot;
  const totalContent = summary?.contentStats?.total ?? 0;
  const avgScore = latest ? Math.round(latest.averageScore) : 0;

  let aGradeRate = 0;
  if (latest) {
    const dist = latest.gradeDistribution as Record<string, number>;
    const total = Object.values(dist).reduce((s, n) => s + n, 0);
    if (total > 0) {
      aGradeRate = Math.round(((dist["A"] ?? 0) / total) * 100);
    }
  }

  const topicsTracked = latest?.topicBreakdown?.length ?? 0;
  const openRequestCount = summary?.openRequestCount ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        icon={Library}
        value={loading ? "—" : totalContent}
        label="Total Content"
        loading={loading}
      />
      <StatCard
        icon={Target}
        value={loading ? "—" : avgScore}
        label="Avg Score"
        loading={loading}
      />
      <StatCard
        icon={Award}
        value={loading ? "—" : `${aGradeRate}%`}
        label="A-Grade Rate"
        loading={loading}
      />
      <StatCard
        icon={Tag}
        value={loading ? "—" : topicsTracked}
        label="Topics Tracked"
        loading={loading}
      />
      <StatCard
        icon={MessageSquarePlus}
        value={loading ? "—" : openRequestCount}
        label="Open Requests"
        loading={loading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget: Content by Type (Donut Chart)
// ---------------------------------------------------------------------------

const TYPE_CHART_COLORS: Record<string, string> = {
  course: "#6366f1",
  track: "#a855f7",
  workshop: "#f59e0b",
  practice: "#14b8a6",
  video: "#ec4899",
  stage: "#0ea5e9",
  bonus: "#f43f5e",
};

const TYPE_LABELS: Record<string, string> = {
  course: "Courses",
  track: "Tracks",
  workshop: "Workshops",
  practice: "Practice",
  video: "Videos",
  stage: "Stages",
  bonus: "Bonus",
};

function ContentByTypeWidget({ typeCounts }: { typeCounts?: Record<string, number> }) {
  if (typeCounts === undefined) {
    return (
      <Card>
        <WidgetHeader title="Content by Type" href="/content" />
        <CardContent className="h-56">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = Object.entries(typeCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      name: TYPE_LABELS[type] ?? type,
      value: count,
      type,
    }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <WidgetHeader title="Content by Type" href="/content" />
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((d) => (
                <Cell key={d.type} fill={TYPE_CHART_COLORS[d.type] ?? "#94a3b8"} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
              formatter={(value) => {
                const v = Number(value ?? 0);
                return `${v.toLocaleString()} (${Math.round((v / total) * 100)}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-4 pb-4">
        {chartData.map((d) => (
          <div key={d.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: TYPE_CHART_COLORS[d.type] ?? "#94a3b8" }}
            />
            {d.name}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Widget: Grade Breakdown (Bar Chart)
// ---------------------------------------------------------------------------

function GradeBreakdownWidget({ distribution }: { distribution?: Record<string, number> }) {

  if (distribution === undefined) {
    return (
      <Card>
        <WidgetHeader title="Grade Breakdown" href="/grading" />
        <CardContent className="h-56">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = GRADE_ORDER.map((grade) => ({
    grade,
    count: (distribution as Record<string, number>)[grade] ?? 0,
  }));

  return (
    <Card>
      <WidgetHeader title="Grade Breakdown" href="/grading" />
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <XAxis dataKey="grade" tick={{ fontSize: 14, fontWeight: 600 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <RechartsTooltip
              contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Widget: Needs Attention (Worst Performers)
// ---------------------------------------------------------------------------

function NeedsAttentionWidget({ onAskChat, worstPerformers }: { onAskChat: (q: string) => void; worstPerformers?: any[] }) {

  if (worstPerformers === undefined) {
    return (
      <Card>
        <WidgetHeader title="Needs Attention" href="/content" />
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (worstPerformers.length === 0) {
    return (
      <Card>
        <WidgetHeader title="Needs Attention" href="/content" />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No graded content yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <WidgetHeader title="Needs Attention" href="/content" />
      <CardContent>
        <ul className="space-y-2">
          {worstPerformers.map((item) => (
            <li key={item._id}>
              <Link
                href={`/content/${item.contentId}`}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <GradeBadge grade={item.grade} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline">
                  {item.title ?? "Untitled"}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {item.overallScore.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
      <SuggestionLink
        question="What content should I update first?"
        onClick={() => onAskChat("What content should I update first?")}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Widget: Top Performers (Best Performers)
// ---------------------------------------------------------------------------

function TopPerformersWidget({ bestPerformers }: { bestPerformers?: any[] }) {

  if (bestPerformers === undefined) {
    return (
      <Card>
        <WidgetHeader title="Top Performers" href="/content" />
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (bestPerformers.length === 0) {
    return (
      <Card>
        <WidgetHeader title="Top Performers" href="/content" />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No graded content yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <WidgetHeader title="Top Performers" href="/content" />
      <CardContent>
        <ul className="space-y-2">
          {bestPerformers.map((item) => (
            <li key={item._id}>
              <Link
                href={`/content/${item.contentId}`}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <GradeBadge grade={item.grade} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline">
                  {item.title ?? "Untitled"}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {item.overallScore.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Widget: Trending Topics
// ---------------------------------------------------------------------------

function TrendingTopicsWidget({ onAskChat, trendingTopics }: { onAskChat: (q: string) => void; trendingTopics?: any[] }) {

  if (trendingTopics === undefined) {
    return (
      <Card>
        <WidgetHeader title="Trending Topics" href="/topics" />
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-14 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (trendingTopics.length === 0) {
    return (
      <Card>
        <WidgetHeader title="Trending Topics" href="/topics" />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No topic data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <WidgetHeader title="Trending Topics" href="/topics" />
      <CardContent>
        <ul className="space-y-2">
          {trendingTopics.map((topic) => {
            const vel = velocityLabel(topic.changeVelocity);
            return (
              <li
                key={topic._id}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5"
              >
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${vel.className}`}
                >
                  {vel.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {topic.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {topic.domain}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {topic.contentCount}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
      <SuggestionLink
        question="What topics need the most attention?"
        onClick={() => onAskChat("What topics need the most attention?")}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Widget: Stale Content
// ---------------------------------------------------------------------------

function StaleContentWidget({ stalest }: { stalest?: any[] }) {

  if (stalest === undefined) {
    return (
      <Card>
        <WidgetHeader title="Stale Content" href="/content" />
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (stalest.length === 0) {
    return (
      <Card>
        <WidgetHeader title="Stale Content" href="/content" />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No graded content yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <WidgetHeader title="Stale Content" href="/content" />
      <CardContent>
        <ul className="space-y-2">
          {stalest.map((item) => (
            <li key={item._id}>
              <Link
                href={`/content/${item.contentId}`}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <GradeBadge grade={item.grade} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline">
                  {item.title ?? "Untitled"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.contentUpdatedAt
                    ? timeAgo(item.contentUpdatedAt)
                    : "unknown"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Chat Panel (docked right sidebar)
// ---------------------------------------------------------------------------

type ChatMessage = {
  _id: Id<"chatMessages">;
  sessionId: Id<"chatSessions">;
  role: "user" | "assistant";
  content: string;
  contentIdsShown?: Id<"contentItems">[];
  createdAt: number;
};

function InsightsChatPanel({
  open,
  onClose,
  initialQuestion,
  onQuestionConsumed,
}: {
  open: boolean;
  onClose: () => void;
  initialQuestion: string | null;
  onQuestionConsumed: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [guestUser, setGuestUser] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = useQuery(api.users.getCurrent);
  const getOrCreateGuest = useMutation(api.users.getOrCreateGuest);
  const activeUser = currentUser || guestUser;

  useEffect(() => {
    if (currentUser === null && !guestUser) {
      getOrCreateGuest().then(setGuestUser).catch(console.error);
    }
  }, [currentUser, guestUser, getOrCreateGuest]);

  const messages = useQuery(
    api.chat.getMessages,
    sessionId ? { sessionId } : "skip"
  ) as ChatMessage[] | undefined;

  const createSession = useMutation(api.chat.createSession);
  const sendMessageAction = useAction(api.chatActions.sendMessage);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Handle initial question from suggestion links
  useEffect(() => {
    if (initialQuestion && open && activeUser && !isSending) {
      onQuestionConsumed();
      handleSendWithText(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, open, activeUser]);

  // Optimistic message — shown instantly while server processes
  const [optimisticMsg, setOptimisticMsg] = useState<string | null>(null);

  const handleSendWithText = useCallback(
    async (text: string) => {
      if (!activeUser || !text.trim() || isSending) return;
      setOptimisticMsg(text.trim());
      setIsSending(true);

      try {
        let sid = sessionId;
        if (!sid) {
          sid = await createSession({ userId: activeUser._id });
          setSessionId(sid);
        }
        await sendMessageAction({
          sessionId: sid,
          message: text.trim(),
          userId: activeUser._id,
        });
      } catch (err) {
        console.error("Failed to send message:", err);
      } finally {
        setOptimisticMsg(null);
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [activeUser, isSending, sessionId, createSession, sendMessageAction]
  );

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue("");
    handleSendWithText(text);
  }, [inputValue, handleSendWithText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleNewConversation = useCallback(async () => {
    if (!activeUser) return;
    try {
      const sid = await createSession({ userId: activeUser._id });
      setSessionId(sid);
      setInputValue("");
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }, [activeUser, createSession]);

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-background xl:w-96">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="flex-1 text-sm font-semibold">New conversation</span>
        <button
          onClick={handleNewConversation}
          className="rounded-md p-1 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          title="New conversation"
        >
          <SquarePen className="size-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600"
          title="Close chat"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 p-4">
          {!sessionId && !isSending && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100">
                <Bot className="size-5 text-emerald-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                Ask about your content library, scores, or what to improve.
              </p>
            </div>
          )}

          {messages?.map((msg) => (
            <div
              key={msg._id}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="size-3.5" />
                ) : (
                  <Bot className="size-3.5" />
                )}
              </div>
              <div className="max-w-[85%] space-y-2">
                <div
                  className={`rounded-2xl px-3 py-2.5 ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-md"
                      : "bg-emerald-50 text-foreground rounded-bl-md"
                  }`}
                >
                  <FormattedContent text={msg.content} />
                </div>

                {/* OG link previews for URLs in message */}
                {msg.role === "assistant" && <LinkPreviews text={msg.content} />}

              </div>
            </div>
          ))}

          {/* Optimistic user message — hide once the real message appears in the DB */}
          {optimisticMsg && !messages?.some((m) => m.role === "user" && m.content === optimisticMsg) && (
            <div className="flex gap-2.5 flex-row-reverse">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <User className="size-3.5" />
              </div>
              <div className="max-w-[85%]">
                <div className="rounded-2xl rounded-br-md bg-emerald-600 text-white px-3 py-2.5">
                  <p className="text-sm leading-relaxed">{optimisticMsg}</p>
                </div>
              </div>
            </div>
          )}

          {isSending && (
            <div className="flex gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Bot className="size-3.5" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-emerald-50 px-3 py-2">
                <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                <span className="text-xs text-emerald-700">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-background px-3 py-1 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-200">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            size="icon"
            className="size-7 shrink-0 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Single composite query for all widget data (replaces 5+ individual queries)
  const widgetData = useQuery(api.dashboard.getWidgetData);

  // Override parent <main> padding so we can do a side-by-side layout
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

  const handleAskChat = useCallback((question: string) => {
    setPendingQuestion(question);
    setChatOpen(true);
  }, []);

  return (
    <div ref={containerRef} className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Main insights content — scrollable */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
            <Button
              size="sm"
              className="gap-2 bg-emerald-600 text-white shadow-md hover:bg-emerald-700 overflow-hidden whitespace-nowrap"
              style={{
                transition: chatOpen
                  ? "opacity 200ms ease-out, transform 200ms ease-out, max-width 250ms ease-out, padding 250ms ease-out"
                  : "opacity 300ms ease-out 150ms, transform 300ms ease-out 150ms, max-width 350ms ease-out 100ms, padding 350ms ease-out 100ms",
                opacity: chatOpen ? 0 : 1,
                transform: chatOpen ? "scale(0.85)" : "scale(1)",
                maxWidth: chatOpen ? "0px" : "140px",
                paddingLeft: chatOpen ? "0px" : undefined,
                paddingRight: chatOpen ? "0px" : undefined,
                pointerEvents: chatOpen ? "none" : undefined,
              }}
              onClick={() => setChatOpen(true)}
              tabIndex={chatOpen ? -1 : undefined}
            >
              <MessageCircle className="size-4 shrink-0" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>
          </div>

          <section>
            <h2 className="mb-4 text-sm font-medium text-emerald-700/60">
              Library totals
            </h2>
            <SummaryStatsRow />
          </section>

          <section>
            <h2 className="mb-4 text-sm font-medium text-emerald-700/60">
              Library overview
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ContentByTypeWidget typeCounts={widgetData?.typeCounts} />
              <GradeBreakdownWidget distribution={widgetData?.distribution} />
              <NeedsAttentionWidget onAskChat={handleAskChat} worstPerformers={widgetData?.worstPerformers} />
              <TopPerformersWidget bestPerformers={widgetData?.bestPerformers} />
              <TrendingTopicsWidget onAskChat={handleAskChat} trendingTopics={widgetData?.trendingTopics} />
              <StaleContentWidget stalest={widgetData?.stalestContent} />
            </div>
          </section>
        </div>
      </div>

      {/* Chat panel — wrapper transitions width so main content slides smoothly */}
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-300 ease-out ${
          chatOpen ? "w-80 xl:w-96" : "w-0"
        }`}
      >
        <InsightsChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          initialQuestion={pendingQuestion}
          onQuestionConsumed={() => setPendingQuestion(null)}
        />
      </div>
    </div>
  );
}
