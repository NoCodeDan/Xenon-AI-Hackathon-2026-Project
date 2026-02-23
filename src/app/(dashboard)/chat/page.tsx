"use client";

import React, { useState, useRef, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { GradeBadge } from "@/components/grade-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  PanelLeftOpen,
  PanelLeftClose,
  Loader2,
  Lightbulb,
  Check,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatSession = {
  _id: Id<"chatSessions">;
  userId: Id<"users">;
  title?: string;
  createdAt: number;
  updatedAt: number;
};

type ChatMessage = {
  _id: Id<"chatMessages">;
  sessionId: Id<"chatSessions">;
  role: "user" | "assistant";
  content: string;
  contentIdsShown?: Id<"contentItems">[];
  requestIdCreated?: Id<"contentRequests">;
  requestIdUpvoted?: Id<"contentRequests">;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: number): string {
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

/** Inline formatting: **bold**, *italic*, `code`, [link](url) */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] && match[3]) {
      parts.push(
        <a
          key={key++}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 hover:decoration-emerald-500"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(<strong key={key++} className="font-semibold">{match[4]}</strong>);
    } else if (match[5]) {
      parts.push(<em key={key++} className="italic">{match[5]}</em>);
    } else if (match[6]) {
      parts.push(
        <code key={key++} className="rounded bg-emerald-100/50 px-1 py-0.5 text-xs font-mono text-emerald-800">
          {match[6]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/** Render a single line, stripping markdown header prefixes into styled elements */
function renderLine(line: string, key: number): React.ReactNode {
  const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const text = headerMatch[2];
    if (level === 1) {
      return <h3 key={key} className="text-sm font-bold mt-3 mb-1 first:mt-0">{renderInline(text)}</h3>;
    }
    if (level === 2) {
      return <h4 key={key} className="text-sm font-bold mt-2.5 mb-0.5 first:mt-0">{renderInline(text)}</h4>;
    }
    return <h5 key={key} className="text-xs font-bold mt-2 mb-0.5 first:mt-0 uppercase tracking-wide text-emerald-700/70">{renderInline(text)}</h5>;
  }

  const bulletMatch = line.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    return (
      <li key={key} className="ml-3.5 list-disc text-sm leading-relaxed marker:text-emerald-400">
        {renderInline(bulletMatch[1])}
      </li>
    );
  }

  const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
  if (numberedMatch) {
    return (
      <li key={key} className="ml-3.5 list-decimal text-sm leading-relaxed marker:text-emerald-500 marker:font-semibold">
        {renderInline(numberedMatch[2])}
      </li>
    );
  }

  return <Fragment key={key}>{renderInline(line)}</Fragment>;
}

/** Full markdown-like content renderer for chat messages */
function FormattedContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${key++}`} className="my-1 space-y-0.5">
          {currentList}
        </Tag>
      );
      currentList = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const isBullet = /^[-*]\s+/.test(trimmed);
    const isNumbered = /^\d+\.\s+/.test(trimmed);

    if (isBullet) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      currentList.push(renderLine(trimmed, key++));
    } else if (isNumbered) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      currentList.push(renderLine(trimmed, key++));
    } else {
      flushList();
      const rendered = renderLine(trimmed, key++);
      if (/^#{1,3}\s+/.test(trimmed)) {
        elements.push(rendered);
      } else {
        elements.push(<p key={`p-${key++}`} className="text-sm leading-relaxed">{rendered}</p>);
      }
    }
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

// ---------------------------------------------------------------------------
// ContentPreviewCard
// ---------------------------------------------------------------------------

function ContentPreviewCard({ contentId }: { contentId: Id<"contentItems"> }) {
  const content = useQuery(api.content.getById, { id: contentId });
  const grade = useQuery(api.grades.getLatest, { contentId });

  if (content === undefined) {
    return (
      <div className="rounded-xl border border-emerald-200/60 bg-white p-3 animate-pulse">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    );
  }

  if (content === null) return null;

  return (
    <div className="rounded-xl border border-emerald-200/60 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
          <Play className="size-4 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium leading-tight">
              {content.title}
            </span>
            {grade && <GradeBadge grade={grade.grade} size="sm" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">
            {content.type}
          </p>
          {content.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
              {content.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <Link
              href={`/content/${contentId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              View Details
              <ExternalLink className="size-3" />
            </Link>
            {content.url && (
              <a
                href={content.url}
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
  );
}

// ---------------------------------------------------------------------------
// RequestPreviewCard
// ---------------------------------------------------------------------------

function RequestPreviewCard({
  requestId,
  action,
}: {
  requestId: Id<"contentRequests">;
  action: "created" | "upvoted";
}) {
  const request = useQuery(api.requests.getById, { requestId });

  if (request === undefined) {
    return (
      <Card className="mt-2 animate-pulse">
        <CardContent className="p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (request === null) {
    return null;
  }

  return (
    <div className="rounded-xl border border-emerald-200/60 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          action === "created" ? "bg-emerald-100" : "bg-emerald-50"
        )}>
          {action === "created" ? (
            <MessageSquare className="size-4 text-emerald-600" />
          ) : (
            <ThumbsUp className="size-4 text-emerald-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium leading-tight">
              {request.title}
            </span>
            <StatusBadge status={request.status} />
          </div>
          {request.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
              {request.description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ThumbsUp className="size-3" />
            <span>
              {request.voteCount} vote{request.voteCount !== 1 ? "s" : ""}
            </span>
            <span className="mx-1">&middot;</span>
            <span>
              {action === "created" ? "Request created" : "Vote added"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateRequestButton — inline button + dialog for creating content requests
// ---------------------------------------------------------------------------

function CreateRequestButton({ userId }: { userId?: Id<"users"> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const createRequest = useMutation(api.requests.create);
  const topics = useQuery(api.topics.getAll);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !userId) return;
    setSubmitting(true);
    try {
      const topicIds = selectedTopicId ? [selectedTopicId as Id<"topics">] : [];
      await createRequest({
        title: title.trim(),
        description: description.trim(),
        topicIds,
        requestedBy: userId,
      });
      setSubmitted(true);
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      console.error("Failed to create request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
        <Check className="size-3.5" />
        Request created!
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 hover:border-emerald-300">
          <Lightbulb className="size-3.5" />
          Request this content
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Content Request</DialogTitle>
          <DialogDescription>
            Submit a request for new content to be created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="e.g. Advanced UX Research Methods"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="What should this content cover?"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Topic</label>
            <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {topics?.map((topic) => (
                  <SelectItem key={topic._id} value={topic._id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Create Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({
  message,
  userId,
}: {
  message: ChatMessage;
  userId?: Id<"users">;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-emerald-100 text-emerald-700"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "max-w-[85%] space-y-2 md:max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-emerald-600 text-white rounded-br-md"
              : "bg-emerald-50 text-foreground rounded-bl-md"
          )}
        >
          <FormattedContent text={message.content} />
        </div>

        {/* Embedded content cards (max 5, scrollable) */}
        {!isUser &&
          message.contentIdsShown &&
          message.contentIdsShown.length > 0 && (
            <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-lg pl-1 pr-1">
              {message.contentIdsShown.slice(0, 5).map((contentId) => (
                <ContentPreviewCard key={contentId} contentId={contentId} />
              ))}
              {message.contentIdsShown.length > 5 && (
                <p className="py-1 text-center text-xs text-muted-foreground">
                  +{message.contentIdsShown.length - 5} more results
                </p>
              )}
            </div>
          )}

        {/* Request created card */}
        {!isUser && message.requestIdCreated && (
          <div className="pl-1">
            <RequestPreviewCard
              requestId={message.requestIdCreated}
              action="created"
            />
          </div>
        )}

        {/* Request upvoted card */}
        {!isUser && message.requestIdUpvoted && (
          <div className="pl-1">
            <RequestPreviewCard
              requestId={message.requestIdUpvoted}
              action="upvoted"
            />
          </div>
        )}

        {/* Create request button — show on assistant messages without an existing request card */}
        {!isUser &&
          !message.requestIdCreated &&
          !message.requestIdUpvoted &&
          message.content.length > 0 && (
            <div className="pl-1">
              <CreateRequestButton userId={userId} />
            </div>
          )}

        {/* Timestamp */}
        <p
          className={cn(
            "px-1 text-[10px] text-muted-foreground/60",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionListSkeleton
// ---------------------------------------------------------------------------

function SessionListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessagesSkeleton
// ---------------------------------------------------------------------------

function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Simulated assistant message */}
      <div className="flex gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-16 w-64 rounded-2xl" />
      </div>
      {/* Simulated user message */}
      <div className="flex flex-row-reverse gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-10 w-48 rounded-2xl" />
      </div>
      {/* Simulated assistant message */}
      <div className="flex gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-24 w-72 rounded-2xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
        <Bot className="size-8 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Treehouse Content Assistant</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Ask me about Treehouse content, search the library, or request new
          content. I can help you find courses, check freshness grades, and more.
        </p>
      </div>
      <Button onClick={onNewChat} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
        <Plus className="size-4" />
        Start a New Chat
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatPage
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] =
    useState<Id<"chatSessions"> | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<Id<"chatSessions"> | null>(null);
  const [guestUser, setGuestUser] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Disable parent <main> padding & scroll so chat fills the area ---
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

  // --- Convex hooks ---
  const currentUser = useQuery(api.users.getCurrent);
  const getOrCreateGuest = useMutation(api.users.getOrCreateGuest);

  // Use auth user or guest user
  const activeUser = currentUser || guestUser;

  // Initialize guest user if no auth
  useEffect(() => {
    if (currentUser === null && !guestUser) {
      getOrCreateGuest().then(setGuestUser).catch(console.error);
    }
  }, [currentUser, guestUser, getOrCreateGuest]);

  const sessions = useQuery(
    api.chat.getSessions,
    activeUser ? { userId: activeUser._id } : "skip"
  ) as ChatSession[] | undefined;
  const messages = useQuery(
    api.chat.getMessages,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  ) as ChatMessage[] | undefined;

  const createSession = useMutation(api.chat.createSession);
  const deleteSessionMut = useMutation(api.chat.deleteSession);
  const sendMessageAction = useAction(api.chatActions.sendMessage);

  // --- Auto-scroll on new messages ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Focus input when session changes ---
  useEffect(() => {
    if (activeSessionId) {
      inputRef.current?.focus();
    }
  }, [activeSessionId]);

  // --- Handlers ---

  const handleNewChat = useCallback(async () => {
    if (!activeUser) return;
    try {
      const sessionId = await createSession({ userId: activeUser._id });
      setActiveSessionId(sessionId);
      setInputValue("");
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }, [activeUser, createSession]);

  const handleDeleteSession = useCallback(
    async (sessionId: Id<"chatSessions">) => {
      try {
        await deleteSessionMut({ sessionId });
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
        }
        setDeleteConfirmId(null);
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [deleteSessionMut, activeSessionId]
  );

  const handleSendMessage = useCallback(async () => {
    if (!activeSessionId || !inputValue.trim() || isSending) return;

    const messageText = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      await sendMessageAction({
        sessionId: activeSessionId,
        message: messageText,
        userId: activeUser?._id,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [activeSessionId, inputValue, isSending, sendMessageAction, activeUser]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // --- Render ---

  return (
    <div ref={containerRef} className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* ================================================================= */}
      {/* Session Sidebar                                                    */}
      {/* ================================================================= */}
      <aside
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-200",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden border-r-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-3">
          <h2 className="text-sm font-semibold">Chat History</h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose className="size-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        {/* New Chat button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            size="sm"
            disabled={!activeUser}
          >
            <Plus className="size-4" />
            New Chat
          </Button>
        </div>

        {/* Session list */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          {sessions === undefined ? (
            <SessionListSkeleton />
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No chat sessions yet
            </div>
          ) : (
            <div className="space-y-1 px-3 pb-3">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className={cn(
                    "group relative flex cursor-pointer flex-col rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent",
                    activeSessionId === session._id
                      ? "border-emerald-300/50 bg-emerald-50"
                      : "border-transparent"
                  )}
                  onClick={() => setActiveSessionId(session._id)}
                >
                  <span className="truncate text-sm font-medium">
                    {session.title || "New Chat"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(session.updatedAt)}
                  </span>

                  {/* Delete button */}
                  {deleteConfirmId === session._id ? (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="size-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session._id);
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                      >
                        <span className="text-xs">&times;</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(session._id);
                      }}
                    >
                      <Trash2 className="size-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* ================================================================= */}
      {/* Main Chat Area                                                     */}
      {/* ================================================================= */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with sidebar toggle */}
        {!sidebarOpen && (
          <div className="flex items-center border-b px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
              <span className="sr-only">Open sidebar</span>
            </Button>
            {activeSessionId && sessions && (
              <span className="ml-2 truncate text-sm font-medium text-muted-foreground">
                {sessions.find((s) => s._id === activeSessionId)?.title ||
                  "New Chat"}
              </span>
            )}
          </div>
        )}

        {/* Messages or Empty State */}
        {!activeSessionId ? (
          <EmptyState onNewChat={handleNewChat} />
        ) : (
          <>
            {/* Message list */}
            <ScrollArea className="flex-1 min-h-0 overflow-hidden">
              <div className="mx-auto max-w-3xl space-y-4 p-4">
                {messages === undefined ? (
                  <MessagesSkeleton />
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Bot className="size-10 text-emerald-300" />
                    <p className="text-sm text-muted-foreground">
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message._id}
                      message={message}
                      userId={activeUser?._id}
                    />
                  ))
                )}

                {/* Typing indicator when sending */}
                {isSending && (
                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Bot className="size-4" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-emerald-50 px-4 py-2.5">
                      <Loader2 className="size-4 animate-spin text-emerald-600" />
                      <span className="text-sm text-emerald-700">
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <Separator />
            <div className="shrink-0 bg-background p-4">
              <div className="mx-auto flex max-w-3xl items-center gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Ask about Treehouse content..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isSending}
                  size="icon"
                  className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
